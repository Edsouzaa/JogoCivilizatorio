import assert from "node:assert/strict";
import { generateWorld, claim } from "../src/world.ts";
import { createEconomy, tick, refresh } from "../src/economy.ts";
import { maxControl, seats, updateControl, CONTROL } from "../src/control.ts";
import { hexDistance } from "../src/hex.ts";

const w = generateWorld(200, 100, 5, 2), e = createEconomy(w);
const cap = w.countries[0].capital;
const d = (i: number) => hexDistance(i % 200, (i / 200) | 0, cap % 200, (cap / 200) | 0, 200);
// a capital tem controle total; longe dela cai até o mínimo
assert.equal(e.control[cap], 1);
claim(w, 1, cap, 12); refresh(w, e);
const far = [...e.owned].filter((i) => w.owner[i] === 1).sort((a, b) => d(b) - d(a))[0];
assert.ok(maxControl(w, e, far, seats(w, e, 1)) < maxControl(w, e, cap, seats(w, e, 1)));
assert.ok(maxControl(w, e, far, seats(w, e, 1)) >= CONTROL.min);
// território novo começa sem controle e sobe devagar, mês a mês
e.control[far] = 0;
updateControl(w, e);
assert.ok(Math.abs(e.control[far] - Math.min(CONTROL.risePerMonth, maxControl(w, e, far, seats(w, e, 1)))) < 1e-6);
// controle baixo derruba a arrecadação
for (let k = 0; k < 4; k++) tick(w, e);
const before = e.countries[0].income;
e.control.fill(0.1); e.week = 1; // fora do mês: não recalcula
tick(w, e);
assert.ok(e.countries[0].income < before, "pouco controle deveria arrecadar menos");
console.log("control ok");
