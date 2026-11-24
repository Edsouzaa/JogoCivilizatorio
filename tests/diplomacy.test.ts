import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, proposePact, tick } from "../src/economy.ts";
import { declareWar, makePeace } from "../src/war.ts";
import { applyCommand } from "../src/commands.ts";
import { relation, addRelation, prestige, stepDiplomacy, DIPLO } from "../src/diplomacy.ts";

const w = generateWorld(200, 100, 4, 3), e = createEconomy(w);
tick(w, e);
assert.equal(relation(e, 1, 2), 0);
// guerra azeda, acordo melhora, tudo volta devagar para 0
declareWar(e, 1, 2); stepDiplomacy(e);
assert.ok(relation(e, 1, 2) <= DIPLO.warMonth + 1e-9);
makePeace(w, e, 1, 2);
// relação ruim trava acordo
addRelation(e, 1, 2, -100);
assert.match(proposePact(e, 1, 2)!, /relações ruins/);
// diplomatas custam pontos administrativos
e.countries[0].admin = 0;
assert.match(applyCommand(w, e, 1, { t: "improve", target: 2 })!, /pontos/);
e.countries[0].admin = 100;
const r0 = relation(e, 1, 2);
assert.equal(applyCommand(w, e, 1, { t: "improve", target: 2 }), null);
assert.equal(relation(e, 1, 2), Math.min(100, r0 + DIPLO.improve));
assert.equal(relation(e, 1, 2), relation(e, 2, 1), "relação é simétrica");
// prestígio: média do mundo ≈ 100; glória de guerra soma
const avg = e.countries.reduce((s, _, k) => s + prestige(e, k + 1), 0) / e.countries.length;
assert.ok(Math.abs(avg - 100) < 5, `média ${avg}`);
const p = prestige(e, 1); e.countries[0].glory = (e.countries[0].glory ?? 0) + 50;
assert.equal(prestige(e, 1), p + 50);
console.log("diplomacy ok");
