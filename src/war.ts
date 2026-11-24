// Guerra terrestre (estilo HOI4 simplificado, sem customizar divisões).
// Divisões andam hex a hex, lutam contra o hex vizinho que querem entrar, ocupam território inimigo,
// e a paz entrega ao vencedor o que ele ocupou (menos a capital do perdedor).
import { refresh, GOODS, RULES, type Economy, type Division } from "./economy.ts";
import { techSum } from "./tech.ts";
import { forNeighbors, hexDistance } from "./hex.ts";
import { T, TERRAINS, across, riverAt, snowAt, type World } from "./world.ts";

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
};

/** Semanas para entrar num hex de cada terreno (Infinity = intransitável). */
const MOVE_WEEKS: number[] = [];
MOVE_WEEKS[T.OCEAN] = Infinity; MOVE_WEEKS[T.ICE] = Infinity;
MOVE_WEEKS[T.PLAINS] = MOVE_WEEKS[T.GRASS] = MOVE_WEEKS[T.DESERT] = MOVE_WEEKS[T.TUNDRA] = MOVE_WEEKS[T.SAVANNA] = MOVE_WEEKS[T.STEPPE] = 1;
MOVE_WEEKS[T.FOREST] = MOVE_WEEKS[T.JUNGLE] = MOVE_WEEKS[T.HILLS] = MOVE_WEEKS[T.TAIGA] = 2;
MOVE_WEEKS[T.MOUNTAIN] = 3;
/** Bônus de defesa do terreno. */
const DEFENSE: number[] = Array(TERRAINS.length).fill(1);
DEFENSE[T.FOREST] = DEFENSE[T.TAIGA] = 1.15; DEFENSE[T.JUNGLE] = 1.25; DEFENSE[T.HILLS] = 1.25; DEFENSE[T.MOUNTAIN] = 1.5;

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const atWar = (e: Economy, a: number, b: number) => a !== b && a > 0 && b > 0 && e.wars.has(key(a, b));
/** Quem controla o hex: o ocupante, se houver, senão o dono. */
export const controller = (w: World, e: Economy, i: number) => e.occupier[i] || w.owner[i];

export function declareWar(e: Economy, a: number, b: number): string | null {
  if (a === b) return "Não dá para declarar guerra a si mesmo";
  if (atWar(e, a, b)) return "Já estão em guerra";
  e.wars.add(key(a, b));
  e.pacts.delete(key(a, b)); // guerra cancela o acordo comercial
  return null;
}

/** Pode uma divisão do país entrar no hex? Terra livre, próprio, ou de quem está em guerra com ele. */
export function canEnter(w: World, e: Economy, country: number, i: number) {
  if (MOVE_WEEKS[w.terrain[i]] === Infinity) return false;
  const ctrl = controller(w, e, i);
  return !ctrl || ctrl === country || atWar(e, country, ctrl);
}

export function recruit(w: World, e: Economy, country: number, hex: number): string | null {
  if (w.owner[hex] !== country || !e.urban[hex] || e.occupier[hex]) return "Recrute numa cidade sua";
  const c = e.countries[country - 1];
  if (c.manpower < WAR.divisionSize) return `Manpower insuficiente (precisa ${WAR.divisionSize})`;
  if (c.treasury < WAR.recruitCost) return `Precisa de ${WAR.recruitCost} no tesouro`;
  c.manpower -= WAR.divisionSize; c.treasury -= WAR.recruitCost;
  e.divisions.push({ id: e.nextDivision++, kind: "army", country, hex, strength: WAR.divisionSize, org: 1, target: null, progress: 0, equip: 1 });
  return null;
}

export function disband(w: World, e: Economy, id: number) {
  const d = e.divisions.find((x) => x.id === id);
  if (!d) return;
  if (d.kind === "army") e.countries[d.country - 1].manpower += d.strength;
  else { const cap = e.cities.find((k) => k.country === d.country)!.hex; w.pop[cap] += d.strength; } // colonos voltam para casa
  e.divisions = e.divisions.filter((x) => x !== d);
}

