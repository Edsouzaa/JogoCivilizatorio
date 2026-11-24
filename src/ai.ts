// IA dos países que não têm jogador. Decide uma vez por mês, com regras simples e baratas:
// expandir com colonos, construir onde o mercado paga mais, propor leis com apoio, manter exército de defesa,
// declarar guerra raramente a vizinhos mais fracos e fazer a paz quando a guerra se decidiu ou se arrastou.
import {
  build, buildCost, buildingsFor, foundCity, trainSettlers, techFor, settlersOf,
  BUILDINGS, RULES, type Economy, type Division,
} from "./economy.ts";
import { recruit, orderMove, declareWar, makePeace, atWar, warScore, settlerDistance, WAR } from "./war.ts";
import { LAWS, lawSupport, proposeLaw } from "./politics.ts";
import { hexDistance, hexesInRadius } from "./hex.ts";
import { TERRAINS, isLand, mulberry32, type World } from "./world.ts";

export const AI = {
  reserve: 1.5,         // só gasta se o tesouro passar de reserve × custo
  maxCitiesBase: 3,     // cidades que a IA quer na era tribal (+2 por era)
  lawSupport: 0.25,     // apoio mínimo para propor uma lei
  warChancePerMonth: 0.01,
  warReach: 15,         // só ataca países com cidade até esta distância
  maxWarWeeks: 104,     // faz a paz depois de 2 anos
};

const warStart = new Map<string, number>(); // quando cada guerra começou (para fazer a paz)

/** Quanto vale fundar uma cidade no hex i: fertilidade, rios e recursos livres em volta. */
export function siteScore(w: World, i: number) {
  if (!isLand(w.terrain[i]) || w.owner[i]) return -1;
  let s = 0;
  for (const j of hexesInRadius(i, 1, w.W, w.H)) {
    if (w.owner[j] && j !== i) return -1; // encostado em outro país
    s += TERRAINS[w.terrain[j]].fertility + (w.river[j] ? 0.5 : 0) + (w.resource[j] ? 0.7 : 0);
  }
  return s;
}

const dist = (w: World, a: number, b: number) => hexDistance(a % w.W, (a / w.W) | 0, b % w.W, (b / w.W) | 0, w.W);

/** Melhor lugar para cidade nova: até settlerSupplyRange de uma cidade do país, longe o bastante das outras. */
export function bestSite(w: World, e: Economy, country: number) {
  let best = -1, bestS = 0;
  for (const c of e.cities) {
    if (c.country !== country) continue;
    for (const i of hexesInRadius(c.hex, RULES.settlerSupplyRange, w.W, w.H)) {
      if (e.cities.some((k) => dist(w, k.hex, i) < RULES.minCityDistance)) continue;
      if (e.divisions.some((d) => d.kind === "settler" && d.target === i)) continue; // outro grupo já vai pra lá
      const s = siteScore(w, i);
      if (s > bestS) { bestS = s; best = i; }
    }
  }
  return best;
}

function expand(w: World, e: Economy, country: number, era: number) {
  for (const d of e.divisions.filter((x): x is Division => x.kind === "settler" && x.country === country)) {
    if (d.target === null && foundCity(w, e, d.id) === null) continue; // chegou (ou já estava num bom lugar)
    if (d.target !== null || settlerDistance(w, e, d) > RULES.settlerSupplyRange) continue;
    const site = bestSite(w, e, country);
    if (site >= 0) orderMove(w, e, d.id, site);
  }
  const c = e.countries[country - 1], cities = e.cities.filter((k) => k.country === country).length;
  if (cities + settlersOf(e, country) < AI.maxCitiesBase + 2 * era && c.treasury > RULES.settlerCost * AI.reserve) trainSettlers(w, e, country);
}

