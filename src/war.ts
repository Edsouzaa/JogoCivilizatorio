import { resolveNaval, convoyFactor, bombardMods } from "./seawar.ts";
import { stepAir, airSupport, airRecon, AIRW } from "./airwar.ts";
import { resolveBattles, entrench, setRiverCheck, BATTLE_HOOKS } from "./battle.ts";
import { chronicle } from "./chronicle.ts";
import { incFx } from "./admin.ts";
import { stepSupply, attrition, depotHexes } from "./logistics.ts";
import { lawFx } from "./politics.ts";
import { econ, spend } from "./eramods.ts";
// Guerra terrestre (estilo HOI4 simplificado, sem customizar divisões).
// Divisões andam hex a hex, lutam contra o hex vizinho que querem entrar, ocupam território inimigo,
// e a paz entrega ao vencedor o que ele ocupou (menos a capital do perdedor).
import { refresh, dropHomeless, GOODS, RULES, INFAMY, type Economy, type Division, type WarStats } from "./economy.ts";
import { DIPLO } from "./diplomacy.ts";
import { warAllies } from "./subjects.ts";
import { lostCity, hasClaimOn, CLAIM } from "./claims.ts";
import { anchors } from "./expansion.ts";
import { rulerOf, attrMod, CHAR, noteRuler, note, recordBattle } from "./characters.ts";
import { UNITS, unitOf, statsOf, SHIPS, PLANES, craftOf } from "./units.ts";
import { techSum } from "./tech.ts";
import { STATES } from "./states.ts";
import { forNeighbors, hexDistance } from "./hex.ts";
import { T, TERRAINS, across, riverAt, snowAt, weatherAt, deepOcean, type World } from "./world.ts";

export const WAR = {
  divisionSize: 25,    // soldados por divisão (saem do manpower); bando do tamanho das tribos do começo
  recruitCost: 60,     // dinheiro para recrutar
  upkeep: 0.3,         // dinheiro por semana por divisão
  reinforce: 5,        // soldados repostos por semana em território próprio
  orgRecovery: 0.1,    // organização recuperada por semana fora de combate
  casualties: 0.08,    // baixas por semana = poder inimigo × isto
  orgLoss: 0.15,       // perda de organização por semana em combate (× poder inimigo / próprio)
  brokenOrg: 0.1,      // abaixo disto a divisão recua
  peaceThreshold: 0.05, // vantagem mínima de pontuação para tomar território na paz
  supportWeeks: 260,   // apoio à guerra cai a zero em 5 anos...
  supportDeadMult: 20, // ...e mais rápido com mortos: 5% da população morta = apoio zero
  supportLegitimacy: 0.003, // legitimidade perdida por semana × (1 − apoio)
  civilLoss: 0.001,    // fração do povo de hex ocupado que morre/foge por semana
  supplyBase: 6, supplyPerEra: 3, // alcance do abastecimento (hexes) = base + por era
  noSupplyOrg: 0.05, noSupplyLoss: 0.02, // sem suprimento: organização e soldados perdidos por semana
  unpaidOrg: 0.05,       // sem soldo pago: organização perdida por semana (eramods.ts spend)
  siegeBase: 4,        // semanas de cerco para tomar o centro de uma cidade...
  siegePerSize: 2,     // ...mais isto por tamanho da cidade (dividido pelo nº de divisões cercando, até metade)
};

/** Semanas de cerco que faltam para `n` divisões tomarem a cidade. */
export const siegeWeeks = (size: number, n: number) => (WAR.siegeBase + WAR.siegePerSize * size) / Math.min(2, Math.max(1, n));

/** Marinha: frotas andam só no mar, lutam por zona marítima, bloqueiam cidades e transportam exércitos. */
export const NAVY = {
  sailors: 20,      // marinheiros por frota (saem do manpower)
  cost: 120,        // dinheiro para construir
  upkeep: 0.5,      // dinheiro por semana por frota
  speed: 3,         // hexes de mar por semana (exército transportado anda junto)
  tech: "Galés",    // tecnologia que libera frotas
  deepTech: "Navegação", // sem ela, nada entra em oceano profundo (world.ts deepOcean)
};

/**
 * Força aérea. Regiões aéreas = região de cada cidade (a mesma dos mercados; vira "estado" quando houver estados).
 * Um esquadrão fica numa cidade-base e cobre a região de missão (até AIR.range da base; sem missão, a da base).
 */
export const AIR = {
  pilots: 10,       // pilotos por esquadrão (saem do manpower)
  cost: 300,        // dinheiro para formar
  upkeep: 1,        // dinheiro por semana
  range: 10,        // hexes da base até a região de missão
  bonus: 0.3,       // superioridade total: +30% de força nas batalhas da região; nenhuma: −30%
  tech: "Aviação",
};
/** Região aérea do hex: índice da cidade cujo mercado o atende (−1 = fora de qualquer região). */
export const airRegion = (e: Economy, i: number) => {
  if (!e.market[i]) return -1;
  const s = e.cities[e.market[i] - 1].state; // cidade em estado: a região aérea é o estado inteiro
  return s ? STATES.regionBase + s : e.market[i] - 1;
};
const missionOf = (e: Economy, d: Division) => airRegion(e, d.target ?? d.hex);