export function orderMove(w: World, e: Economy, id: number, target: number): string | null {
  const d = e.divisions.find((x) => x.id === id);
  if (!d) return "Divisão não existe";
  if (MOVE_WEEKS[w.terrain[target]] === Infinity) return "Não dá para ir até lá por terra";
  d.target = target === d.hex ? null : target; d.progress = 0;
  return null;
}

/** Próximo passo guloso até o alvo (vizinho de terra mais perto dele). */
// shortcut: guloso, trava atrás de lagos e baías; trocar por A* se os jogadores reclamarem.
function nextStep(w: World, from: number, target: number) {
  const W = w.W, tc = target % W, tr = (target / W) | 0;
  const dist = (i: number) => hexDistance(i % W, (i / W) | 0, tc, tr, W);
  let best = -1, bestD = dist(from);
  forNeighbors(from % W, (from / W) | 0, W, w.H, (j) => {
    const d = dist(j);
    if (MOVE_WEEKS[w.terrain[j]] !== Infinity && d < bestD) { best = j; bestD = d; }
  });
  return best;
}

/** Há rio na borda entre dois hexes vizinhos? */
export function crossesRiver(w: World, a: number, b: number) {
  for (let k = 0; k < 6; k++) if (across(w.W, w.H, a, k) === b) return riverAt(w, a, k) === 1;
  return false;
}

/** Força de combate: soldados × organização × armas × tecnologia militar do país. */
const power = (e: Economy, ds: Division[]) => ds.reduce((s, d) => s + d.strength * d.org * d.equip * (1 + techSum(e.countries[d.country - 1].research, "army")), 0);

/** Tira baixas das divisões proporcionalmente à força, e a mesma gente da população da capital. */
function takeLosses(w: World, e: Economy, ds: Division[], losses: number) {
  const total = ds.reduce((s, d) => s + d.strength, 0) || 1;
  for (const d of ds) {
    const l = Math.min(d.strength, (losses * d.strength) / total);
    d.strength -= l;
    const cap = e.cities.find((k) => k.country === d.country)!.hex;
    w.pop[cap] = Math.max(0, w.pop[cap] - l);
  }
}

