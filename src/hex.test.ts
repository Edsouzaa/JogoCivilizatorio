import assert from "node:assert/strict";
import { hexCenter, pixelToHex, forNeighbors, hexDistance, hexesInRadius, wrapCol, SQRT3 } from "./hex.ts";

for (let i = 0; i < 5000; i++) {
  const col = Math.floor(Math.random() * 200), row = Math.floor(Math.random() * 200);
  const [x, y] = hexCenter(col, row);
  // qualquer ponto dentro do círculo inscrito (raio √3/2) cai no mesmo hex
  const a = Math.random() * Math.PI * 2, d = Math.random() * 0.85;
  assert.deepEqual(pixelToHex(x + Math.cos(a) * d, y + Math.sin(a) * d), [col, row]);

  let n = 0;
  forNeighbors(col + 1, row + 1, 1000, 1000, (j) => {
    const [nx, ny] = hexCenter(j % 1000, Math.floor(j / 1000));
    const [cx, cy] = hexCenter(col + 1, row + 1);
    assert.ok(Math.abs(Math.hypot(nx - cx, ny - cy) - SQRT3) < 1e-9, "vizinho fora de distância");
    assert.equal(hexDistance(col + 1, row + 1, j % 1000, Math.floor(j / 1000), 1000), 1);
    n++;
  });
  assert.equal(n, 6);
}

// o mundo dá a volta: a coluna 0 é vizinha da coluna W-1
const W = 50, near: number[] = [];
forNeighbors(0, 4, W, 10, (j) => near.push(j % W));
assert.ok(near.includes(W - 1));
assert.equal(hexDistance(0, 4, W - 1, 4, W), 1);
assert.equal(wrapCol(-1, W), W - 1);
assert.equal(hexesInRadius(4 * W, 2, W, 10).length, 19); // 1 + 6 + 12
console.log("hex ok");