export function buildAir(w: World, e: Economy, country: number, hex: number, plane = "Caças"): string | null {
  if (w.owner[hex] !== country || !e.urban[hex] || e.occupier[hex]) return "Forme o esquadrão numa cidade sua";
  const c = e.countries[country - 1], p = PLANES.find((x) => x.name === plane);
  if (!p) return "Tipo de avião desconhecido";
  if (!c.research.known.has(p.tech)) return `Precisa pesquisar ${p.tech}`;
  const cost = Math.round(AIR.cost * p.cost);
  if (c.manpower < AIR.pilots) return `Manpower insuficiente (precisa ${AIR.pilots})`;
  if (c.treasury < cost) return `Precisa de ${cost} no tesouro`;
  c.manpower -= AIR.pilots; c.treasury -= cost;
  e.divisions.push({ id: e.nextDivision++, kind: "air", country, hex, strength: AIR.pilots, org: 1, target: null, progress: 0, equip: 1, unit: p.name });
  return null;
}

const airPower = (e: Economy, ds: Division[]) => ds.reduce((s, d) => s + d.strength * d.org * (d.ready ?? 1) * (1 + techSum(e.countries[d.country - 1].research, "air")) * craftOf(PLANES, d.unit).power, 0); // sem combustível ou com tempo ruim, voa menos

/** Superioridade aérea de `a` sobre `b` numa região (0..1; 0,5 se ninguém voa lá). */
export function airSuperiority(e: Economy, region: number, a: number, b: number) {
  if (region < 0) return 0.5;
  const over = (c: number) => airPower(e, e.divisions.filter((d) => d.kind === "air" && d.country === c && d.strength >= 1 && missionOf(e, d) === region));
  const pa = over(a), pb = over(b);
  return pa + pb > 0 ? pa / (pa + pb) : 0.5;
}

/** Hex de mar colado no hex (−1 se não houver). */
export function coastOf(w: World, i: number) {
  let s = -1;
  forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (s < 0 && w.terrain[j] === T.OCEAN) s = j; });
  return s;
}
/** Primeiro hex de mar colado numa cidade do país (onde frotas nascem e para onde recuam). */
export function homePort(w: World, e: Economy, country: number) {
  for (const k of e.cities) if (k.country === country) for (const j of k.urban) { const s = coastOf(w, j); if (s >= 0) return s; }
  return -1;
}
export const hasFleetIn = (w: World, e: Economy, country: number, zone: number) =>
  zone > 0 && e.divisions.some((d) => d.kind === "fleet" && d.strength >= 1 && d.country === country && w.seaZone[d.hex] === zone); // afundada não conta

/** A unidade pode pisar no hex? Frota só no mar; exército no mar só com frota do país na zona (transporte). */
function passable(w: World, e: Economy, d: Division, i: number) {
  if (w.terrain[i] === T.OCEAN) {
    if (deepOcean(w)[i] && !e.countries[d.country - 1].research.known.has(NAVY.deepTech)) return false; // galé não aguenta mar aberto
    return d.kind === "fleet" || (d.kind === "army" && hasFleetIn(w, e, d.country, w.seaZone[i]));
  }
  return d.kind !== "fleet" && MOVE_WEEKS[w.terrain[i]] !== Infinity;
}

export function buildFleet(w: World, e: Economy, country: number, hex: number, ship = "Galés"): string | null {
  if (w.owner[hex] !== country || !e.urban[hex] || e.occupier[hex]) return "Construa a frota numa cidade sua";
  const c = e.countries[country - 1], sh = SHIPS.find((x) => x.name === ship);
  if (!sh) return "Tipo de navio desconhecido";
  if (!c.research.known.has(sh.tech)) return `Precisa pesquisar ${sh.tech}`;
  const cost = Math.round(NAVY.cost * sh.cost);
  const sea = coastOf(w, hex);
  if (sea < 0) return "Essa parte da cidade não fica no litoral";
  if (c.manpower < NAVY.sailors) return `Manpower insuficiente (precisa ${NAVY.sailors})`;
  if (c.treasury < cost) return `Precisa de ${cost} no tesouro`;
  c.manpower -= NAVY.sailors; c.treasury -= cost;
  e.divisions.push({ id: e.nextDivision++, kind: "fleet", country, hex: sea, strength: NAVY.sailors, org: 1, target: null, progress: 0, equip: 1, unit: sh.name });
  return null;
}

/** Semanas para entrar num hex de cada terreno (Infinity = intransitável). */
const MOVE_WEEKS: number[] = [];
MOVE_WEEKS[T.OCEAN] = Infinity; MOVE_WEEKS[T.ICE] = Infinity;
MOVE_WEEKS[T.PLAINS] = MOVE_WEEKS[T.GRASS] = MOVE_WEEKS[T.DESERT] = MOVE_WEEKS[T.TUNDRA] = MOVE_WEEKS[T.SAVANNA] = MOVE_WEEKS[T.STEPPE] = 1;
MOVE_WEEKS[T.FOREST] = MOVE_WEEKS[T.JUNGLE] = MOVE_WEEKS[T.HILLS] = MOVE_WEEKS[T.TAIGA] = 2;
MOVE_WEEKS[T.MOUNTAIN] = 3;

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const atWar = (e: Economy, a: number, b: number) => a !== b && a > 0 && b > 0 && e.wars.has(key(a, b));
/** Quem controla o hex: o ocupante, se houver, senão o dono. */
export const controller = (w: World, e: Economy, i: number) => e.occupier[i] || w.owner[i];