/** Avança a guerra uma semana (chamar depois de tick). */
export function stepWar(w: World, e: Economy) {
  const ARMS = GOODS.indexOf("Armas");
  const count = new Map<number, number>();
  for (const d of e.divisions) if (d.kind === "army") count.set(d.country, (count.get(d.country) ?? 0) + 1);
  for (const [country, n] of count) { // armas e manutenção
    const c = e.countries[country - 1], m = e.cities.find((k) => k.country === country)!.market;
    const fill = m.demand[ARMS] ? Math.min(1, m.supply[ARMS] / m.demand[ARMS]) : 1;
    for (const d of e.divisions) if (d.country === country && d.kind === "army") d.equip = 0.5 + 0.5 * fill;
    c.treasury -= n * WAR.upkeep;
    if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
  }

  const at = new Map<number, Division[]>(); // divisões por hex
  for (const d of e.divisions) { if (!at.has(d.hex)) at.set(d.hex, []); at.get(d.hex)!.push(d); }
  const enemiesIn = (hex: number, country: number) => (at.get(hex) ?? []).filter((x) => x.kind === "army" && atWar(e, country, x.country));

  const battles = new Map<number, Division[]>(); // hex defendido → atacantes
  const fighting = new Set<Division>();
  let changed = false;
  for (const d of e.divisions) {
    if (d.target === null) continue;
    const next = nextStep(w, d.hex, d.target);
    if (next < 0) { d.target = null; continue; }
    if (enemiesIn(next, d.country).length) {
      if (d.kind === "settler") { d.target = null; continue; } // colonos não atacam
      if (!battles.has(next)) battles.set(next, []);
      battles.get(next)!.push(d);
      continue;
    }
    const ctrl = controller(w, e, next);
    if (!canEnter(w, e, d.country, next) || (d.kind === "settler" && ctrl && ctrl !== d.country)) { d.target = null; continue; }
    d.progress += 1 / (MOVE_WEEKS[w.terrain[next]] + (crossesRiver(w, d.hex, next) ? 1 : 0) + (snowAt(w, next, e.week) ? 1 : 0));
    if (d.progress < 1) continue;
    d.progress = 0;
    at.set(d.hex, (at.get(d.hex) ?? []).filter((x) => x !== d));
    d.hex = next;
    if (!at.has(next)) at.set(next, []);
    at.get(next)!.push(d);
    if (next === d.target) d.target = null;
    if (d.kind === "army") for (const x of at.get(next)!) if (x.kind === "settler" && atWar(e, d.country, x.country)) x.strength = 0; // exército inimigo destrói colonos
    if (d.kind === "settler") continue;
    // ocupar território inimigo; libertar o próprio
    if (w.owner[next] && w.owner[next] !== d.country && atWar(e, d.country, w.owner[next]) && e.occupier[next] !== d.country) { e.occupier[next] = d.country; changed = true; }
    if (w.owner[next] === d.country && e.occupier[next]) { e.occupier[next] = 0; changed = true; }
  }

  for (const [hex, attackers] of battles) {
    const defenders = attackers.length ? enemiesIn(hex, attackers[0].country) : [];
    if (!defenders.length) continue;
    const riverLine = attackers.some((a) => crossesRiver(w, a.hex, hex)); // atacar atravessando rio é pior
    const pa = power(e, attackers), pd = power(e, defenders) * DEFENSE[w.terrain[hex]] * (riverLine ? 1.25 : 1);
    takeLosses(w, e, defenders, pa * WAR.casualties);
    takeLosses(w, e, attackers, pd * WAR.casualties);
    for (const d of defenders) d.org = Math.max(0, d.org - WAR.orgLoss * (pa / (pd || 1)));
    for (const d of attackers) d.org = Math.max(0, d.org - WAR.orgLoss * (pd / (pa || 1)));
    for (const d of [...attackers, ...defenders]) fighting.add(d);
    for (const d of defenders) if (d.org < WAR.brokenOrg) { // recua para um vizinho seguro ou é destruída
      let to = -1;
      forNeighbors(hex % w.W, (hex / w.W) | 0, w.W, w.H, (j) => {
        if (to < 0 && controller(w, e, j) === d.country && !enemiesIn(j, d.country).length && MOVE_WEEKS[w.terrain[j]] !== Infinity) to = j;
      });
      if (to < 0) d.strength = 0; else { d.hex = to; d.target = null; }
    }
  }

  for (const d of e.divisions) {
    if (d.kind === "settler") { // colonos longe das cidades ficam sem suprimentos e vão morrendo
      if (settlerDistance(w, e, d) > RULES.settlerSupplyRange) d.strength -= Math.max(0.5, d.strength * RULES.settlerAttrition);
      continue;
    }
    if (fighting.has(d)) continue;
    d.org = Math.min(1, d.org + WAR.orgRecovery);
    const c = e.countries[d.country - 1];
    if (controller(w, e, d.hex) === d.country && d.strength < WAR.divisionSize && c.manpower > 0) {
      const add = Math.min(WAR.reinforce, c.manpower, WAR.divisionSize - d.strength);
      d.strength += add; c.manpower -= add;
    }
  }
  e.divisions = e.divisions.filter((d) => d.strength >= 1);
  if (changed) e.version++;
}

/** Distância (em hexes) dos colonos até a cidade mais próxima do país deles. */
export function settlerDistance(w: World, e: Economy, d: Division) {
  let best = Infinity;
  for (const k of e.cities) if (k.country === d.country) best = Math.min(best, hexDistance(d.hex % w.W, (d.hex / w.W) | 0, k.hex % w.W, (k.hex / w.W) | 0, w.W));
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
    if (winner && w.owner[i] === loser && i !== loserCapital) w.owner[i] = winner;
    e.occupier[i] = 0;
  }
  for (const city of e.cities) if (w.owner[city.hex] !== city.country) city.country = w.owner[city.hex];
  e.wars.delete(key(a, b));
  // tropas que ficaram em território que agora é do outro voltam para a capital
  for (const d of e.divisions) if (!canEnter(w, e, d.country, d.hex)) { d.hex = e.cities.find((k) => k.country === d.country)!.hex; d.target = null; }
  refresh(w, e);
  return null;
}

for (let t = 0; t < TERRAINS.length; t++) if (MOVE_WEEKS[t] === undefined) throw new Error(`terreno sem custo de movimento: ${TERRAINS[t].name}`);
