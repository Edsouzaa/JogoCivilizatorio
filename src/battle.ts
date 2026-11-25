// Batalhas terrestres (estilo HOI4/EU5): frente limitada pelo terreno, reservas, duas fases (fogo e choque),
// 1d10 por lado e por fase com modificadores visíveis, dano de organização separado de baixas, moral separada,
// retirada (ou destruição, se cercado) e histórico de rolagens. Determinístico: o dado vem da semente da partida.
// Configuração toda em BATTLE (ajuste aqui). Ver docs/batalhas.md.
import { T, mulberry32, type World } from "./world.ts";
import type { Division, Economy } from "./economy.ts";
import { statsOf, unitOf } from "./units.ts";
import { techSum } from "./tech.ts";
import { lawFx } from "./politics.ts";
import { attrMod, styleOf, type Character, type Style } from "./characters.ts";
import { weatherAt } from "./world.ts";

export const BATTLE = {
  rounds: 2,             // rodadas por semana (fixo: não depende do computador)
  maxWeeks: 12,          // batalha que passa disto termina: o atacante desiste
  frontage: { [T.PLAINS]: 100, [T.GRASS]: 100, [T.STEPPE]: 100, [T.SAVANNA]: 95, [T.DESERT]: 90, [T.FOREST]: 80, [T.TAIGA]: 80, [T.HILLS]: 75, [T.JUNGLE]: 60, [T.TUNDRA]: 85, [T.MOUNTAIN]: 50 } as Record<number, number>,
  urbanFrontage: 90,     // centro de cidade
  extraDirection: 0.5,   // cada direção de ataque a mais: +50% de frente (até 2×)
  width: { Infantaria: 10, Montaria: 12, Artilharia: 15, Cerco: 15, Blindados: 20, Regimento: 10 } as Record<string, number>, // por divisão cheia
  fireShare: [0.2, 0.3, 0.35, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85], // peso da fase de fogo por era (o resto é choque)
  fireAffinity: { Infantaria: 0.5, Montaria: 0.2, Artilharia: 1, Cerco: 0.8, Blindados: 0.5 } as Record<string, number>, // quanto do ataque vale no fogo
  terrainDefense: { [T.MOUNTAIN]: 3, [T.HILLS]: 2, [T.FOREST]: 1, [T.TAIGA]: 1, [T.JUNGLE]: 2 } as Record<number, number>, // pontos no dado do defensor
  mountainAttack: -1,    // atacar montanha
  river: -2,             // atravessar rio atacando
  urbanDefense: 1,       // defender centro de cidade
  casualty: 0.025,       // baixas por fase = poder do lado × isto × (resultado próprio ÷ soma dos resultados)
  orgDamage: 0.08,       // organização perdida por fase × (poder inimigo ÷ próprio) × (resultado inimigo ÷ próprio)
  maxOrgDamage: 0.25,    // teto por fase: batalha leva semanas, não um instante
  maxLossShare: 0.12,    // no máximo esta fração da frente morre por fase
  broken: 0.1,           // organização abaixo disto: sai da frente (reserva entra; sem reserva, o lado recua)
  moraleBroken: 0.2,     // moral abaixo disto: a unidade foge
  moraleLoss: 2,         // moral perdida = fração de baixas da unidade × isto
  retreatMorale: 0.15,   // recuar custa moral
  pursuit: 0.05,         // perseguição: recuar sob um inimigo mais rápido custa esta fração dos soldados
  entrenchPerWeek: 0.25, entrenchMax: 2, // entrincheiramento (pontos no dado) parado; tecnologias somam ao teto
  logKeep: 40,           // rodadas guardadas no histórico
  // eventos de combate: acontecem só quando a situação permite (a chance é sorteada com o dado da batalha)
  ambush: { chance: 0.35, mod: -2 },        // 1ª rodada, defensor em floresta/selva/colinas, atacante sem montaria para reconhecer
  charge: { chance: 0.4, mod: 2, share: 0.3, prepared: -1 }, // choque em campo aberto com montaria; contra posição entrincheirada dá errado
  barrage: { chance: 0.5, mod: 2, share: 0.2, entrench: 0.5 }, // fogo na 1ª rodada com artilharia/cerco e munição: tira entrincheiramento
  collapse: { chance: 0.5, mod: -2, org: 0.3, morale: 0.5, moraleHit: 0.1 }, // linha desorganizada e sem moral desaba
  generalLoss: 0.03,     // chance por semana de o lado que perdeu mais perder o general (morto ou capturado)
  styleLoss: { Agressivo: 1.1, Cauteloso: 0.8 } as Partial<Record<Style, number>>, // baixas próprias
  inspireMorale: 0.7,    // general inspirador: moral cai mais devagar
};