export function declareWar(e: Economy, a: number, b: number): string | null {
  if (a === b) return "Não dá para declarar guerra a si mesmo";
  if (atWar(e, a, b)) return "Já estão em guerra";
  if (e.subjects?.[a]?.overlord === b) return "Súdito não declara guerra ao soberano (rompa a dependência antes)";
  e.wars.add(key(a, b));
  for (const [x, y] of warAllies(e, a, b)) if (x !== y && !atWar(e, x, y)) { // súditos e protetores entram (sem infâmia)
    e.wars.add(key(x, y));
    (e.warStats ??= {})[key(x, y)] = { start: e.week, dead: { [x]: 0, [y]: 0 }, civil: { [x]: 0, [y]: 0 }, cost: { [x]: 0, [y]: 0 } };
  }
  (e.warStats ??= {})[key(a, b)] = { start: e.week, dead: { [a]: 0, [b]: 0 }, civil: { [a]: 0, [b]: 0 }, cost: { [a]: 0, [b]: 0 } };
  e.countries[a - 1].infamy += INFAMY.declareWar * (hasClaimOn(e, a, b) ? CLAIM.infamyCut : 1); // com justificativa pesa menos
  e.pacts.delete(key(a, b)); // guerra cancela o acordo comercial
  noteRuler(e, a, `declarou guerra a §${b}§`); noteRuler(e, b, `foi atacado por §${a}§`);
  chronicle(e, "guerra", `§${a}§ declara guerra a §${b}§`, [a, b], [rulerOf(e, a)?.id, rulerOf(e, b)?.id].filter((x): x is number => x !== undefined), 3);
  return null;
}

/** Pode uma divisão do país entrar no hex? Terra livre, próprio, ou de quem está em guerra com ele. */
export function canEnter(w: World, e: Economy, country: number, i: number) {
  if (MOVE_WEEKS[w.terrain[i]] === Infinity) return false;
  const ctrl = controller(w, e, i);
  return !ctrl || ctrl === country || atWar(e, country, ctrl);
}

export function recruit(w: World, e: Economy, country: number, hex: number, unit = "Lanceiros"): string | null {
  if (w.owner[hex] !== country || !e.urban[hex] || e.occupier[hex]) return "Recrute numa cidade sua";
  const c = e.countries[country - 1], u = UNITS.find((x) => x.name === unit);
  if (!u) return "Tipo de tropa desconhecido";
  if (u.tech && !c.research.known.has(u.tech)) return `Precisa pesquisar ${u.tech}`;
  const cost = Math.round(WAR.recruitCost * u.cost);
  if (c.manpower < WAR.divisionSize) return `Manpower insuficiente (precisa ${WAR.divisionSize})`;
  if (c.treasury < cost) return `Precisa de ${cost} no tesouro`;
  c.manpower -= WAR.divisionSize; c.treasury -= cost;
  e.divisions.push({ id: e.nextDivision++, kind: "army", country, hex, strength: WAR.divisionSize, org: 1, target: null, progress: 0, equip: 1, unit: u.name });
  return null;
}

export function disband(w: World, e: Economy, id: number) {
  const d = e.divisions.find((x) => x.id === id);
  if (!d) return;
  if (d.kind !== "settler") e.countries[d.country - 1].manpower += d.strength;
  else { const cap = e.cities.find((k) => k.country === d.country)!.hex; w.pop[cap] += d.strength; } // colonos voltam para casa
  e.divisions = e.divisions.filter((x) => x !== d);
}

export function orderMove(w: World, e: Economy, id: number, target: number): string | null {
  const d = e.divisions.find((x) => x.id === id);
  if (!d) return "Divisão não existe";
  if (d.kind === "air") { // missão: região até AIR.range da base
    const dd = hexDistance(d.hex % w.W, (d.hex / w.W) | 0, target % w.W, (target / w.W) | 0, w.W);
    if (dd > AIR.range) return `Fora do alcance (máx. ${AIR.range} hexes da base)`;
    if (airRegion(e, target) < 0) return "Sem região aérea aí (só sobre território com cidade)";
    d.target = target === d.hex ? null : target;
    return null;
  }
  if (d.kind === "fleet" ? w.terrain[target] !== T.OCEAN : w.terrain[target] === T.ICE) return d.kind === "fleet" ? "Frotas só andam no mar" : "Não dá para ir até lá";
  // alvo no mar sem frota (ou atrás da névoa): a tropa vai pelo caminho possível e para onde não dá mais (nextStep)
  d.target = target === d.hex ? null : target; d.progress = 0;
  return null;
}

export const PATH = { maxNodes: 40000 }; // busca limitada: alvos muito longe vão até o ponto alcançável mais próximo

/**
 * Próximo hex no menor caminho até o alvo, só por hexes aceitos por ok. Se o alvo é inalcançável (mar sem frota,
 * outro continente), vai até o hex alcançável mais perto dele. -1 = já está o mais perto possível.
 */
export function nextStep(w: World, from: number, target: number, ok: (i: number) => boolean, owner?: { path?: { target: number; steps: number[] } }) {
  const cached = owner?.path;
  const k = cached && cached.target === target ? cached.steps.indexOf(from) : -1; // ainda no caminho? (pode ter ficado parado lutando)
  if (k >= 0 && k + 1 < cached!.steps.length && ok(cached!.steps[k + 1])) return cached!.steps[k + 1];
  const W = w.W, tc = target % W, tr = (target / W) | 0;
  const dist = (i: number) => hexDistance(i % W, (i / W) | 0, tc, tr, W);
  const prev = new Map<number, number>([[from, -1]]);
  let queue = [from], best = from, bestD = dist(from);
  while (queue.length && prev.size < PATH.maxNodes && bestD > 0) {
    const next: number[] = [];
    for (const i of queue) forNeighbors(i % W, (i / W) | 0, W, w.H, (j) => {
      if (prev.has(j) || !ok(j)) return;
      prev.set(j, i); next.push(j);
      const dj = dist(j);
      if (dj < bestD) { bestD = dj; best = j; }
    });
    queue = next;
  }
  if (best === from) return -1;
  const steps: number[] = [];
  for (let i = best; i !== -1; i = prev.get(i)!) steps.push(i);
  steps.reverse(); // [from, passo 1, passo 2, ...]
  if (owner) owner.path = { target, steps };
  return steps[1];
}

