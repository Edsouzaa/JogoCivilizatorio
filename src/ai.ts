// IA dos países que não têm jogador. Decide uma vez por mês, com regras simples e baratas:
// expandir com colonos, construir onde o mercado paga mais, propor leis com apoio, manter exército de defesa,
// declarar guerra raramente a vizinhos mais fracos e fazer a paz quando a guerra se decidiu ou se arrastou.
import { queueBuild, queueOf } from "./construction.ts";
import {
  build, buildCost, buildingsFor, outputOf, urbanize, urbanCost, buildRoad, foundCity, trainSettlers, techFor, settlersOf, proposePact, hasPact, INFAMY,
  BUILDINGS, RULES, type Economy, type Division,
  SECTOR,
} from "./economy.ts";
import { recruit, orderMove, declareWar, makePeace, atWar, warScore, settlerDistance, buildFleet, buildAir, coastOf, WAR, NAVY, AIR } from "./war.ts";
import { LAWS, lawSupport, proposeLaw } from "./politics.ts";
import { hexDistance, hexesInRadius, forNeighbors } from "./hex.ts";
import { relation, DIPLO } from "./diplomacy.ts";
import { proposeSubject } from "./subjects.ts";
import { personality, PERSONALITIES } from "./claims.ts";
import { anchors, pathDistance, buildOutpost } from "./expansion.ts";
import { bestUnit, bestCraft, SHIPS, PLANES } from "./units.ts";
import { TERRAINS, isLand, mulberry32, type World } from "./world.ts";

export const AI = {
  subjectChancePerMonth: 0.05, // chance de propor dependência a um vizinho
  reserve: 1.5,         // só gasta se o tesouro passar de reserve × custo
  publicQueue: 2,       // obras públicas na fila ao mesmo tempo...
  queuePerTreasury: 2000, // ...mais 1 a cada tanto no tesouro...
  publicQueueMax: 8,    // ...até isto
  privateQueue: 3,      // obras privadas na fila ao mesmo tempo
  maxCitiesBase: 3,     // cidades que a IA quer na era tribal (+2 por era)
  lawSupport: 0.25,     // apoio mínimo para propor uma lei
  warChancePerMonth: 0.01,
  warReach: 15,         // só ataca países com cidade até esta distância
  pactChancePerMonth: 0.05, // chance de propor acordo comercial a um vizinho
  coalitionChancePerMonth: 0.05, // chance de atacar vizinho com infâmia alta
  maxWarWeeks: 104,     // faz a paz depois de 2 anos
};


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
  for (const a of anchors(e, country)) { // parte das cidades e dos postos avançados
    for (const i of hexesInRadius(a, RULES.settlerSupplyRange, w.W, w.H)) {
      const s = siteScore(w, i);
      if (s <= bestS) continue; // nota primeiro: as checagens abaixo percorrem todas as cidades
      if (e.cities.some((k) => dist(w, k.hex, i) < RULES.minCityDistance)) continue;
      if (e.divisions.some((d) => d.kind === "settler" && d.target === i)) continue; // outro grupo já vai pra lá
      bestS = s; best = i;
    }
  }
  return best;
}

/** Alguma IA fundou cidade nesta rodada: sim.ts recalcula os mercados uma vez no fim. */
export let founded = false;
export const clearFounded = () => { const f = founded; founded = false; return f; };

function expand(w: World, e: Economy, country: number, era: number) {
  for (const d of e.divisions.filter((x): x is Division => x.kind === "settler" && x.country === country)) {
    if (d.target === null) {
      const err = foundCity(w, e, d.id, true);
      if (err === null) { founded = true; continue; } // chegou (ou já estava num bom lugar)
      // capacidade esgotada: em vez de esperar parado, vira posto avançado (base para a próxima cidade)
      if (/Capacidade/.test(err) && pathDistance(w, e, country, d.hex) >= 3 && buildOutpost(w, e, d.id) === null) continue;
    }
    if (d.target !== null || settlerDistance(w, e, d) > RULES.settlerSupplyRange) continue;
    const site = bestSite(w, e, country);
    if (site >= 0) orderMove(w, e, d.id, site);
  }
  const c = e.countries[country - 1], cities = e.cities.filter((k) => k.country === country).length;
  e.cities.forEach((city, k) => { // estrada: quando sobra dinheiro
    if (city.country === country && c.treasury > RULES.roadCost * ((city.road ?? 0) + 1) * AI.reserve * 2) buildRoad(e, k);
  });
  e.cities.forEach((city, k) => { // cidade cheia: compra o vizinho mais povoado como centro urbano novo
    if (city.country !== country || c.treasury < urbanCost(city) * AI.reserve) return;
    if (city.urban.reduce((s, j) => s + w.pop[j], 0) < city.size * RULES.cityGrowthPop) return;
    let best = -1;
    for (const u of city.urban) forNeighbors(u % w.W, (u / w.W) | 0, w.W, w.H, (j) => {
      if (w.owner[j] === country && !e.urban[j] && isLand(w.terrain[j]) && (best < 0 || w.pop[j] > w.pop[best])) best = j;
    });
    if (best >= 0) urbanize(w, e, k, best);
  });
  if (cities + settlersOf(e, country) < AI.maxCitiesBase + 2 * era && c.treasury > RULES.settlerCost * AI.reserve) trainSettlers(w, e, country);
}

