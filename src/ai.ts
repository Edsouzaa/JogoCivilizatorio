import { AIRW } from "./airwar.ts";
import { setWarEconomy, setConversion } from "./wareconomy.ts";
import { orderShip, navalQueueOf, yardTier, SHIP_YARD } from "./naval.ts";
// IA dos países que não têm jogador. Decide uma vez por mês, com regras simples e baratas:
// expandir com colonos, construir onde o mercado paga mais, propor leis com apoio, manter exército de defesa,
// declarar guerra raramente a vizinhos mais fracos e fazer a paz quando a guerra se decidiu ou se arrastou.
import { queueBuild, queueOf, privateShare } from "./construction.ts";
import {
  build, buildCost, buildingsFor, outputOf, buildRoad, foundCity, trainSettlers, techFor, settlersOf, proposePact, hasPact, INFAMY,
  BUILDINGS, RULES, type Economy, type Division,
  SECTOR, BASE_PRICE, GOODS,
} from "./economy.ts";
import { recruit, orderMove, declareWar, makePeace, atWar, warScore, settlerDistance, buildFleet, buildAir, coastOf, WAR, NAVY, AIR } from "./war.ts";
import { LAWS, lawSupport, proposeLaw, lawOf } from "./politics.ts";
import { hexDistance, hexesInRadius, forNeighbors } from "./hex.ts";
import { relation, DIPLO } from "./diplomacy.ts";
import { proposeSubject } from "./subjects.ts";
import { personality, PERSONALITIES } from "./claims.ts";
import { rulerOf } from "./characters.ts";
/** Quanto o governante empurra para a guerra (personalidade e traços); 1 = neutro. */
export function rulerWar(e: Economy, country: number) {
  const r = rulerOf(e, country); if (!r) return 1;
  const p = ({ Expansionista: 1.8, Agressivo: 1.5, "Implacável": 1.4, Audacioso: 1.3, Impulsivo: 1.3, Arrogante: 1.2, Conciliador: 0.5, Prudente: 0.7, Isolacionista: 0.6, Humilde: 0.8, Generoso: 0.8 } as Record<string, number>)[r.personality ?? ""] ?? 1;
  return p * (r.traits.includes("Pacifista") ? 0.4 : 1) * (r.traits.includes("Guerreiro") ? 1.3 : 1);
}
import { anchors, pathDistance, buildOutpost } from "./expansion.ts";
import { bestUnit, bestCraft, craftsFor, SHIPS, PLANES } from "./units.ts";
import { TERRAINS, isLand, mulberry32, type World } from "./world.ts";

export const AI = {
  subjectChancePerMonth: 0.05, // chance de propor dependência a um vizinho
  reserve: 1.5,         // só gasta se o tesouro passar de reserve × custo
  upkeepOk: 0.95,       // só constrói se pagou pelo menos isto da manutenção na última semana
  totalWarRatio: 1.5,   // guerra total quando um inimigo tem 1,5× o PIB
  minMargin: 0.15,      // indústria só se o produto valer 15% a mais que os insumos no mercado local
  guidedPrice: 1.1,     // investimento orientado: só onde o preço local passa disto (falta)
  publicQueue: 2,       // obras públicas na fila ao mesmo tempo...
  queuePerTreasury: 2000, // ...mais 1 a cada tanto no tesouro...
  publicQueueMax: 20,   // ...até isto
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
      if (e.cities.some((k) => dist(w, k.hex, i) < 4)) continue; // IA espaça mais que o mínimo da regra (cidade a 1 hex é escolha do jogador)
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
  if (cities + settlersOf(e, country) < AI.maxCitiesBase + 2 * era && c.treasury > RULES.settlerCost * AI.reserve) trainSettlers(w, e, country);
}