/** Há rio na borda entre dois hexes vizinhos? */
setRiverCheck(crossesRiver); // battle.ts usa sem importar war.ts (função declarada: já existe aqui)
// batalha terrestre: bombardeio naval e apoio aéreo dão modificador; reconhecimento aéreo evita emboscada
BATTLE_HOOKS.extra.push((w, e, b, country) => bombardMods(w, e, b, country));
BATTLE_HOOKS.extra.push((_w, e, b, country) => {
  const r = airRegion(e, b.hex), enemy = country === b.attacker ? b.defender : b.attacker;
  return airSupport(e, r, country, (h) => airRegion(e, h)) && airSuperiority(e, r, country, enemy) >= 0.5 ? [["Apoio aéreo", AIRW.support]] : [];
});
BATTLE_HOOKS.extra.push((_w, e, b, country) => { // incentivos da região onde se luta: fortificação e segurança (defendendo), preparação (tropas da região)
  const k = e.market[b.hex] - 1; if (k < 0 || e.cities[k].country !== country) return [];
  const out: [string, number][] = [], def = country === b.defender ? incFx(e, k, "defense") : 0, ready = incFx(e, k, "readiness");
  if (def) out.push(["Fortificação regional", Math.round(def * 10) / 10]);
  if (ready) out.push(["Preparação militar", Math.round(ready * 10) / 10]);
  return out;
});
BATTLE_HOOKS.recon = (e, hex, country) => airRecon(e, airRegion(e, hex), country, (h) => airRegion(e, h));
export function crossesRiver(w: World, a: number, b: number) {
  for (let k = 0; k < 6; k++) if (across(w.W, w.H, a, k) === b) return riverAt(w, a, k) === 1;
  return false;
}

/** Junta exércitos do país parados no mesmo hex num regimento só (a 1ª divisão fica; as outras somem dentro dela). */
export function mergeArmies(e: Economy, country: number, ids: number[]): string | null {
  const ds = ids.map((id) => e.divisions.find((d) => d.id === id)).filter((d): d is Division => !!d && d.kind === "army" && d.country === country);
  if (ds.length < 2) return "Selecione pelo menos dois exércitos seus";
  if (ds.some((d) => d.hex !== ds[0].hex)) return "Os exércitos precisam estar no mesmo hex";
  const total = ds.reduce((s, d) => s + d.strength, 0) || 1, mix: Record<string, number> = {};
  for (const d of ds) for (const [n, f] of Object.entries(d.mix ?? { [unitOf(d.unit).name]: 1 })) mix[n] = (mix[n] ?? 0) + (f * d.strength) / total;
  const head = ds[0], w = (f: (d: Division) => number) => ds.reduce((s, d) => s + f(d) * d.strength, 0) / total;
  head.org = w((d) => d.org); head.equip = w((d) => d.equip);
  head.strength = total; head.mix = mix; head.size = ds.reduce((s, d) => s + (d.size ?? 1), 0);
  head.unit = Object.entries(mix).sort((a, b) => b[1] - a[1])[0][0];
  head.general ??= ds.find((d) => d.general)?.general;
  head.target = null; head.path = undefined; head.progress = 0;
  const gone = new Set(ds.slice(1));
  e.divisions = e.divisions.filter((d) => !gone.has(d));
  return null;
}
/** Desfaz o regimento: uma divisão por tipo de soldado, no mesmo hex. */
export function splitRegiment(e: Economy, country: number, id: number): string | null {
  const d = e.divisions.find((x) => x.id === id);
  if (!d || d.country !== country || !d.mix) return "Não é um regimento seu";
  const parts = Object.entries(d.mix), strength = d.strength;
  parts.forEach(([n, f], k) => {
    const x: Division = k === 0 ? d : { ...d, id: e.nextDivision++, general: undefined, path: undefined };
    x.unit = n; x.strength = strength * f; x.mix = undefined; x.size = undefined;
    if (k > 0) e.divisions.push(x);
  });
  return null;
}

/** Força de combate: soldados × organização × armas × tecnologia militar do país. */

/** Tira baixas das divisões proporcionalmente à força, e a mesma gente da população da capital. */
function takeLosses(w: World, e: Economy, ds: Division[], losses: number) {
  const total = ds.reduce((s, d) => s + d.strength, 0) || 1;
  for (const d of ds) {
    const l = Math.min(d.strength, (losses * d.strength) / total);
    d.strength -= l;
    for (const s of warsOf(e, d.country)) s.dead[d.country] = (s.dead[d.country] ?? 0) + l;
    const cap = e.cities.find((k) => k.country === d.country)!.hex;
    w.pop[cap] = Math.max(0, w.pop[cap] - l);
  }
}

/** Estatísticas das guerras em que o país está. */
const warsOf = (e: Economy, country: number) => {
  const out: WarStats[] = [];
  for (const k of e.wars) { const [a, b] = k.split("-").map(Number); if (a === country || b === country) out.push(((e.warStats ??= {})[k] ??= { start: e.week, dead: {}, civil: {}, cost: {} })); }
  return out;
};

