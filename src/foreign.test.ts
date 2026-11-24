import assert from "node:assert/strict";
import { createEconomy, tick, proposePact, hasPact, cancelPact, RULES, GOODS, BUILDINGS } from "./economy.ts";
import { declareWar } from "./war.ts";
import { generateWorld } from "./world.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
RULES.foreignRange = 10000; // no teste, qualquer distância serve
const COPPER = GOODS.indexOf("Cobre"), mine = BUILDINGS.findIndex((b) => b.name === "Mina");
// A (país 1) tem muito cobre; B (país 2) não produz nenhum
const hexA = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i] && w.terrain[i] !== 0)!;
w.resource[hexA] = COPPER; w.pop[hexA] = 1e4; e.levels[mine][hexA] = 50; e.producers.add(hexA);
for (const i of e.owned) if (w.owner[i] === 2 && w.resource[i] === COPPER) w.resource[i] = 0;
const mA = e.cities.find((k) => k.country === 1)!.market, mB = e.cities.find((k) => k.country === 2)!.market;

// sem acordo, nada atravessa a fronteira
tick(w, e);
assert.equal(mB.trade[COPPER], 0);
assert.equal(e.countries[1].imports, 0);

// com acordo: A exporta, B importa e cobra tarifa
assert.equal(proposePact(e, 1, 2), null);
assert.ok(hasPact(e, 2, 1));
assert.match(proposePact(e, 1, 2)!, /Já existe/);
tick(w, e);
assert.ok(mA.trade[COPPER] < 0 && mB.trade[COPPER] > 0, "cobre não atravessou o acordo");
assert.ok(e.countries[0].exports > 0 && e.countries[1].imports > 0);
assert.ok(Math.abs(e.countries[1].tariffs - e.countries[1].imports * RULES.tariff) < 1e-9);
assert.ok(Math.abs(mA.trade[COPPER] + mB.trade[COPPER]) < 1e-6, "comércio criou ou destruiu cobre");

// guerra cancela o acordo e não deixa fazer outro
declareWar(e, 1, 2);
assert.ok(!hasPact(e, 1, 2));
assert.match(proposePact(e, 1, 2)!, /guerra/);
cancelPact(e, 1, 2);
console.log("foreign ok");
