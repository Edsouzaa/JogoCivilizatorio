import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, growPopulation, popCap, GOODS, GROWTH } from "../src/economy.ts";

const w = generateWorld(200, 100, 8, 2), e = createEconomy(w), c = e.countries[0];
tick(w, e);
const k = e.cities.findIndex((x) => x.country === 1), m = e.cities[k].market;
const hexes = [...e.owned].filter((i) => e.market[i] === k + 1);
const total = () => hexes.reduce((s, i) => s + w.pop[i], 0);
const FOOD = ["Grãos", "Frutas e vegetais", "Carne e caça"].map((n) => GOODS.indexOf(n));
// sem comida sobrando: não cresce
for (const f of FOOD) m.supply[f] = 0;
let before = total(); growPopulation(w, e);
assert.equal(total(), before, "sem comida, sem crescimento");
// comida farta: cresce ~1%/ano ÷ 13 por mês (mais o bônus das tecnologias conhecidas)
for (const f of FOOD) m.supply[f] = m.pop; // muito mais que o consumo
before = total(); growPopulation(w, e);
assert.ok(total() > before && total() < before * (1 + (GROWTH.yearly * 3) / 13) + hexes.length, "cresce devagar");
// Agricultura acelera
const t0 = total(); growPopulation(w, e); const plain = total() - t0;
c.research.known.add("Agricultura");
const t1 = total(); growPopulation(w, e);
assert.ok(total() - t1 > plain, "Agricultura: crescimento maior");
// nunca passa do teto do hex
const i = hexes[0]; w.pop[i] = popCap(w, e, i) - 0.01;
for (let n = 0; n < 50; n++) growPopulation(w, e);
assert.ok(w.pop[i] <= popCap(w, e, i) + 1e-9);
console.log("growth ok");