/** Apoio do povo à guerra (0..1): cai com o tempo e com os mortos (em relação à população). */
export function warSupport(e: Economy, country: number, s: WarStats) {
  const c = e.countries[country - 1], dead = (s.dead[country] ?? 0) + (s.civil[country] ?? 0);
  return Math.max(0, Math.min(1, 1 - (e.week - s.start) / WAR.supportWeeks - (c.pop ? (dead / c.pop) * WAR.supportDeadMult : 0)));
}

/** Avança a guerra uma semana (chamar depois de tick). */
export function stepWar(w: World, e: Economy) {
  const ARMS = GOODS.indexOf("Armas");
  const count = new Map<number, number>();
  for (const d of e.divisions) if (d.kind === "army") count.set(d.country, (count.get(d.country) ?? 0) + 1);
  for (const d of e.divisions) if (d.kind === "fleet" || d.kind === "air") { // manutenção de frotas e esquadrões
    const c = e.countries[d.country - 1];
    if (spend(c, (d.kind === "air" ? AIR.upkeep : NAVY.upkeep) * econ(c, "monetization"), "Frotas e aviação") < 1) d.org = Math.max(0, d.org - WAR.unpaidOrg); // sem soldo: desorganiza
  }
  for (const [country, n] of count) { // armas e manutenção
    const c = e.countries[country - 1], m = e.cities.find((k) => k.country === country)!.market;
    const fill = m.demand[ARMS] ? Math.min(1, m.supply[ARMS] / m.demand[ARMS]) : 1;
    for (const d of e.divisions) if (d.country === country && d.kind === "army") d.equip = 0.5 + 0.5 * fill;
    const cost = n * WAR.upkeep * econ(c, "monetization"); // exército tribal vive do que leva: só a parte monetizada é soldo
    const paidShare = spend(c, cost, "Exército");
    for (const s of warsOf(e, country)) s.cost[country] = (s.cost[country] ?? 0) + cost * paidShare;
    if (paidShare < 1) for (const d of e.divisions) if (d.country === country && d.kind === "army") d.org = Math.max(0, d.org - WAR.unpaidOrg * (1 - paidShare)); // sem soldo: desorganiza
  }

  // no mar anda mais rápido: passos extras para frotas e exércitos embarcados (sem combate no meio)
  for (let k = 1; k < NAVY.speed; k++) for (const d of e.divisions) {
    if (d.target === null || (d.kind !== "fleet" && w.terrain[d.hex] !== T.OCEAN)) continue;
    const n = nextStep(w, d.hex, d.target, (j) => passable(w, e, d, j), d);
    if (n < 0 || w.terrain[n] !== T.OCEAN) continue;
    d.hex = n;
    if (n === d.target) d.target = null;
  }

  const at = new Map<number, Division[]>(); // divisões por hex
  for (const d of e.divisions) { if (!at.has(d.hex)) at.set(d.hex, []); at.get(d.hex)!.push(d); }
  const enemiesIn = (hex: number, country: number) => (at.get(hex) ?? []).filter((x) => x.kind === "army" && w.terrain[x.hex] !== T.OCEAN && atWar(e, country, x.country));

  const battles = new Map<number, Division[]>(); // hex defendido → atacantes
  const fighting = new Set<Division>(), moved = new Set<Division>();
  let changed = false;
  for (const d of e.divisions) {
    if (d.target === null || d.kind === "air") continue; // esquadrões não andam: voam missões
    const next = nextStep(w, d.hex, d.target, (j) => passable(w, e, d, j), d);
    const sea = next >= 0 && w.terrain[next] === T.OCEAN;
    if (next < 0) { d.target = null; continue; }
    if (!sea && enemiesIn(next, d.country).length) {
      if (d.kind === "settler") { d.target = null; continue; } // colonos não atacam
      if (!battles.has(next)) battles.set(next, []);
      battles.get(next)!.push(d);
      continue;
    }
    const ctrl = controller(w, e, next);
    if (!sea && (!canEnter(w, e, d.country, next) || (d.kind === "settler" && ctrl && ctrl !== d.country))) { d.target = null; continue; }
    const wx = sea ? "limpo" : weatherAt(w, next, e.week); // lama atrasa muito, chuva um pouco (neve já conta)
    d.progress += sea ? 1 : (d.kind === "army" ? statsOf(d) : unitOf(undefined)).speed / (MOVE_WEEKS[w.terrain[next]] + (crossesRiver(w, d.hex, next) ? 1 : 0) + (snowAt(w, next, e.week) ? 1 : 0) + (wx === "lama" ? 1 : wx === "chuva" ? 0.3 : 0));
    if (d.progress < 1) continue;
    d.progress = 0; d.siege = 0; moved.add(d); // saiu do lugar: o cerco recomeça
    at.set(d.hex, (at.get(d.hex) ?? []).filter((x) => x !== d));
    d.hex = next;
    if (!at.has(next)) at.set(next, []);
    at.get(next)!.push(d);
    if (next === d.target) d.target = null;
    if (d.kind === "army") for (const x of at.get(next)!) if (x.kind === "settler" && atWar(e, d.country, x.country)) x.strength = 0; // exército inimigo destrói colonos
    if (d.kind !== "army" || sea) continue;
    // ocupar território inimigo; libertar o próprio
    const center = e.market[next] && e.cities[e.market[next] - 1].hex === next; // centro de cidade só cai por cerco
    if (!center && w.owner[next] && w.owner[next] !== d.country && atWar(e, d.country, w.owner[next]) && e.occupier[next] !== d.country) { e.occupier[next] = d.country; changed = true; }
    if (w.owner[next] === d.country && e.occupier[next]) { // libertar: retomar o centro devolve a região toda
      if (center) { for (const i of e.owned) if (e.market[i] === e.market[next]) e.occupier[i] = 0; } else e.occupier[next] = 0;
      changed = true;
    }
  }

  // civis: território ocupado perde gente; guerra impopular corrói a legitimidade
  for (const i of e.owned) if (e.occupier[i]) {
    const l = w.pop[i] * WAR.civilLoss; w.pop[i] -= l;
    for (const s of warsOf(e, w.owner[i])) s.civil[w.owner[i]] = (s.civil[w.owner[i]] ?? 0) + l;
  }
  e.countries.forEach((c, ci) => {
    for (const s of warsOf(e, ci + 1)) c.politics.legitimacy = Math.max(0, c.politics.legitimacy - WAR.supportLegitimacy * (1 - warSupport(e, ci + 1, s)));
  });

  // cerco: exército parado no centro de uma cidade inimiga; ao terminar, a cidade e toda a região dela ficam ocupadas
  e.cities.forEach((city, k) => {
    const besiegers = (at.get(city.hex) ?? []).filter((d) => d.kind === "army" && !fighting.has(d) && atWar(e, d.country, city.country) && e.occupier[city.hex] !== d.country);
    if (!besiegers.length) return;
    const who = besiegers[0].country, mine = besiegers.filter((d) => d.country === who);
    for (const d of mine) d.siege = (d.siege ?? 0) + 1;
    const siegePower = Math.max(...mine.map((d) => statsOf(d).siege)); // máquinas de cerco e artilharia abrem as muralhas
    if (Math.max(...mine.map((d) => d.siege!)) < siegeWeeks(city.size, mine.length) / siegePower) return;
    for (const i of e.owned) if (e.market[i] === k + 1 && w.owner[i] === city.country) e.occupier[i] = who;
    for (const d of mine) { d.siege = 0; const g = d.general ? e.characters?.find((x) => x.id === d.general) : undefined; if (g && !g.taken?.includes(city.name)) { (g.taken ??= []).push(city.name); note(g, e.week, `tomou a cidade de ${city.name} (§${city.country}§) depois de um cerco`); } }
    chronicle(e, "conquista", `§${who}§ toma ${city.name} de §${city.country}§ em cerco`, [who, city.country], mine.map((d) => d.general).filter((x): x is number => !!x), 3);
    changed = true;
  });

  stepAir(w, e, (h) => airRegion(e, h), (a, b) => atWar(e, a, b)); // prontidão (combustível, tempo) e missões (airwar.ts)
  // combate aéreo: em cada região, esquadrões de países em guerra se derrubam
  const airIn = new Map<number, Division[]>();
  for (const d of e.divisions) if (d.kind === "air") { const r = missionOf(e, d); if (!airIn.has(r)) airIn.set(r, []); airIn.get(r)!.push(d); }
  for (const ds of airIn.values()) {
    const cs = [...new Set(ds.map((d) => d.country))];
    for (const a of cs) for (const b of cs) {
      if (a >= b || !atWar(e, a, b)) continue;
      const A = ds.filter((d) => d.country === a), B = ds.filter((d) => d.country === b);
      const pa = airPower(e, A), pb = airPower(e, B);
      takeLosses(w, e, B, pa * WAR.casualties);
      takeLosses(w, e, A, pb * WAR.casualties);
      for (const d of A) d.org = Math.max(0, d.org - WAR.orgLoss * (pb / (pa || 1)));
      for (const d of B) d.org = Math.max(0, d.org - WAR.orgLoss * (pa / (pb || 1)));
      for (const d of [...A, ...B]) { fighting.add(d); if (d.org < WAR.brokenOrg) d.target = null; } // abatido volta a defender a base
    }
  }

  // batalhas terrestres: frente, fases, dados, organização e moral, reservas, retirada (battle.ts)
  const landFights = resolveBattles(w, e, battles, WAR.divisionSize, enemiesIn,
    (d, from) => { let to = -1; forNeighbors(from % w.W, (from / w.W) | 0, w.W, w.H, (j) => { if (to < 0 && controller(w, e, j) === d.country && !enemiesIn(j, d.country).length && MOVE_WEEKS[w.terrain[j]] !== Infinity) to = j; }); return to; },
    (ds, n) => takeLosses(w, e, ds, n),
    (b, winner, att, def) => { // batalha decidida: registro de cada comandante (characters.ts)
      const k = e.market[b.hex]; const city = k && e.cities[k - 1].hex === b.hex ? e.cities[k - 1].name : null;
      recordBattle(e, b, winner, att, def, city ? `de ${city}` : `em (${b.hex % w.W}, ${(b.hex / w.W) | 0})`);
    },
    (hex, a, b) => Math.round((2 * airSuperiority(e, airRegion(e, hex), a, b) - 1) * 10) / 10);
  for (const d of landFights) fighting.add(d);

  // combate naval com dados, tempo do mar, submarinos e porta-aviões (seawar.ts)
  for (const f of resolveNaval(w, e, (a, b) => atWar(e, a, b), (ds, n) => takeLosses(w, e, ds, n), (k) => homePort(w, e, k))) fighting.add(f);
  const fleetsIn = new Map<number, Division[]>();
  for (const d of e.divisions) if (d.kind === "fleet") { const z = w.seaZone[d.hex]; if (!fleetsIn.has(z)) fleetsIn.set(z, []); fleetsIn.get(z)!.push(d); }
  // exército no mar sem frota própria na zona e com frota inimiga: afunda
  for (const d of e.divisions) {
    if (d.kind !== "army" || w.terrain[d.hex] !== T.OCEAN) continue;
    const z = w.seaZone[d.hex];
    if (!hasFleetIn(w, e, d.country, z) && e.divisions.some((f) => f.kind === "fleet" && f.strength >= 1 && w.seaZone[f.hex] === z && atWar(e, d.country, f.country))) d.strength = 0;
  }
  // bloqueio: zona colada na cidade com frota inimiga e sem frota própria
  for (const k of e.cities) {
    k.blockaded = false;
    for (const j of k.urban) {
      const s = coastOf(w, j);
      if (s < 0) continue;
      const z = w.seaZone[s];
      if (!hasFleetIn(w, e, k.country, z) && (fleetsIn.get(z) ?? []).some((f) => f.strength >= 1 && atWar(e, k.country, f.country))) { k.blockaded = true; break; }
    }
  }

  stepSupply(w, e, (d) => depotDistance(w, e, d), (k) => supplyRange(e, k), fighting, (d) => convoyFactor(w, e, d, nearestDepot(w, e, d), (a, b) => atWar(e, a, b))); // logística terrestre; além-mar depende de comboio (seawar.ts)
  for (const d of e.divisions) {
    if (d.kind === "settler") { // colonos longe das cidades ficam sem suprimentos e vão morrendo
      if (settlerDistance(w, e, d) > RULES.settlerSupplyRange) d.strength -= Math.max(0.5, d.strength * RULES.settlerAttrition);
      continue;
    }
    if (d.kind === "air" && controller(w, e, d.hex) !== d.country) { d.hex = e.cities.find((k) => k.country === d.country)!.hex; d.target = null; } // base caiu: muda para a capital
    if (d.kind === "army" && w.terrain[d.hex] !== T.OCEAN) { // atrito (terreno, inverno, fome) e fadiga; fora das baixas de batalha
      const dead = attrition(w, e, d, moved.has(d), atWar(e, d.country, controller(w, e, d.hex)));
      for (const s of warsOf(e, d.country)) s.attrition = { ...(s.attrition ?? {}), [d.country]: (s.attrition?.[d.country] ?? 0) + dead };
      if (!fighting.has(d)) entrench(e, d, moved.has(d));
      if ((d.supply?.level ?? 1) < 0.5) d.org = Math.max(0, d.org - WAR.noSupplyOrg * (1 - (d.supply?.level ?? 1)) * 2);
    }
    if (fighting.has(d) || d.strength < 1) continue; // morta não se recupera nem recebe reforço
    // organização volta com descanso e suprimento; cansaço atrasa
    d.org = Math.min(1, d.org + WAR.orgRecovery * (d.kind === "army" ? (d.supply?.level ?? 1) * (1 - 0.5 * (d.fatigue ?? 0)) : 1));
    const c = e.countries[d.country - 1];
    const full = d.kind === "fleet" ? NAVY.sailors : d.kind === "air" ? AIR.pilots : WAR.divisionSize * (d.size ?? 1);
    if (controller(w, e, d.hex) === d.country && d.strength < full && c.manpower > 0) { // reforço em território (ou águas) próprio: precisa de gente e de armas
      const add = Math.min(WAR.reinforce * (d.kind === "army" ? Math.max(0.5, (d.equip - 0.5) * 2) : 1), c.manpower, full - d.strength); // sem armas no mercado, reforça pela metade (lanças improvisadas)
      d.strength += add; c.manpower -= add;
    }
  }
  e.divisions = e.divisions.filter((d) => d.strength >= 1);
  if (changed) e.version++;
}