/** Constrói onde o produto está mais caro no mercado local (preço alto = falta). Uma obra por mês. */
function invest(w: World, e: Economy, country: number) {
  const c = e.countries[country - 1];
  let best: [number, number] | null = null, bestV = 0;
  for (const i of e.owned) {
    if (w.owner[i] !== country || e.occupier[i]) continue;
    const city = e.cities[e.market[i] - 1];
    if (!city) continue;
    for (const b of buildingsFor(w.resource[i], !!e.urban[i])) {
      const def = BUILDINGS[b], tech = techFor(b);
      if (tech && !c.research.known.has(tech)) continue;
      if (def.boosts !== undefined && !e.levels[def.boosts][i]) continue;
      const out = def.industry ? def.industry.outputs[0][0] : w.resource[i];
      const workersOk = w.pop[i] * RULES.hexLaborShare >= def.workers * (e.levels[b][i] + 1) * 0.5;
      const v = (city.market.price[out] * (workersOk ? 1 : 0.2)) / buildCost(e, b, i);
      if (v > bestV) { bestV = v; best = [i, b]; }
    }
  }
  if (best && c.treasury > buildCost(e, best[1], best[0]) * AI.reserve) build(w, e, best[0], best[1]);
}

function legislate(c: Economy["countries"][number]) {
  const p = c.politics;
  if (p.enacting) return;
  let best: [string, string] | null = null, bestS = AI.lawSupport;
  for (const [cat, laws] of Object.entries(LAWS)) for (const l of laws) {
    if (l.era > c.research.era || l.name === p.laws[cat]) continue;
    const s = lawSupport(p, l);
    if (s > bestS) { bestS = s; best = [cat, l.name]; }
  }
  if (best) proposeLaw(p, best[0], best[1], c.research.era);
}

function military(w: World, e: Economy, country: number, rand: () => number) {
  const c = e.countries[country - 1];
  const mine = e.cities.filter((k) => k.country === country);
  const armies = e.divisions.filter((d) => d.kind === "army" && d.country === country);
  // defesa: uma divisão por cidade
  if (armies.length < mine.length && c.manpower >= WAR.divisionSize && c.treasury > WAR.recruitCost * AI.reserve) recruit(w, e, country, mine[armies.length % mine.length].hex);

  const enemies = e.countries.map((_, k) => k + 1).filter((b) => atWar(e, country, b));
  for (const b of enemies) { // paz quando decidiu ou se arrastou
    const key = `${Math.min(country, b)}-${Math.max(country, b)}`, s = warScore(w, e, country, b);
    if (!warStart.has(key)) warStart.set(key, e.week);
    if (Math.abs(s) > 0.3 || e.week - warStart.get(key)! > AI.maxWarWeeks) { makePeace(w, e, country, b); warStart.delete(key); }
  }
  const still = enemies.filter((b) => atWar(e, country, b));
  if (still.length) { // ataque: cada divisão parada vai para a cidade inimiga mais perto
    const targets = e.cities.filter((k) => still.includes(k.country));
    for (const d of armies) {
      if (d.target !== null || !targets.length) continue;
      const t = targets.reduce((a, k) => (dist(w, d.hex, k.hex) < dist(w, d.hex, a.hex) ? k : a));
      orderMove(w, e, d.id, t.hex);
    }
    return;
  }
  // guerra rara: vizinho perto e com menos da metade do exército
  if (!armies.length || rand() > AI.warChancePerMonth) return;
  for (const k of e.cities) {
    if (k.country === country || !mine.some((m) => dist(w, m.hex, k.hex) <= AI.warReach)) continue;
    const theirs = e.divisions.filter((d) => d.kind === "army" && d.country === k.country).length;
    if (theirs * 2 < armies.length) { declareWar(e, country, k.country); return; }
  }
}

/** Uma rodada de decisões do país (chamar uma vez por mês). */
export function runAI(w: World, e: Economy, country: number) {
  const c = e.countries[country - 1];
  if (!e.cities.some((k) => k.country === country)) return;
  const rand = mulberry32(w.seed * 31 + country * 7919 + e.week);
  expand(w, e, country, c.research.era);
  invest(w, e, country);
  legislate(c);
  military(w, e, country, rand);
}
