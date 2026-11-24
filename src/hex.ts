// Hexágonos "pointy-top", coordenadas offset odd-r (linhas ímpares deslocadas meio hex), raio 1.
// O mundo dá a volta na horizontal (coluna W = coluna 0); as linhas não dão a volta (polos).
// A mesma conta existe em GLSL no render.ts: mudou aqui, muda lá.
export const SQRT3 = Math.sqrt(3);

export const wrapCol = (col: number, W: number) => ((col % W) + W) % W;

export function hexCenter(col: number, row: number): [number, number] {
  return [SQRT3 * (col + 0.5 * (row & 1)), 1.5 * row];
}

/** Hex sob o ponto (x, y). A coluna NÃO é normalizada; use wrapCol para trazê-la para 0..W-1. */
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

/** Chama fn para cada vizinho no mapa W×H (dando a volta na horizontal), com o índice linear row*W+col. */
export function forNeighbors(col: number, row: number, W: number, H: number, fn: (i: number) => void) {
  for (const [dc, dr] of row & 1 ? ODD : EVEN) {
    const r = row + dr;
    if (r >= 0 && r < H) fn(r * W + wrapCol(col + dc, W));
  }
}

/** Distância em hexágonos, considerando a volta horizontal. */
export function hexDistance(c1: number, r1: number, c2: number, r2: number, W: number) {
  const q1 = c1 - (r1 - (r1 & 1)) / 2;
  let best = Infinity;
  for (const c of [c2 - W, c2, c2 + W]) {
    const dq = q1 - (c - (r2 - (r2 & 1)) / 2), dr = r1 - r2;
    best = Math.min(best, (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2);
  }
  return best;
}

/** Índices dos hexágonos a até `radius` de i (inclui i), em ordem de distância. */
export function hexesInRadius(i: number, radius: number, W: number, H: number) {
  const seen = new Set([i]);
  let ring = [i];
  for (let d = 0; d < radius; d++) {
    const next: number[] = [];
    for (const j of ring) forNeighbors(j % W, (j / W) | 0, W, H, (k) => { if (!seen.has(k)) { seen.add(k); next.push(k); } });
    ring = next;
  }
  return [...seen];
}
