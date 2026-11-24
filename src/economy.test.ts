import assert from "node:assert/strict";
import {
  priceFactor, createEconomy, tick, build, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel,
  BUILDINGS, GOODS, RULES, MIN_PRICE, MAX_PRICE,
} from "./economy.ts";
import { generateWorld, isLand } from "./world.ts";

assert.equal(priceFactor(10, 10), 1);
assert.equal(priceFactor(0, 100), MAX_PRICE);   // só demanda: +75%
assert.equal(priceFactor(100, 0), MIN_PRICE);   // só oferta: -50%
assert.ok(priceFactor(100, 120) > 1 && priceFactor(120, 100) < 1);

assert.equal(dateLabel(0), "2000 a.C. · semana 1");
assert.equal(dateLabel(2000 * 52), "1 d.C. · semana 1");

const w = generateWorld(300, 150, 1, 4);
const e = createEconomy(w);
assert.equal(e.cities.length, 4);
for (let k = 0; k < 52; k++) tick(w, e);
for (const c of e.countries) assert.ok(c.gdpWeek > 0, "país sem PIB");
for (const city of e.cities) for (let gi = 1; gi < GOODS.length; gi++) {
  const p = city.market.price[gi];
  assert.ok(p >= MIN_PRICE && p <= MAX_PRICE);
}

// todo recurso do mapa tem uma extratora
for (let r = 1; r < 22; r++) assert.ok(buildingsFor(r, false).some((b) => !BUILDINGS[b].industry && BUILDINGS[b].boosts === undefined), `recurso ${r} sem extratora`);

// indústria só em hex urbano
const city = e.cities[0], cap = city.hex, c = e.countries[0];
const forge = BUILDINGS.findIndex((b) => b.name === "Fundição de bronze");
const rural = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i])!;
c.manpower = 1e9;
assert.match(build(w, e, rural, forge)!, /cidade/);

// a fundição transforma cobre + estanho em bronze; sem estanho não produz nada
w.pop[cap] = 1e6;
assert.equal(build(w, e, cap, forge), null);
const m = city.market, COPPER = GOODS.indexOf("Cobre"), TIN = GOODS.indexOf("Estanho"), BRONZE = GOODS.indexOf("Bronze");
const mine = BUILDINGS.findIndex((b) => b.name === "Mina");
const metal = (r: number) => [...e.owned].filter((i) => e.market[i] === 1 && w.resource[i] === r);
for (const i of [...metal(COPPER), ...metal(TIN)]) { e.levels[mine][i] = 0; } // zera minas de cobre/estanho
tick(w, e);
assert.equal(m.supply[BRONZE], 0, "bronze sem insumo");
assert.ok(m.demand[COPPER] > 0 && m.demand[TIN] > 0, "fundição não pediu insumos");
// injeta cobre e estanho de fora: uma mina cheia de cada no próprio hex urbano não é possível, então usamos hexes do mercado
const copperHex = rural, tinHex = [...e.owned].find((i) => e.market[i] === 1 && i !== rural && !e.urban[i])!;
w.resource[copperHex] = COPPER; w.resource[tinHex] = TIN; w.pop[copperHex] = w.pop[tinHex] = 1e5;
e.levels[mine][copperHex] = 10; e.levels[mine][tinHex] = 10; e.producers.add(copperHex); e.producers.add(tinHex);
tick(w, e);
assert.ok(m.supply[BRONZE] > 0, "fundição não produziu bronze");

// colonos: fundar cidade perto, não perto demais, nem longe demais
const W = w.W;
const dist = (a: number, b: number) => Math.hypot((a % W) - (b % W), ((a / W) | 0) - ((b / W) | 0));
const target = [...Array(W * w.H).keys()].find((i) => isLand(w.terrain[i]) && !w.owner[i] && dist(i, cap) >= 6 && dist(i, cap) <= 9);
if (target !== undefined) {
  assert.match(foundCity(w, e, cap, 1)!, /perto/);
  const before = e.cities.length;
  assert.equal(foundCity(w, e, target, 1), null);
  assert.equal(e.cities.length, before + 1);
  assert.equal(w.owner[target], 1);
  assert.equal(c.settlers, RULES.startSettlers - 1);
  assert.ok(e.market[target] === e.cities.length, "cidade nova sem mercado próprio");

  // tamanho transferível entre cidades do mesmo país
  city.size = 3;
  assert.equal(transferSize(w, e, 0, e.cities.length - 1), null);
  assert.equal(city.size, 2);
  assert.equal(e.cities.at(-1)!.size, 2);
}

c.treasury = 1e6;
const s = c.settlers;
assert.equal(trainSettlers(w, e, 1), null);
assert.equal(c.settlers, s + 1);

// manpower e dívida continuam valendo
c.manpower = 0;
assert.match(build(w, e, cap, forge)!, /Manpower/);
c.treasury = 0; c.debt = 0; c.manpower = 1e9;
assert.equal(build(w, e, cap, forge), null);
assert.equal(c.debt, RULES.buildCost * 2);
c.debt = c.gdpWeek * 52 * 10;
tick(w, e);
assert.equal(c.bankruptWeeks, RULES.bankruptWeeks);
console.log("economy ok");