/** Alcance do abastecimento em hexes: cresce com a era (carroças → ferrovias → caminhões). */
export const supplyRange = (e: Economy, country: number) => WAR.supplyBase + WAR.supplyPerEra * e.countries[country - 1].research.era;
/** Distância até o depósito mais perto: cidade do país ou cidade inimiga que ele ocupa (vira base de suprimento). */
/** Depósito mais perto do exército (hex), ou −1. */
export function nearestDepot(w: World, e: Economy, d: Division) {
  let best = -1, bd = Infinity;
  for (const h of [...e.cities.filter((k) => k.country === d.country || e.occupier[k.hex] === d.country).map((k) => k.hex), ...depotHexes(w, e, d.country), ...(e.outposts ?? []).filter((o) => o.country === d.country).map((o) => o.hex)]) {
    const dd = hexDistance(d.hex % w.W, (d.hex / w.W) | 0, h % w.W, (h / w.W) | 0, w.W);
    if (dd < bd) { bd = dd; best = h; }
  }
  return best;
}
export function depotDistance(w: World, e: Economy, d: Division) {
  let best = Infinity;
  const hexes = [...e.cities.filter((k) => k.country === d.country || e.occupier[k.hex] === d.country).map((k) => k.hex), ...depotHexes(w, e, d.country),
    ...(e.outposts ?? []).filter((o) => o.country === d.country).map((o) => o.hex)]; // posto avançado também abastece
  for (const h of hexes) best = Math.min(best, hexDistance(d.hex % w.W, (d.hex / w.W) | 0, h % w.W, (h / w.W) | 0, w.W));
  return best;
}

