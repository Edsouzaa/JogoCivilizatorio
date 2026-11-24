import assert from "node:assert/strict";
import { newPolitics, updatePolitics, proposeLaw, advanceLaw, lawSupport, lawOf, GROUPS, LAWS, POLITICS_RULES } from "./politics.ts";
import { newPops, P } from "./pops.ts";
import { ERAS } from "./tech.ts";

const g = (name: string) => GROUPS.findIndex((x) => x.name === name);
const CLASSICAL = ERAS.indexOf("Clássica"), WARS = ERAS.indexOf("Guerras");

// era tribal: caçadores e chefes → Anciãos e Clãs governam; poderes somam 1
const pops = newPops();
pops.count[P["Caçadores-coletores"]] = 1000; pops.count[P["Chefes e anciãos"]] = 20; pops.count[P["Clérigos"]] = 10;
const p = newPolitics();
updatePolitics(p, pops, 0);
assert.ok(Math.abs(p.political.reduce((s, v) => s + v, 0) - 1) < 1e-9);
assert.ok(Math.abs(p.popular.reduce((s, v) => s + v, 0) - 1) < 1e-9);
assert.deepEqual(p.government, [g("Anciãos e Clãs")]);
assert.ok(p.legitimacy > 0.5 && p.legitimacy <= 1);
assert.equal(p.political[g("Latifundiários")], 0); // grupo da Clássica não existe na Tribal

// leis: começam na primeira de cada categoria; não dá para propor lei de era futura
for (const [cat, laws] of Object.entries(LAWS)) assert.equal(lawOf(p, cat).name, laws[0].name);
assert.match(proposeLaw(p, "Governo", "Monarquia", 0)!, /Clássica/);

// na Clássica, com aristocratas fortes, a Monarquia tem apoio e é aprovada com o tempo
pops.count[P["Aristocratas"]] = 400; pops.count[P["Chefes e anciãos"]] = 0;
updatePolitics(p, pops, CLASSICAL);
assert.equal(proposeLaw(p, "Governo", "Monarquia", CLASSICAL), null);
assert.match(proposeLaw(p, "Impostos", "Dízimo", CLASSICAL)!, /votando/); // uma lei por vez
assert.ok(lawSupport(p, LAWS["Governo"].find((l) => l.name === "Monarquia")!) > 0);
let weeks = 0;
while (!advanceLaw(p) && weeks < 500) weeks++;
assert.equal(lawOf(p, "Governo").name, "Monarquia");
assert.ok(weeks > 5 && weeks < 100, `levou ${weeks} semanas`);

// lei sem apoio fica travada
assert.equal(proposeLaw(p, "Governo", "República", CLASSICAL), null);
for (let k = 0; k < 200; k++) advanceLaw(p);
assert.equal(lawOf(p, "Governo").name, "Monarquia");
assert.ok(p.support <= 0);
p.enacting = null;

// partido único: só o partido tem Poder Político; um grupo de fora com mais apoio popular vira rival e tira legitimidade
const many = newPops();
many.count[P["Oficiais"]] = 500;      // Forças Armadas: muito peso político, pouca gente
many.count[P["Camponeses"]] = 20000;  // Povo do Campo / Devotos: muita gente
const sp = newPolitics();
sp.laws["Governo"] = "Partido único";
updatePolitics(sp, many, WARS);
assert.equal(sp.government.length, 1);
assert.equal(sp.political[sp.government[0]], 1);
assert.ok(sp.rival >= 0, "nenhum rival popular");
assert.ok(sp.popular[sp.rival] > sp.popular[sp.government[0]]);
// legitimidade = (Poder Político do governo + Poder Popular do governo) / 2 − penalidade do rival
const expected = (1 + sp.popular[sp.government[0]]) / 2 - POLITICS_RULES.unstableLegitimacy;
assert.ok(Math.abs(sp.legitimacy - expected) < 1e-9, `legitimidade ${sp.legitimacy} ≠ ${expected}`);
console.log("politics ok");