export type SideRoll = { roll: number; mods: [string, number][]; total: number };
export type RoundLog = { week: number; round: number; phase: "fogo" | "choque"; att: SideRoll; def: SideRoll; text: string };
export type Battle = {
  id: number; hex: number; attacker: number; defender: number; start: number; last: number;
  dirs: number; frontage: number; state: "combate" | "vitória do atacante" | "vitória do defensor" | "encerrada";
  startAtt: number; startDef: number; deadAtt: number; deadDef: number; log: RoundLog[];
};

/** Largura que a divisão ocupa na frente (pela categoria e pelo tamanho em divisões cheias). */
export const widthOf = (d: Division, divisionSize: number) => (BATTLE.width[statsOf(d).cat] ?? 10) * Math.max(0.2, d.strength / divisionSize);
/** Frente do hex (centro de cidade conta como urbano), aumentada por direções extras de ataque. */
export function frontageOf(w: World, e: Economy, hex: number, dirs: number) {
  const center = e.market[hex] && e.cities[e.market[hex] - 1]?.hex === hex;
  const base = center ? BATTLE.urbanFrontage : BATTLE.frontage[w.terrain[hex]] ?? 90;
  return base * Math.min(2, 1 + BATTLE.extraDirection * Math.max(0, dirs - 1));
}
/** Divide em frente e reserva: os mais organizados entram primeiro, até encher a largura. */
export function deploy(ds: Division[], width: number, divisionSize: number) {
  const ok = ds.filter((d) => d.org >= BATTLE.broken && (d.morale ?? 1) >= BATTLE.moraleBroken).sort((a, b) => b.org - a.org);
  const front: Division[] = [], reserve: Division[] = [];
  let used = 0;
  for (const d of ok) { const wd = widthOf(d, divisionSize); if (used + wd <= width || !front.length) { front.push(d); used += wd; } else reserve.push(d); }
  return { front, reserve };
}

/** Poder de uma fase: soldados × organização × armas × tecnologia × leis × ataque/defesa da unidade × parte da fase. */
function phasePower(e: Economy, ds: Division[], role: "atk" | "def", phase: "fogo" | "choque") {
  const era = Math.max(0, ...ds.map((d) => e.countries[d.country - 1].research.era));
  const fire = BATTLE.fireShare[era];
  return ds.reduce((s, d) => {
    const c = e.countries[d.country - 1], u = statsOf(d);
    const aff = d.mix ? Object.entries(d.mix).reduce((a, [n, f]) => a + (BATTLE.fireAffinity[unitOf(n).cat] ?? 0.5) * f, 0) : BATTLE.fireAffinity[u.cat] ?? 0.5;
    let share = phase === "fogo" ? fire * aff / 0.5 : (1 - fire) * (1 - aff) / 0.5;
    if (phase === "fogo" && (d.supply?.ammo ?? 1) < 0.5) share *= 0.5; // sem munição: fogo fraco (logistics.ts)
    if ((d.supply?.food ?? 1) < 0.25) share *= 0.7;                      // fome
    return s + d.strength * d.org * d.equip * (1 + techSum(c.research, "army") + lawFx(c.politics, "army", c.control)) * u[role] * share;
  }, 0);
}

