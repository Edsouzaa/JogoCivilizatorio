import assert from "node:assert/strict";
import { newPops, updateLoyalty, loyaltyTarget, averageLoyalty, P, POP_RULES } from "./pops.ts";
import { createEconomy, tick, migrate } from "./economy.ts";
import { generateWorld } from "./world.ts";

// alvo: QV 25 e legitimidade 0,5 = 50; QV e legitimidade altas sobem, baixas descem
assert.equal(loyaltyTarget(25, 0.5), 50);
assert.ok(loyaltyTarget(40, 0.8) > 50 && loyaltyTarget(5, 0.2) < 30);

// lealdade anda aos poucos; QV muito baixa por muito tempo vira radical
const p = newPops();
p.count[P["Camponeses"]] = 900; p.qol[P["Camponeses"]] = 2;
p.count[P["Clérigos"]] = 100; p.qol[P["Clérigos"]] = 40;
assert.equal(updateLoyalty(p, 0.5), 0); // ainda começa em 50: ninguém radical
assert.ok(p.loyalty[P["Camponeses"]] < POP_RULES.loyaltyStart && p.loyalty[P["Clérigos"]] > POP_RULES.loyaltyStart);
let radicals = 0;
for (let k = 0; k < 200; k++) radicals = updateLoyalty(p, 0.5);
assert.ok(Math.abs(radicals - 0.9) < 1e-9, `radicais ${radicals}`);
assert.ok(averageLoyalty(p) < 35) // 90% radicais puxam a média para baixo;

// migração: do país de QV baixa para o de QV alta, sem criar nem perder gente
const w = generateWorld(300, 150, 1, 3), e = createEconomy(w);
tick(w, e);
const [poor, rich] = e.countries;
const lower = ["Caçadores-coletores", "Camponeses", "Trabalhadores"].map((n) => P[n]);
for (const k of lower) { poor.pops.qol[k] = 2; rich.pops.qol[k] = 45; }
e.countries.slice(2).forEach((c) => lower.forEach((k) => { c.pops.qol[k] = 1; }));
const total = () => w.pop.reduce((s, v) => s + v, 0);
const popOf = (country: number) => [...e.owned].filter((i) => w.owner[i] === country).reduce((s, i) => s + w.pop[i], 0);
const before = total(), poorBefore = popOf(1), richBefore = popOf(2);
migrate(w, e);
assert.ok(Math.abs(total() - before) / before < 1e-6, "migração criou ou perdeu gente");
assert.ok(popOf(1) < poorBefore && popOf(2) > richBefore);
assert.ok(poor.migration < 0 && rich.migration > 0);
assert.ok(Math.abs(e.countries.reduce((s, c) => s + c.migration, 0)) < 1e-6 * before, "saldos migratórios não somam zero");
console.log("loyalty ok");

// agitação das tecnologias: positiva baixa a lealdade, negativa (ex.: Medicina moderna) sobe
{
  const mk = () => { const q = newPops(); q.count[P["Camponeses"]] = 100; q.qol[P["Camponeses"]] = 25; return q; };
  const calm = mk(), base = mk(), agitated = mk();
  for (let k = 0; k < 100; k++) { updateLoyalty(calm, 0.5, -5); updateLoyalty(base, 0.5); updateLoyalty(agitated, 0.5, 5); }
  const l = (q: ReturnType<typeof mk>) => q.loyalty[P["Camponeses"]];
  assert.ok(l(calm) > l(base) && l(base) > l(agitated), `${l(calm)} ${l(base)} ${l(agitated)}`);
}
console.log("unrest ok");