/** Constrói onde o produto está mais caro no mercado local (preço alto = falta). Uma obra por mês. */
/** Melhor obra do país agora: onde o produto está mais caro por dinheiro gasto. [hex, construção] ou null. */
function bestInvestment(w: World, e: Economy, country: number): [number, number] | null {
  const c = e.countries[country - 1];
  let best: [number, number] | null = null, bestV = 0;
  for (const i of e.owned) {
    if (w.owner[i] !== country || e.occupier[i]) continue;
    const city = e.cities[e.market[i] - 1];
    if (!city) continue;
    for (const b of buildingsFor(w.resource[i], !!e.urban[i], w.resource2[i])) {
      const def = BUILDINGS[b], tech = techFor(b);
      if (tech && !c.research.known.has(tech)) continue;
      if (def.boosts !== undefined && !e.levels[def.boosts][i]) continue;
      if (def.industry && !def.industry.outputs.length) continue; // sem produto (administração, construção): decidido à parte
      const out = def.industry ? def.industry.outputs[0][0] : outputOf(w, b, i);
      const workersOk = w.pop[i] * RULES.hexLaborShare >= def.workers * (e.levels[b][i] + 1) * 0.5;
      const v = (city.market.price[out] * (workersOk ? 1 : 0.2)) / buildCost(e, b, i);
      if (v > bestV) { bestV = v; best = [i, b]; }
    }
  }
  return best;
}

function invest(w: World, e: Economy, country: number) {
  const c = e.countries[country - 1], mine = queueOf(e, country);
  // obras paradas por falta de capacidade: amplia o setor de construção na capital
  const cap = e.cities.find((k) => k.country === country);
  if (cap && mine.some((p) => p.waiting === "sem capacidade") && !mine.some((p) => p.b === SECTOR) && c.treasury > buildCost(e, SECTOR, cap.hex) * AI.reserve) queueBuild(w, e, cap.hex, SECTOR);
  const room = Math.min(AI.publicQueueMax, AI.publicQueue + Math.floor(c.treasury / AI.queuePerTreasury)) - mine.filter((p) => !p.priv).length; // fila cresce com o tesouro
  for (let n = 0; n < room; n++) {
    const best = bestInvestment(w, e, country);
    if (!best || c.treasury < buildCost(e, best[1], best[0]) * AI.reserve + RULES.settlerCost || queueBuild(w, e, best[0], best[1])) return;
  }
}