/** Modificadores do dado de um lado (todos listados no histórico). */
const generalOf = (e: Economy, ds: Division[]) => ds.map((d) => (d.general ? e.characters?.find((x) => x.id === d.general && !x.dead) : undefined)).find(Boolean) as Character | undefined;
/** Fração dos soldados das categorias dadas (para montaria, artilharia...). */
const shareOf = (ds: Division[], cats: string[]) => {
  let all = 0, hit = 0;
  for (const d of ds) for (const [n, f] of Object.entries(d.mix ?? { [unitOf(d.unit).name]: 1 })) { all += d.strength * f; if (cats.includes(unitOf(n).cat)) hit += d.strength * f; }
  return all ? hit / all : 0;
};
function modsOf(w: World, e: Economy, b: Battle, ds: Division[], side: "att" | "def", enemy: Division[], riverAtt: boolean, phase: "fogo" | "choque"): [string, number][] {
  const mods: [string, number][] = [];
  const gen = generalOf(e, ds), style = gen ? styleOf(gen) : undefined;
  if (gen) mods.push([`General ${gen.name}`, Math.round(2 * (attrMod(gen.mil) + 0.5) * 10) / 10]); // 0 a +2
  if (style === "Defensivo" && side === "def") mods.push(["Estilo defensivo", 1]);
  if (style === "Agressivo" && side === "att") mods.push(["Estilo agressivo", 1]);
  if (style === "Cauteloso" && side === "att") mods.push(["Estilo cauteloso", -0.5]);
  // tempo da semana (world.ts weatherAt): chuva atrapalha o tiro, neblina e neve o ataque, lama a montaria e os blindados
  const wx = weatherAt(w, b.hex, e.week);
  if (wx === "chuva" && phase === "fogo") mods.push(["Chuva", -1]);
  if ((wx === "neblina" || wx === "neve") && side === "att") mods.push([wx === "neve" ? "Neve" : "Neblina", -1]);
  if (wx === "lama" && phase === "choque" && shareOf(ds, ["Montaria", "Blindados"]) > 0.3) mods.push(["Lama", -1]);
  if (wx === "calor" && side === "att") mods.push(["Calor", -1]);
  const tech = (x: Division[]) => Math.max(0, ...x.map((d) => techSum(e.countries[d.country - 1].research, "army")));
  const dt = Math.round((tech(ds) - tech(enemy)) * 2);
  if (dt) mods.push(["Tecnologia", Math.max(-3, Math.min(3, dt))]);
  const terr = w.terrain[b.hex];
  if (side === "def") {
    if (BATTLE.terrainDefense[terr]) mods.push(["Terreno", BATTLE.terrainDefense[terr]]);
    if (e.market[b.hex] && e.cities[e.market[b.hex] - 1]?.hex === b.hex) mods.push(["Cidade", BATTLE.urbanDefense]);
    const ent = Math.max(0, ...ds.map((d) => d.entrench ?? 0));
    if (ent >= 0.5) mods.push(["Entrincheiramento", Math.round(ent * 10) / 10]);
  } else {
    if (terr === T.MOUNTAIN) mods.push(["Atacar montanha", BATTLE.mountainAttack]);
    if (riverAtt) mods.push(["Travessia de rio", BATTLE.river]);
    if (b.dirs > 1) mods.push(["Flanqueamento", (b.dirs - 1) * (style === "Flanqueador" ? 2 : 1)]);
  }
  const sup = Math.min(...ds.map((d) => d.supply?.level ?? 1));
  if (sup < 0.25) mods.push(["Quase sem suprimentos", -2]); else if (sup < 0.5) mods.push(["Suprimento crítico", -1]);
  const fat = Math.max(...ds.map((d) => d.fatigue ?? 0));
  if (fat > 0.6) mods.push(["Cansaço da marcha", -1]);
  const org = ds.reduce((s, d) => s + d.org, 0) / ds.length;
  if (org < 0.3) mods.push(["Desorganizado", -1]);
  const mor = ds.reduce((s, d) => s + (d.morale ?? 1), 0) / ds.length;
  if (mor < 0.4) mods.push(["Moral baixa", -1]);
  return mods;
}