/** Constrói onde o produto está mais caro no mercado local (preço alto = falta). Uma obra por mês. */
/** Melhor obra do país agora: onde o produto está mais caro por dinheiro gasto. [hex, construção] ou null. */
function bestInvestment(w: World, e: Economy, country: number, priv = false): [number, number] | null {
  const c = e.countries[country - 1], policy = priv ? lawOf(c.politics, "Investimento").policy : undefined;
  // retorno real: lucro ÷ receita dos edifícios do mesmo tipo no país (firms.ts); sem dados, neutro
  const prof = new Float64Array(BUILDINGS.length), rev = new Float64Array(BUILDINGS.length);
  if (e.ledgers) for (const [key, l] of e.ledgers) { const [h, b] = key.split(":").map(Number); if (w.owner[h] === country) { prof[b] += l.profit; rev[b] += l.rev; } }
  let best: [number, number] | null = null, bestV = 0;
  for (const i of e.owned) {
    if (w.owner[i] !== country || e.occupier[i]) continue;
    const city = e.cities[e.market[i] - 1];
    if (!city) continue;
    for (const b of buildingsFor(w.resource[i], !!e.urban[i], w.resource2[i])) {
      const def = BUILDINGS[b], tech = techFor(b);
      if (tech && !c.research.known.has(tech)) continue;
      if (def.boosts !== undefined && !e.levels[def.boosts][i]) continue;
      if ((def.industry && !def.industry.outputs.length) || def.depot) continue; // sem produto (administração, construção, depósito): decidido à parte
      if (policy === "restrito" && def.industry) continue; // lei: indústria é do Estado
      // indústria só onde os insumos existem no mercado da cidade (oferta da semana cobre metade do que o novo nível pede)
      if (def.industry && !def.industry.inputs.every(([gi, q]) => city.market.supply[gi] - city.market.used[gi] >= q * 0.5)) continue;
      const out = def.industry ? def.industry.outputs[0][0] : outputOf(w, b, i);
      const workersOk = w.pop[i] * RULES.hexLaborShare >= def.workers * (e.levels[b][i] + 1) * 0.5;
      if (policy === "orientado" && city.market.price[out] < AI.guidedPrice) continue; // lei: só onde falta mercadoria
      const margin = rev[b] > 0 ? Math.max(-0.9, prof[b] / rev[b]) : 0;
      // indústria: margem por nível com os preços locais (produto − insumos); sem margem, não vale
      const val = (list: [number, number][]) => list.reduce((s, [gi, q]) => s + q * BASE_PRICE[gi] * city.market.price[gi], 0);
      const unit = def.industry ? (val(def.industry.outputs) - val(def.industry.inputs)) / Math.max(1e-9, val(def.industry.outputs)) : 1;
      if (unit <= AI.minMargin) continue;
      const v = (city.market.price[out] * unit * (workersOk ? 1 : 0.2) * (1 + margin)) / buildCost(e, b, i);
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
    if ((c.upkeepPaid ?? 1) < AI.upkeepOk) return; // manutenção atrasada: não aumenta o que já não consegue pagar
    if (!best || c.treasury < buildCost(e, best[1], best[0]) * AI.reserve + RULES.settlerCost || queueBuild(w, e, best[0], best[1])) return;
  }
}

/** Uma vez por mês, todo país (jogador também): os investidores privados constroem com o fundo deles. */
export function privateInvest(w: World, e: Economy) {
  e.countries.forEach((c, ci) => {
    for (let n = 0; n < 3; n++) { // até 3 obras novas por mês, se o fundo cobre o que já está na fila e a nova
      const queued = queueOf(e, ci + 1).filter((p) => p.priv);
      if (queued.length >= AI.privateQueue) return;
      if (privateShare(e, ci + 1) <= 0) return; // lei sem fila privada (economia planejada, subsistência)
      const best = bestInvestment(w, e, ci + 1, true);
      if (!best) return;
      const owed = queued.reduce((s, p) => s + p.cost - p.paid, 0) + buildCost(e, best[1], best[0]);
      if ((c.investPool ?? 0) < owed) return;
      if (queueBuild(w, e, best[0], best[1], true)) return;
    }
  });
}

function legislate(c: Economy["countries"][number], reformer = 1) {
  const p = c.politics;
  if (p.enacting) return;
  let best: [string, string] | null = null, bestS = AI.lawSupport / reformer; // governante reformista tenta com menos apoio
  for (const [cat, laws] of Object.entries(LAWS)) for (const l of laws) {
    if (l.era > c.research.era || (l.tech && !c.research.known.has(l.tech)) || l.name === p.laws[cat]) continue;
    const s = lawSupport(p, l);
    if (s > bestS) { bestS = s; best = [cat, l.name]; }
  }
  if (best) proposeLaw(p, best[0], best[1], c.research.era, c.research.known);
}

function military(w: World, e: Economy, country: number, rand: () => number) {
  const c = e.countries[country - 1];
  // economia de guerra: mobiliza em guerra (total se o inimigo for mais forte), desmobiliza na paz
  const foes = [...e.wars].filter((k) => k.split("-").includes(String(country))).map((k) => +k.split("-").find((x) => x !== String(country))!);
  const want = !foes.length ? 0 : foes.some((k) => e.countries[k - 1].gdpWeek > c.gdpWeek * AI.totalWarRatio) ? 2 : 1;
  if ((c.warEconomy ?? 0) !== want) { setWarEconomy(e, country, want, foes.length > 0); setConversion(e, country, want > 0); }
  const mine = e.cities.filter((k) => k.country === country);
  const armies = e.divisions.filter((d) => d.kind === "army" && d.country === country);
  // defesa: uma divisão por cidade
  if (armies.length < mine.length && c.manpower >= WAR.divisionSize && c.treasury > WAR.recruitCost * AI.reserve) recruit(w, e, country, mine[armies.length % mine.length].hex, bestUnit(c.research.known).name);

  // logística: exército com fome em guerra → depósito no hex do país mais perto dele (uma obra por vez)
  const hungry = e.divisions.find((d) => d.kind === "army" && d.country === country && (d.supply?.level ?? 1) < 0.5);
  const depot = BUILDINGS.findIndex((b) => b.name === "Depósito de suprimentos");
  if (hungry && foes.length && !queueOf(e, country).some((p) => p.b === depot)) {
    let best = -1, bd = Infinity;
    for (const i of e.owned) if (w.owner[i] === country && isLand(w.terrain[i])) { const dd = hexDistance(i % w.W, (i / w.W) | 0, hungry.hex % w.W, (hungry.hex / w.W) | 0, w.W); if (dd < bd) { bd = dd; best = i; } }
    if (best >= 0) queueBuild(w, e, best, depot);
  }

  // marinha: uma frota se tiver litoral e a tecnologia
  const port = mine.flatMap((k) => k.urban).find((j) => coastOf(w, j) >= 0);
  if (port !== undefined && c.research.known.has(NAVY.tech) && !e.divisions.some((d) => d.kind === "fleet" && d.country === country) &&
      !navalQueueOf(e, country).length && c.treasury > NAVY.cost * AI.reserve && c.manpower >= NAVY.sailors) {
    const city = e.market[port] - 1, ship = craftsFor(SHIPS, c.research.known).filter((s) => (SHIP_YARD[s.name] ?? 1) <= Math.max(1, yardTier(e, city))).reduce((a, s) => (s.power / s.cost > a.power / a.cost ? s : a), SHIPS[0]);
    // sem estaleiro: constrói a doca na cidade do porto (uma obra por vez); com estaleiro: encomenda o melhor navio que ele faz
    if (!yardTier(e, city)) { const dock = BUILDINGS.findIndex((b) => b.name === "Doca"); if (!queueOf(e, country).some((p) => p.b === dock)) queueBuild(w, e, port, dock); }
    else orderShip(w, e, country, city, ship.name);
  }

  // força aérea: um esquadrão a cada 3 cidades
  const wings = e.divisions.filter((d) => d.kind === "air" && d.country === country);
  if (c.research.known.has(AIR.tech) && wings.length < Math.ceil(mine.length / 3) && c.treasury > AIR.cost * AI.reserve && c.manpower >= AIR.pilots && mine[0].market.supply[GOODS.indexOf("Combustível")] > AIRW.fuel * (wings.length + 1)) buildAir(w, e, country, mine[0].hex, bestCraft(PLANES, c.research.known).name); // sem combustível, avião não voa (airwar.ts)

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
  if (!armies.length || rand() > AI.warChancePerMonth * pers.war * rulerWar(e, country)) return; // o governante também pesa
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
  { const r = rulerOf(e, country); legislate(c, r && (r.personality === "Reformista" || r.traits.includes("Reformador")) ? 2 : r?.personality === "Conservador" ? 0.5 : 1); }
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