/** Distância (em hexes) dos colonos até a cidade mais próxima do país deles. */
export function settlerDistance(w: World, e: Economy, d: Division) {
  let best = Infinity;
  for (const h of anchors(e, d.country)) best = Math.min(best, hexDistance(d.hex % w.W, (d.hex / w.W) | 0, h % w.W, (h / w.W) | 0, w.W)); // cidades e postos avançados
  return best;
}

/** Pontuação de guerra de a contra b (−1..1): população de b que a ocupa menos a de a que b ocupa. */
export function warScore(w: World, e: Economy, a: number, b: number) {
  let popA = 0, popB = 0, aHoldsB = 0, bHoldsA = 0;
  for (const i of e.owned) {
    if (w.owner[i] === a) { popA += w.pop[i]; if (e.occupier[i] === b) bHoldsA += w.pop[i]; }
    else if (w.owner[i] === b) { popB += w.pop[i]; if (e.occupier[i] === a) aHoldsB += w.pop[i]; }
  }
  return (popB ? aHoldsB / popB : 0) - (popA ? bHoldsA / popA : 0);
}

/** Faz a paz. Quem estiver na frente fica com o território que ocupou (menos a capital do outro). */
export function makePeace(w: World, e: Economy, a: number, b: number): string | null {
  if (!atWar(e, a, b)) return "Não estão em guerra";
  const s = warScore(w, e, a, b);
  const winner = s > WAR.peaceThreshold ? a : s < -WAR.peaceThreshold ? b : 0, loser = winner === a ? b : a;
  const loserCapital = winner ? e.cities.find((k) => k.country === loser)!.hex : -1;
  for (const i of e.owned) {
    const pair = (w.owner[i] === a && e.occupier[i] === b) || (w.owner[i] === b && e.occupier[i] === a);
    if (!pair) continue;
    if (winner && w.owner[i] === loser && i !== loserCapital) { w.owner[i] = winner; e.countries[winner - 1].infamy += INFAMY.perHexTaken; }
    e.occupier[i] = 0;
  }
  e.cities.forEach((city, k) => { if (w.owner[city.hex] !== city.country) { lostCity(e, city.country, k); city.country = w.owner[city.hex]; } });
  e.wars.delete(key(a, b));
  delete e.warStats?.[key(a, b)];
  noteRuler(e, a, winner === a ? `venceu a guerra contra §${b}§` : winner === b ? `perdeu a guerra contra §${b}§` : `fez a paz com §${b}§ sem vencedor`);
  noteRuler(e, b, winner === b ? `venceu a guerra contra §${a}§` : winner === a ? `perdeu a guerra contra §${a}§` : `fez a paz com §${a}§ sem vencedor`);
  chronicle(e, "paz", winner ? `paz: §${winner}§ vence a guerra contra §${loser}§` : `paz sem vencedor entre §${a}§ e §${b}§`, [a, b], [rulerOf(e, a)?.id, rulerOf(e, b)?.id].filter((x): x is number => x !== undefined), 3);
  if (winner) { e.countries[winner - 1].glory = (e.countries[winner - 1].glory ?? 0) + DIPLO.warWin; e.countries[loser - 1].glory = (e.countries[loser - 1].glory ?? 0) - DIPLO.warWin; }
  dropHomeless(e);
  // tropas que ficaram em território que agora é do outro voltam para a capital
  for (const d of e.divisions) if (d.kind !== "fleet" && !canEnter(w, e, d.country, d.hex)) { d.hex = e.cities.find((k) => k.country === d.country)!.hex; d.target = null; }
  refresh(w, e);
  return null;
}