/** Eventos de combate da fase: só acontecem se a situação permitir; cada um vira um modificador no histórico. */
function events(w: World, b: Battle, phase: "fogo" | "choque", round: number, att: Division[], def: Division[], rand: () => number, ma: [string, number][], md: [string, number][]) {
  const terr = w.terrain[b.hex], open = [T.PLAINS, T.GRASS, T.STEPPE, T.SAVANNA].includes(terr), cover = [T.FOREST, T.JUNGLE, T.HILLS, T.TAIGA].includes(terr);
  const out: string[] = [];
  if (round === 0 && phase === "fogo" && b.log.length === 0 && cover && shareOf(att, ["Montaria"]) === 0 && rand() < BATTLE.ambush.chance) { ma.push(["Emboscada", BATTLE.ambush.mod]); out.push("Emboscada!"); }
  const sides: [Division[], [string, number][], Division[], string][] = [[att, ma, def, "atacante"], [def, md, att, "defensor"]];
  for (const [ds, mods, enemy, who] of sides) {
    if (phase === "choque" && open && shareOf(ds, ["Montaria"]) >= BATTLE.charge.share && rand() < BATTLE.charge.chance) {
      const prepared = Math.max(0, ...enemy.map((d) => d.entrench ?? 0)) >= 1;
      mods.push(["Carga de montaria", prepared ? BATTLE.charge.prepared : BATTLE.charge.mod]); out.push(prepared ? `Carga do ${who} quebra contra posição preparada` : `Carga de montaria do ${who}`);
    }
    if (phase === "fogo" && round === 0 && shareOf(ds, ["Artilharia", "Cerco"]) >= BATTLE.barrage.share && Math.min(...ds.map((d) => d.supply?.ammo ?? 1)) >= 0.5 && rand() < BATTLE.barrage.chance) {
      mods.push(["Bombardeio preparatório", BATTLE.barrage.mod]); for (const d of enemy) d.entrench = Math.max(0, (d.entrench ?? 0) - BATTLE.barrage.entrench); out.push(`Bombardeio preparatório do ${who}`);
    }
    const org = ds.reduce((s, d) => s + d.org, 0) / ds.length, mor = ds.reduce((s, d) => s + (d.morale ?? 1), 0) / ds.length;
    if (org < BATTLE.collapse.org && mor < BATTLE.collapse.morale && rand() < BATTLE.collapse.chance) {
      mods.push(["Colapso da linha", BATTLE.collapse.mod]); for (const d of ds) d.morale = Math.max(0, (d.morale ?? 1) - BATTLE.collapse.moraleHit); out.push(`A linha do ${who} desaba`);
    }
    if (phase === "fogo" && Math.min(...ds.map((d) => d.supply?.ammo ?? 1)) < 0.5) out.push(`Falta munição ao ${who}`);
  }
  return out;
}

/**
 * Uma semana de batalhas. `battles`: hex atacado → divisões atacando. `enemiesIn` acha os defensores; `retreatTo` acha o
 * hex de recuo (−1 = cercado); `losses` tira baixas (estatísticas de guerra e população). Devolve as divisões que lutaram.
 */
