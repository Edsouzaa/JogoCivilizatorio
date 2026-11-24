import assert from "node:assert/strict";
import { generateWorld, across } from "../src/world.ts";
import { seaNodes, outline, zoneHexes } from "../src/regions.ts";

const w = generateWorld(300, 150, 4, 4);
const nodes = seaNodes(w);
// todo nó fica dentro da própria zona, e toda ligação é entre zonas que se encostam
for (let z = 1; z < nodes.hex.length; z++) if (nodes.hex[z] >= 0) assert.equal(w.seaZone[nodes.hex[z]], z);
assert.ok(nodes.links.length > 0);
for (const [a, b] of nodes.links.slice(0, 20)) {
  const touch = zoneHexes(w, a).some((i) => [0, 1, 2, 3, 4, 5].some((k) => { const j = across(w.W, w.H, i, k); return j >= 0 && w.seaZone[j] === b; }));
  assert.ok(touch, `zonas ${a} e ${b} não se encostam`);
}
// contorno de um hex sozinho: 6 bordas; de dois vizinhos: 10
const i = 75 * 300 + 150, j = across(300, 150, i, 1);
assert.equal(outline(w, [i], (x) => x === i).length / 4, 6);
assert.equal(outline(w, [i, j], (x) => x === i || x === j).length / 4, 10);
console.log("regions ok");