for (let t = 0; t < TERRAINS.length; t++) if (MOVE_WEEKS[t] === undefined) throw new Error(`terreno sem custo de movimento: ${TERRAINS[t].name}`);

/**
 * Frente (estilo HOI4, simplificado): o grupo inteiro recebe ordens de uma vez.
 * "defend": as divisões se espalham pela fronteira com o inimigo (hexes nossos encostados nele).
 * "attack": cada divisão vai para o centro de uma cidade do inimigo (as mais perto primeiro, repartidas).
 */
export function frontOrder(w: World, e: Economy, country: number, ids: number[], enemy: number, mode: "defend" | "attack"): string | null {
  const ds = ids.map((id) => e.divisions.find((d) => d.id === id && d.country === country && d.kind === "army")).filter((d): d is Division => !!d);
  if (!ds.length) return "Selecione exércitos seus";
  if (!e.countries[enemy - 1] || enemy === country) return "Escolha outro país";
  const dist = (a: number, b: number) => hexDistance(a % w.W, (a / w.W) | 0, b % w.W, (b / w.W) | 0, w.W);
  let targets: number[];
  if (mode === "defend") {
    targets = [];
    for (const i of e.owned) {
      if (w.owner[i] !== country) continue;
      let touches = false;
      forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (w.owner[j] === enemy) touches = true; });
      if (touches) targets.push(i);
    }
    if (!targets.length) return "Não há fronteira com esse país";
    // espalha: pega hexes da fronteira em intervalos iguais (ordenados pela posição para a linha ficar contínua)
    targets.sort((a, b) => (a % w.W) - (b % w.W) || a - b);
    const step = targets.length / ds.length;
    targets = ds.map((_, k) => targets[Math.floor(k * step + step / 2) % targets.length]);
  } else {
    const cities = e.cities.filter((k) => k.country === enemy).map((k) => k.hex);
    if (!cities.length) return "Esse país não tem cidades";
    const center = ds[0].hex;
    cities.sort((a, b) => dist(center, a) - dist(center, b));
    const n = Math.max(1, Math.min(cities.length, Math.ceil(ds.length / 2))); // ataca em duplas: cerco é mais rápido com 2
    targets = ds.map((_, k) => cities[k % n]);
  }
  ds.forEach((d, k) => orderMove(w, e, d.id, targets[k]));
  return null;
}