export function resolveBattles(w: World, e: Economy, battles: Map<number, Division[]>, divisionSize: number,
  enemiesIn: (hex: number, country: number) => Division[], retreatTo: (d: Division, from: number) => number,
  losses: (ds: Division[], n: number) => void, onEnd: (b: Battle, winner: "att" | "def", att: Division[], def: Division[]) => void, airMod: (hex: number, a: number, d: number) => number) {
  const fighting = new Set<Division>();
  e.battles ??= [];
  for (const [hex, attackersAll] of battles) {
    const defendersAll = attackersAll.length ? enemiesIn(hex, attackersAll[0].country) : [];
    if (!defendersAll.length) continue;
    const A = attackersAll[0].country, D = defendersAll[0].country;
    let b = e.battles.find((x) => x.hex === hex && x.state === "combate" && x.attacker === A);
    const dirs = new Set(attackersAll.map((d) => d.hex)).size;
    if (!b) {
      b = { id: (e.nextBattle = (e.nextBattle ?? 0) + 1), hex, attacker: A, defender: D, start: e.week, last: e.week, dirs, frontage: 0, state: "combate",
        startAtt: sum(attackersAll), startDef: sum(defendersAll), deadAtt: 0, deadDef: 0, log: [] };
      e.battles.push(b);
    }
    b.last = e.week; b.dirs = dirs; b.frontage = frontageOf(w, e, hex, dirs);
    const rand = mulberry32((w.seed * 7919 + e.week * 131 + hex * 17) >>> 0); // mesmo resultado em todos os clientes (semente, semana, hex)
    const riverAtt = attackersAll.some((d) => crossesRiverFn(w, d.hex, hex));
    for (let r = 0; r < BATTLE.rounds; r++) {
      const att = deploy(attackersAll, b.frontage, divisionSize), def = deploy(defendersAll, b.frontage, divisionSize);
      if (!att.front.length || !def.front.length) break;
      for (const phase of ["fogo", "choque"] as const) {
        const air = airMod(hex, A, D); // superioridade aérea: −1..+1 para o atacante
        const ma = modsOf(w, e, b, att.front, "att", def.front, riverAtt, phase), md = modsOf(w, e, b, def.front, "def", att.front, riverAtt, phase);
        if (air) { ma.push(["Céu", air]); md.push(["Céu", -air]); }
        const happened = events(w, b, phase, r, att.front, def.front, rand, ma, md);
        const ra = 1 + Math.floor(rand() * 10), rd = 1 + Math.floor(rand() * 10);
        const ta = Math.max(1, ra + ma.reduce((s, [, v]) => s + v, 0)), td = Math.max(1, rd + md.reduce((s, [, v]) => s + v, 0));
        const pa = phasePower(e, att.front, "atk", phase), pd = phasePower(e, def.front, "def", phase);
        // baixas: cada lado mata pelo próprio poder e pela parte que teve no dado; com teto por fase
        const sa = generalOf(e, att.front), sd = generalOf(e, def.front), styleA = sa ? styleOf(sa) : undefined, styleD = sd ? styleOf(sd) : undefined;
        const killD = Math.min(sum(def.front) * BATTLE.maxLossShare, pa * BATTLE.casualty * (2 * ta) / (ta + td) * (styleD ? BATTLE.styleLoss[styleD] ?? 1 : 1));
        const killA = Math.min(sum(att.front) * BATTLE.maxLossShare, pd * BATTLE.casualty * (2 * td) / (ta + td) * (styleA ? BATTLE.styleLoss[styleA] ?? 1 : 1));
        const before = new Map([...att.front, ...def.front].map((d) => [d, d.strength]));
        losses(def.front, killD); losses(att.front, killA);
        b.deadAtt += killA; b.deadDef += killD;
        // organização: perde mais quem teve menos poder e menos dado
        const orgD = Math.min(BATTLE.maxOrgDamage, BATTLE.orgDamage * (pa / (pd || 1)) * (ta / td)), orgA = Math.min(BATTLE.maxOrgDamage, BATTLE.orgDamage * (pd / (pa || 1)) * (td / ta));
        for (const d of def.front) d.org = Math.max(0, d.org - orgD);
        for (const d of att.front) d.org = Math.max(0, d.org - orgA);
        for (const [d, s0] of before) { const insp = (att.front.includes(d) ? styleA : styleD) === "Inspirador" ? BATTLE.inspireMorale : 1; d.morale = Math.max(0, (d.morale ?? 1) - BATTLE.moraleLoss * insp * (s0 - d.strength) / Math.max(1, s0)); }
        const text = ta > td ? (ta >= td + 3 ? "Ataque rompe a linha" : "Vantagem do atacante") : td > ta ? (td >= ta + 3 ? "Ataque repelido com perdas" : "Vantagem do defensor") : "Equilíbrio";
        b.log.push({ week: e.week, round: r + 1, phase, att: { roll: ra, mods: ma, total: ta }, def: { roll: rd, mods: md, total: td }, text: `${happened.length ? happened.join(". ") + ". " : ""}${text}: atacante perde ${Math.round(killA)} soldados e ${Math.round(orgA * 100)}% de organização; defensor ${Math.round(killD)} e ${Math.round(orgD * 100)}%` });
        if (b.log.length > BATTLE.logKeep) b.log.shift();
      }
    }
    for (const d of [...attackersAll, ...defendersAll]) { fighting.add(d); d.entrench = attackersAll.includes(d) ? 0 : d.entrench; }
    { // perda de comandante: quem mais sofreu na semana pode perder o general (morto ou capturado)
      const lastWeek = b.log.filter((x) => x.week === e.week);
      const lostAtt = lastWeek.filter((x) => x.def.total > x.att.total).length, lostDef = lastWeek.filter((x) => x.att.total > x.def.total).length;
      const loser = lostAtt > lostDef ? attackersAll : lostDef > lostAtt ? defendersAll : null;
      const gd = loser?.find((d) => d.general);
      if (loser && gd && rand() < BATTLE.generalLoss) {
        const ch = e.characters?.find((x) => x.id === gd.general);
        if (ch) { ch.dies = e.week; ch.life.push(`caiu em batalha (semana ${e.week})`); }
        gd.general = undefined;
        for (const d of loser) { d.org = Math.max(0, d.org - 0.1); d.morale = Math.max(0, (d.morale ?? 1) - 0.1); }
        b.log.push({ week: e.week, round: 0, phase: "choque", att: { roll: 0, mods: [], total: 0 }, def: { roll: 0, mods: [], total: 0 }, text: `O ${loser === attackersAll ? "atacante" : "defensor"} perdeu o general${ch ? ` ${ch.name}` : ""}: −10% de organização e moral` });
      }
    }
    // fim: um lado sem ninguém em condição de lutar
    const defUp = defendersAll.some((d) => d.strength >= 1 && d.org >= BATTLE.broken && (d.morale ?? 1) >= BATTLE.moraleBroken);
    const attUp = attackersAll.some((d) => d.strength >= 1 && d.org >= BATTLE.broken && (d.morale ?? 1) >= BATTLE.moraleBroken);
    const tooLong = e.week - b.start >= BATTLE.maxWeeks;
    if (!defUp) {
      b.state = "vitória do atacante";
      const fast = Math.max(...attackersAll.map((d) => statsOf(d).speed)); // perseguição: inimigo mais rápido pega quem recua
      for (const d of defendersAll) {
        const to = retreatTo(d, hex);
        if (to < 0) { b.deadDef += d.strength; d.strength = 0; continue; } // cercado: destruído
        if (fast > statsOf(d).speed) { const p = d.strength * BATTLE.pursuit; losses([d], p); b.deadDef += p; }
        d.hex = to; d.target = null; d.morale = Math.max(0, (d.morale ?? 1) - BATTLE.retreatMorale); d.entrench = 0;
      }
      onEnd(b, "att", attackersAll, defendersAll);
    } else if (!attUp || tooLong) {
      b.state = "vitória do defensor";
      for (const d of attackersAll) { d.target = null; d.morale = Math.max(0, (d.morale ?? 1) - BATTLE.retreatMorale); }
      onEnd(b, "def", attackersAll, defendersAll);
    }
  }
  // batalhas que ninguém mais ataca: encerradas; guarda só as recentes
  for (const b of e.battles) if (b.state === "combate" && b.last < e.week) b.state = "encerrada";
  e.battles = e.battles.filter((b) => e.week - b.last < 26);
  return fighting;
}
const sum = (ds: Division[]) => ds.reduce((s, d) => s + d.strength, 0);
let crossesRiverFn: (w: World, a: number, b: number) => boolean = () => false;
export const setRiverCheck = (f: typeof crossesRiverFn) => { crossesRiverFn = f; };

/** Uma semana parada: entrincheira (teto maior com fortificações). Andar zera. */
export function entrench(e: Economy, d: Division, moved: boolean) {
  if (moved || d.target !== null) { d.entrench = 0; return; }
  const k = e.countries[d.country - 1].research.known;
  const cap = BATTLE.entrenchMax + (k.has("Castelos") ? 0.5 : 0) + (k.has("Fortificações em estrela") ? 0.5 : 0) + (k.has("Concreto armado") ? 1 : 0);
  d.entrench = Math.min(cap, (d.entrench ?? 0) + BATTLE.entrenchPerWeek);
}
