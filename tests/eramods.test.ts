import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { econ, debtCap, spend, ERA_ECON } from "../src/eramods.ts";

const w = generateWorld(200, 100, 4, 2), e = createEconomy(w), c = e.countries[0];
// a era vem da pesquisa: tribal arrecada e monetiza menos que a clássica
const tribal = econ(c, "tax");
assert.equal(tribal, ERA_ECON[0].tax);
c.research.era = 1;
assert.ok(econ(c, "tax") > tribal && econ(c, "monetization") > ERA_ECON[0].monetization);
c.research.era = 0;
// tecnologia melhora um pouco, sem tirar o limite da era
c.research.known.add("Moeda");
assert.ok(econ(c, "monetization") > ERA_ECON[0].monetization && econ(c, "monetization") < ERA_ECON[3].monetization);
// manutenção: melhorar = diminuir, com piso
c.research.known.add("Contabilidade de partidas dobradas");
assert.ok(econ(c, "upkeep") < ERA_ECON[0].upkeep && econ(c, "upkeep") >= 0.8);
// sem crédito na era tribal: gastar além do tesouro não cria dívida
c.research.known.clear(); c.gdpWeek = 100;
assert.equal(debtCap(c), 0);
c.treasury = 10; c.debt = 0;
assert.equal(spend(c, 40), 0.25);
assert.equal(c.treasury, 0); assert.equal(c.debt, 0);
// na era clássica há algum crédito
c.research.era = 1; c.treasury = 0;
assert.ok(debtCap(c) > 0 && spend(c, 10) === 1 && c.debt === 10);
c.debt = 0; c.research.era = 0;
// tesouro tribal não cria dívida com a manutenção
c.treasury = 0;
for (let k = 0; k < 20; k++) tick(w, e);
assert.equal(c.debt, 0, "tribal sem crédito não se endivida");
assert.ok((c.upkeepPaid ?? 1) <= 1);
console.log("era economy ok");
