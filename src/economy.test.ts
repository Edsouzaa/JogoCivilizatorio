import assert from "node:assert/strict";
import { priceFactor, createEconomy, tick, build, buildingsFor, dateLabel, BUILDINGS, RULES, MIN_PRICE, MAX_PRICE } from "./economy.ts";
import { generateWorld } from "./world.ts";

assert.equal(priceFactor(10, 10), 1);
assert.equal(priceFactor(0, 100), MAX_PRICE);   // só demanda: +75%
assert.equal(priceFactor(100, 0), MIN_PRICE);   // só oferta: -50%
assert.ok(priceFactor(100, 120) > 1 && priceFactor(120, 100) < 1);

assert.equal(dateLabel(0), "2000 a.C. · semana 1");
assert.equal(dateLabel(2000 * 52), "1 d.C. · semana 1");

const w = generateWorld(200, 100, 1, 4);
const e = createEconomy(w);
for (let k = 0; k < 52; k++) tick(w, e);
for (const c of e.countries) {
  assert.ok(c.gdpWeek > 0, "país sem PIB");
  for (let g = 1; g < c.price.length; g++) assert.ok(c.price[g] >= MIN_PRICE && c.price[g] <= MAX_PRICE);
}

// todo recurso do mapa tem uma extratora
for (let r = 1; r < 22; r++) assert.ok(buildingsFor(r).some((b) => BUILDINGS[b].boosts === undefined), `recurso ${r} sem extratora`);

// hex povoado, para a produção não ficar limitada por trabalhadores
const i = e.producers[0], c = e.countries[w.owner[i] - 1];
w.pop[i] = 1e6;
const [extractor, booster] = [buildingsFor(w.resource[i]).find((b) => BUILDINGS[b].boosts === undefined)!, buildingsFor(w.resource[i]).find((b) => BUILDINGS[b].boosts !== undefined)];

// manpower: construir consome; sem manpower não constrói
c.manpower = BUILDINGS[extractor].workers;
assert.equal(build(w, e, i, extractor), null);
assert.equal(c.manpower, 0);
assert.match(build(w, e, i, extractor)!, /Manpower/);

// melhoria multiplica a produção
if (booster !== undefined) {
  tick(w, e);
  const before = c.supply[w.resource[i]];
  c.manpower = 1e9;
  assert.equal(build(w, e, i, booster), null);
  tick(w, e);
  assert.ok(c.supply[w.resource[i]] > before, "melhoria não aumentou produção");
}

// construir sem dinheiro vira dívida; dívida enorme leva à falência
c.treasury = 0; c.debt = 0; c.manpower = 1e9;
assert.equal(build(w, e, i, extractor), null);
assert.equal(c.debt, RULES.buildCost * 3); // nível 2 → 3
c.debt = c.gdpWeek * 52 * 10;
tick(w, e);
assert.equal(c.bankruptWeeks, RULES.bankruptWeeks);
console.log("economy ok");