/** Uma vez por mês, todo país (jogador também): os investidores privados constroem com o fundo deles. */
export function privateInvest(w: World, e: Economy) {
  e.countries.forEach((c, ci) => {
    for (let n = 0; n < 3; n++) { // até 3 obras novas por mês, se o fundo cobre o que já está na fila e a nova
      const queued = queueOf(e, ci + 1).filter((p) => p.priv);
      if (queued.length >= AI.privateQueue) return;
      const best = bestInvestment(w, e, ci + 1);
      if (!best) return;
      const owed = queued.reduce((s, p) => s + p.cost - p.paid, 0) + buildCost(e, best[1], best[0]);
      if ((c.investPool ?? 0) < owed) return;
      if (queueBuild(w, e, best[0], best[1], true)) return;
    }
  });
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
  if (armies.length < mine.length && c.manpower >= WAR.divisionSize && c.treasury > WAR.recruitCost * AI.reserve) recruit(w, e, country, mine[armies.length % mine.length].hex, bestUnit(c.research.known).name);

  // marinha: uma frota se tiver litoral e a tecnologia
  const port = mine.flatMap((k) => k.urban).find((j) => coastOf(w, j) >= 0);
  if (port !== undefined && c.research.known.has(NAVY.tech) && !e.divisions.some((d) => d.kind === "fleet" && d.country === country) &&
      c.treasury > NAVY.cost * AI.reserve && c.manpower >= NAVY.sailors) buildFleet(w, e, country, port, bestCraft(SHIPS, c.research.known).name);

  // força aérea: um esquadrão a cada 3 cidades
  const wings = e.divisions.filter((d) => d.kind === "air" && d.country === country);
  if (c.research.known.has(AIR.tech) && wings.length < Math.ceil(mine.length / 3) && c.treasury > AIR.cost * AI.reserve && c.manpower >= AIR.pilots) buildAir(w, e, country, mine[0].hex, bestCraft(PLANES, c.research.known).name);

  const enemies = e.countries.map((_, k) => k + 1).filter((b) => atWar(e, country, b));
  for (const b of enemies) { // paz quando decidiu ou se arrastou
    const key = `${Math.min(country, b)}-${Math.max(country, b)}`, s = warScore(w, e, country, b);
    e.aiWarStart[key] ??= e.week; // na economia: vai no save e na foto do multiplayer
    if (Math.abs(s) > 0.3 || e.week - e.aiWarStart[key] > AI.maxWarWeeks) { makePeace(w, e, country, b); delete e.aiWarStart[key]; }
  }
  const still = enemies.filter((b) => atWar(e, country, b));
  if (still.length) { // ataque: cada divisão parada vai para a cidade inimiga mais perto
    const targets = e.cities.filter((k) => still.includes(k.country));
    // esquadrões parados cobrem a cidade inimiga mais perto ao alcance
    for (const d of wings) {
      if (d.target !== null) continue;
      const t = targets.filter((k) => dist(w, d.hex, k.hex) <= AIR.range).sort((x, y) => dist(w, d.hex, x.hex) - dist(w, d.hex, y.hex))[0];
      if (t) orderMove(w, e, d.id, t.hex);
    }
    // frotas paradas vão bloquear o porto inimigo mais perto
    const seas = targets.flatMap((k) => k.urban.map((j) => coastOf(w, j))).filter((s) => s >= 0);
    for (const f of e.divisions) {
      if (f.kind !== "fleet" || f.country !== country || f.target !== null || !seas.length) continue;
      const t = seas.reduce((a, s) => (dist(w, f.hex, s) < dist(w, f.hex, a) ? s : a));
      if (w.seaZone[t] === w.seaZone[f.hex]) continue; // já está bloqueando essa zona
      orderMove(w, e, f.id, t);
    }
    for (const d of armies) {
      if (d.target !== null || !targets.length) continue;
      const t = targets.reduce((a, k) => (dist(w, d.hex, k.hex) < dist(w, d.hex, a.hex) ? k : a));
      orderMove(w, e, d.id, t.hex);
    }
    return;
  }
  // guerra rara: vizinho perto e com menos da metade do exército
  // coalizão: vizinho com infâmia alta vira alvo mesmo sendo mais forte
  if (armies.length && rand() < AI.coalitionChancePerMonth) for (const k of e.cities) {
    if (k.country === country || e.countries[k.country - 1].infamy < INFAMY.coalition) continue;
    if (mine.some((m) => dist(w, m.hex, k.hex) <= AI.warReach * 2)) { declareWar(e, country, k.country); return; }
  }
  const pers = PERSONALITIES[personality(w, e, country)];
  if (!armies.length || rand() > AI.warChancePerMonth * pers.war) return;
  const claimed = new Set((e.claims ?? []).filter((x) => x.country === country).map((x) => e.cities[x.city]?.country));
  for (const k of [...e.cities].sort((a, b) => +claimed.has(b.country) - +claimed.has(a.country))) { // reivindicados primeiro
    if (k.country === country || relation(e, country, k.country) > DIPLO.warMax || !mine.some((m) => dist(w, m.hex, k.hex) <= AI.warReach)) continue;
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
  if (rand() < AI.pactChancePerMonth * PERSONALITIES[personality(w, e, country)].pact) { // acordo comercial com o vizinho mais perto que ainda não tem
    const mine = e.cities.filter((k) => k.country === country);
    let best = 0, bestD = RULES.foreignRange;
    for (const k of e.cities) {
      if (k.country === country || hasPact(e, country, k.country) || atWar(e, country, k.country)) continue;
      for (const m of mine) { const d = dist(w, m.hex, k.hex); if (d <= bestD) { bestD = d; best = k.country; } }
    }
    if (best) proposePact(e, country, best);
  }
  // dependências: país forte tenta pôr um vizinho (da IA) sob a sua asa; quem aceita é decidido pelas regras
  if (!e.subjects?.[country] && rand() < AI.subjectChancePerMonth * PERSONALITIES[personality(w, e, country)].subject)
    for (const k of e.contacts?.[country - 1] ?? []) if (!e.humans.includes(k) && proposeSubject(e, country, k, relation(e, country, k) >= 40 ? "Vassalo" : "Tributário") === null) break;
  military(w, e, country, rand);
}
