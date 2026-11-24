import assert from "node:assert/strict";
import { jobsFor, distributeIncome, newPops, politicalWeight, P, POP_TYPES, POP_RULES } from "./pops.ts";
import { BUILDINGS, createEconomy, tick } from "./economy.ts";
import { ERAS } from "./tech.ts";
import { generateWorld } from "./world.ts";

// empregos de toda construção, em toda era, somam 1 e só usam tipos que já existem na era
ERAS.forEach((_, era) => BUILDINGS.forEach((b) => {
  const jobs = jobsFor(b.name, era);
  assert.ok(Math.abs(jobs.reduce((s, [, f]) => s + f, 0) - 1) < 1e-9, `${b.name} na era ${era}`);
  for (const [t] of jobs) assert.ok(POP_TYPES[t].era <= era, `${POP_TYPES[t].name} antes da era em ${b.name}`);
}));
assert.equal(jobsFor("Mina", 0)[1][0], P["Chefes e anciãos"]); // dono tribal
assert.equal(jobsFor("Mina", 1)[1][0], P["Aristocratas"]);

// renda: donos levam ownerShare do PIB de mercado, assalariados o resto por peso de salário, sem salário a subsistência
const p = newPops();
p.count[P["Trabalhadores"]] = 100; p.count[P["Fazendeiros"]] = 100; p.count[P["Aristocratas"]] = 10; p.count[P["Camponeses"]] = 0;
p.count[P["Caçadores-coletores"]] = 50;
distributeIncome(p, 1100, 100, 1);
const market = 1000;
assert.ok(Math.abs(p.income[P["Aristocratas"]] - market * POP_RULES.ownerShare) < 1e-9);
assert.ok(Math.abs(p.income[P["Fazendeiros"]] - 2 * p.income[P["Trabalhadores"]]) < 1e-9); // salário 2 vs 1
assert.equal(p.income[P["Caçadores-coletores"]], 100);
for (const [k, n] of p.count.entries()) if (n) assert.ok(p.qol[k] >= 1 && p.qol[k] <= 50);
assert.equal(politicalWeight(p)[2], 10 * 5);

// no jogo: a soma dos tipos é a população do país, e a era tribal começa com caçadores-coletores
const w = generateWorld(300, 150, 3, 4), e = createEconomy(w);
tick(w, e);
for (const c of e.countries) {
  const total = c.pops.count.reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(total - c.pop) / c.pop < 1e-6, "tipos de POP não somam a população");
  assert.ok(c.pops.count[P["Caçadores-coletores"]] > 0);
  assert.equal(c.pops.count[P["Acadêmicos"]], 0); // sem Escrita
}
console.log("pops ok");
