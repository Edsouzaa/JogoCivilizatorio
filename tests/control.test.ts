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
for (const i of e.owned) if (w.owner[i] === 1) w.pop[i] += 500; // gente para ter imposto de verdade
for (let k = 0; k < 4; k++) tick(w, e);
e.control.fill(1); e.week = 1; tick(w, e); // fora do mês: não recalcula
const before = e.countries[0].income;
e.control.fill(0.1); e.week = 1;
tick(w, e);
assert.ok(e.countries[0].income < before, "pouco controle deveria arrecadar menos");
console.log("control ok");

// estrada: custa dinheiro, limitada pela era, sobe o controle máximo e o comércio da cidade
{
  const { buildRoad, maxRoad, RULES } = await import("../src/economy.ts");
  const w2 = generateWorld(200, 100, 5, 2), e2 = createEconomy(w2), c = e2.countries[0];
  c.treasury = 0;
  assert.match(buildRoad(e2, 0)!, /Faltam/);
  c.treasury = 1e4;
  assert.equal(buildRoad(e2, 0), null);
  assert.equal(maxRoad(e2, 1), 1);
  assert.match(buildRoad(e2, 0)!, /máximo/);
  const far = [...e2.owned].filter((i) => e2.market[i] === 1).sort((a, b) => e2.control[a] - e2.control[b])[0];
  const before = maxControl(w2, e2, far, seats(w2, e2, 1));
  e2.control[far] = 0; for (let k = 0; k < 40; k++) updateControl(w2, e2);
  assert.ok(e2.control[far] >= Math.min(1, before + RULES.roadControl) - 1e-6, "estrada deveria subir o controle máximo");
}
console.log("road ok");
