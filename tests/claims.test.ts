import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { declareWar, makePeace } from "../src/war.ts";
import { INFAMY } from "../src/economy.ts";
import { lostCity, hasClaimOn, claimsOf, stepClaims, personality, desires, PERSONALITIES, CLAIM } from "../src/claims.ts";
import { relation } from "../src/diplomacy.ts";

const w = generateWorld(200, 100, 5, 3), e = createEconomy(w);
tick(w, e);
// personalidade fixa e válida; desejos são texto
for (let k = 1; k <= 3; k++) { assert.ok(personality(w, e, k) in PERSONALITIES); assert.ok(Array.isArray(desires(w, e, k))); }
assert.equal(personality(w, e, 1), personality(w, e, 1));
// perder cidade → claim histórico; guerra com claim gasta metade da infâmia; dono do claim vira revanchista
const city2 = e.cities.findIndex((k) => k.country === 2);
e.cities[city2].country = 3; w.owner[e.cities[city2].hex] = 3; // a cidade agora é do país 3
lostCity(e, 2, city2);
assert.ok(hasClaimOn(e, 2, 3));
assert.equal(personality(w, e, 2), "Revanchista");
const inf0 = e.countries[1].infamy;
declareWar(e, 2, 3);
assert.equal(e.countries[1].infamy - inf0, INFAMY.declareWar * CLAIM.infamyCut);
makePeace(w, e, 2, 3);
// claim envelhece, azeda a relação, some quando a cidade volta
const r0 = relation(e, 2, 3), s0 = claimsOf(e, 2)[0].strength;
stepClaims(w, e);
assert.ok(relation(e, 3, 2) < r0 && claimsOf(e, 2)[0].strength === s0 - CLAIM.decayYear);
e.cities[city2].country = 2; w.owner[e.cities[city2].hex] = 2;
stepClaims(w, e);
assert.ok(!claimsOf(e, 2).some((c) => c.city === city2), "cidade recuperada: claim some");
console.log("claims ok");
