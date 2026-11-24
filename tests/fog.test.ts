import assert from "node:assert/strict";
import { updateFog, buildInfo, FOG } from "../src/fog.ts";
import { createEconomy } from "../src/economy.ts";
import { generateWorld } from "../src/world.ts";
import { hexDistance } from "../src/hex.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
const N = w.W * w.H, explored = new Uint8Array(N), visible = new Uint8Array(N);
const cap = e.cities[0].hex, dist = (a: number, b: number) => hexDistance(a % w.W, (a / w.W) | 0, b % w.W, (b / w.W) | 0, w.W);

updateFog(w, e, 1, explored, visible);
assert.equal(visible[cap], 1);
for (let i = 0; i < N; i++) {
  if (dist(i, cap) <= FOG.city) assert.equal(visible[i], 1, "perto da capital deveria ser visível");
  if (visible[i]) assert.equal(explored[i], 1, "visível sem estar explorado");
}
const otherCap = e.cities[1].hex;
assert.equal(visible[otherCap], 0, "capital de outro país distante não deveria aparecer");

// uma unidade que anda revela o caminho, e o explorado fica mesmo depois que ela sai
const unit = e.divisions.find((d) => d.country === 1)!;
const far = otherCap;
unit.hex = far;
updateFog(w, e, 1, explored, visible);
assert.equal(visible[far], 1);
unit.hex = cap;
updateFog(w, e, 1, explored, visible);
assert.equal(visible[far], 0);
assert.equal(explored[far], 1);

// textura: R = névoa (2 visível, 1 explorado, 0 inexplorado) + bit 128 de dono; sem país, tudo visível
const info = buildInfo(w, new Uint8Array(N * 4), explored, visible);
assert.equal(info[cap * 4] & 3, 2);
assert.equal(info[far * 4] & 3, 1);
assert.ok(info[cap * 4] & 128);
const all = buildInfo(w, new Uint8Array(N * 4), null, null);
for (let i = 0; i < N; i++) assert.equal(all[i * 4] & 3, 2);
console.log("fog ok");

// fronteiras: borda entre país e não-país (ou outro país) marcada dos dois lados; interior sem linha
{
  const { buildBorders } = await import("../src/fog.ts");
  const { across } = await import("../src/world.ts");
  const b = buildBorders(w, e, new Uint8Array(N * 4));
  let edges = 0;
  for (const i of e.owned) for (let k = 0; k < 6; k++) {
    const n = across(w.W, w.H, i, k);
    if (n < 0) continue;
    const bit = (b[i * 4] >> k) & 1, other = (b[n * 4] >> ((k + 3) % 6)) & 1;
    assert.equal(bit, other, "fronteira só de um lado");
    assert.equal(bit, w.owner[n] !== w.owner[i] ? 1 : 0, "fronteira no lugar errado");
    edges += bit;
  }
  assert.ok(edges > 0);
  assert.equal(b[cap * 4], 0, "capital no meio do território não deveria ter fronteira");
}
console.log("borders ok");

// comércio abre o mapa do parceiro; vizinhos e parceiros viram contatos (difusão de tecnologia)
{
  const { proposePact, contactsOf, tick, RULES } = await import("../src/economy.ts");
  const w2 = generateWorld(200, 100, 4, 3), e2 = createEconomy(w2);
  const ex = new Uint8Array(200 * 100), vis = new Uint8Array(200 * 100);
  const theirs = [...e2.owned].filter((i) => w2.owner[i] === 2);
  updateFog(w2, e2, 1, ex, vis);
  assert.ok(theirs.some((i) => !ex[i]), "já via tudo do país 2 sem acordo");
  assert.equal(proposePact(e2, 1, 2), null);
  updateFog(w2, e2, 1, ex, vis);
  assert.ok(theirs.every((i) => ex[i]), "parceiro deveria ficar explorado");
  assert.ok(contactsOf(w2, e2)[0].includes(2));
  // quem já conhece a tecnologia acelera a pesquisa do contato
  tick(w2, e2); const alone = e2.countries[0].researchWeek;
  e2.contacts = contactsOf(w2, e2);
  e2.countries[1].research.known.add(e2.countries[0].research.researching!);
  e2.week = 1; tick(w2, e2);
  assert.ok(Math.abs(e2.countries[0].researchWeek / alone - (1 + RULES.diffusion)) < 0.05, "difusão deveria dar +15%");
}
console.log("diffusion ok");
