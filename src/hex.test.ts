import assert from "node:assert/strict";
import { hexCenter, pixelToHex, forNeighbors, SQRT3 } from "./hex.ts";

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
    n++;
  });
  assert.equal(n, 6);
}
console.log("hex ok");
