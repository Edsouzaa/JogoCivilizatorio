// Nós marítimos (centro de cada zona marítima e ligações entre zonas vizinhas) e contorno de regiões
// (estado, zona marítima) para destacar no mapa. Tudo em coordenadas do mundo (hexCenter).
import { across, T, type World } from "./world.ts";
import { hexCenter, SQRT3 } from "./hex.ts";

/** Zonas menores que isto (lagos) não ganham nó no mapa. */
export const MIN_NODE_HEXES = 20;

export type SeaNodes = { hex: number[]; links: [number, number][] }; // hex[z] = hex do nó da zona z (−1 se não existe)

/** Nó de cada zona: o hex da zona mais perto do centro dela (média circular nas colunas, o mapa dá a volta). */
export function seaNodes(w: World): SeaNodes {
  const { W, H, seaZone } = w, N = W * H;
  let Z = 0;
  for (let i = 0; i < N; i++) if (seaZone[i] > Z) Z = seaZone[i];
  const sx = new Float64Array(Z + 1), sy = new Float64Array(Z + 1), sr = new Float64Array(Z + 1), n = new Float64Array(Z + 1);
  const links = new Set<number>();
  for (let i = 0; i < N; i++) {
    const z = seaZone[i];
    if (!z) continue;
    const a = (2 * Math.PI * (i % W)) / W;
    sx[z] += Math.cos(a); sy[z] += Math.sin(a); sr[z] += (i / W) | 0; n[z]++;
    for (let k = 0; k < 3; k++) { // metade das bordas basta: a outra metade é a mesma ligação vista do vizinho
      const j = across(W, H, i, k), y = j >= 0 ? seaZone[j] : 0;
      if (y && y !== z) links.add(Math.min(z, y) * 65536 + Math.max(z, y));
    }
  }
  const cc = new Float64Array(Z + 1), cr = new Float64Array(Z + 1), best = new Float64Array(Z + 1).fill(Infinity), hex = new Array<number>(Z + 1).fill(-1);
  for (let z = 1; z <= Z; z++) if (n[z]) { cc[z] = (((Math.atan2(sy[z], sx[z]) / (2 * Math.PI)) * W) % W + W) % W; cr[z] = sr[z] / n[z]; }
  for (let i = 0; i < N; i++) {
    const z = seaZone[i];
    if (!z) continue;
    let dc = Math.abs((i % W) - cc[z]); dc = Math.min(dc, W - dc);
    const d = dc * dc + (((i / W) | 0) - cr[z]) ** 2;
    if (d < best[z]) { best[z] = d; hex[z] = i; }
  }
  for (let z = 1; z <= Z; z++) if (n[z] < MIN_NODE_HEXES) hex[z] = -1; // lago pequeno: sem nó
  return { hex, links: [...links].map((k) => [Math.floor(k / 65536), k % 65536] as [number, number]).filter(([a, b]) => hex[a] >= 0 && hex[b] >= 0) };
}

// cantos do hex pointy-top de raio 1; a borda k vai do canto k ao k+1 (ver `across` em world.ts)
const CORNERS = [[0, -1], [SQRT3 / 2, -0.5], [SQRT3 / 2, 0.5], [0, 1], [-SQRT3 / 2, 0.5], [-SQRT3 / 2, -0.5]];

/** Segmentos [x1, y1, x2, y2, ...] das bordas dos hexes da região que dão para fora dela. */
export function outline(w: World, hexes: Iterable<number>, inside: (i: number) => boolean) {
  const out: number[] = [];
  for (const i of hexes) {
    const [x, y] = hexCenter(i % w.W, (i / w.W) | 0);
    for (let k = 0; k < 6; k++) {
      const j = across(w.W, w.H, i, k);
      if (j >= 0 && inside(j)) continue;
      const a = CORNERS[k], b = CORNERS[(k + 1) % 6];
      out.push(x + a[0], y + a[1], x + b[0], y + b[1]);
    }
  }
  return out;
}

/** Hexes de uma zona marítima. */
export const zoneHexes = (w: World, z: number) => { const r: number[] = []; for (let i = 0; i < w.W * w.H; i++) if (w.seaZone[i] === z && w.terrain[i] === T.OCEAN) r.push(i); return r; };
