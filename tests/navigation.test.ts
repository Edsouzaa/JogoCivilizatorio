import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, riverOpen } from "../src/economy.ts";
import { riverMouths, toggleRiver, stepRivers } from "../src/navigation.ts";
import { relation } from "../src/diplomacy.ts";

// disputa de navegação: só quem tem a foz fecha o rio; as cidades dos outros nele perdem o porto fluvial
const w = generateWorld(300, 150, 3, 4), e = createEconomy(w);
const r = w.rivers!.findIndex((_, k) => riverMouths(w, k + 1).length > 0) + 1;
assert.ok(r > 0, "nenhum rio com foz");
for (const m of riverMouths(w, r)) w.owner[m] = 1;
const a = e.cities.find((c) => c.country === 1)!, b = e.cities.find((c) => c.country === 2)!;
for (const c of [a, b]) { c.port = true; c.river = r; }
assert.ok(riverOpen(e, b));
assert.match(toggleRiver(w, e, 2, r)!, /foz/);
assert.equal(toggleRiver(w, e, 1, r), null);
assert.ok(!riverOpen(e, b), "rio fechado: o estrangeiro perde o porto fluvial");
assert.ok(riverOpen(e, a), "quem fechou continua navegando");
const before = relation(e, 2, 1);
stepRivers(w, e);
assert.ok(relation(e, 2, 1) < before, "o prejudicado gosta menos de quem fechou");
// perdeu a foz: o rio reabre sozinho
for (const m of riverMouths(w, r)) w.owner[m] = 0;
stepRivers(w, e);
assert.ok(riverOpen(e, b));
// reabrir pelo dono
for (const m of riverMouths(w, r)) w.owner[m] = 1;
toggleRiver(w, e, 1, r); assert.equal(toggleRiver(w, e, 1, r), null); assert.ok(riverOpen(e, b));
console.log("navigation ok");
