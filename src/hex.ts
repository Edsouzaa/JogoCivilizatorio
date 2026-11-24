// Hexágonos "pointy-top", coordenadas offset odd-r (linhas ímpares deslocadas meio hex), raio 1.
// A mesma conta existe em GLSL no render.ts: mudou aqui, muda lá.
export const SQRT3 = Math.sqrt(3);

export function hexCenter(col: number, row: number): [number, number] {
  return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row];
}

export function pixelToHex(x: number, y: number): [number, number] {
  const q = (SQRT3 / 3) * x - y / 3;
  const r = (2 / 3) * y;
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [(rq + (rr - (rr & 1)) / 2) | 0, rr | 0]; // | 0 tira o -0 do Math.round
}

const EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];

/** Chama fn para cada vizinho dentro do mapa W×H, com o índice linear row*W+col. */
export function forNeighbors(col: number, row: number, W: number, H: number, fn: (i: number) => void) {
  for (const [dc, dr] of row & 1 ? ODD : EVEN) {
    const c = col + dc, r = row + dr;
    if (c >= 0 && r >= 0 && c < W && r < H) fn(r * W + c);
  }
}
