import { hexesInRadius } from "./hex.ts";

export const TERRAINS = [
  { name: "Oceano", color: [28, 52, 96], fertility: 0 },
  { name: "Planície", color: [150, 170, 90], fertility: 1 },
  { name: "Pradaria", color: [100, 150, 70], fertility: 0.9 },
  { name: "Deserto", color: [214, 196, 138], fertility: 0.1 },
  { name: "Floresta", color: [50, 100, 50], fertility: 0.5 },
  { name: "Selva", color: [30, 110, 60], fertility: 0.4 },
  { name: "Colinas", color: [130, 120, 80], fertility: 0.5 },
  { name: "Montanha", color: [110, 100, 95], fertility: 0.1 },
  { name: "Tundra", color: [140, 150, 140], fertility: 0.2 },
  { name: "Gelo", color: [235, 240, 245], fertility: 0 },
] as const;
export const T = { OCEAN: 0, PLAINS: 1, GRASS: 2, DESERT: 3, FOREST: 4, JUNGLE: 5, HILLS: 6, MOUNTAIN: 7, TUNDRA: 8, ICE: 9 };
export const isLand = (t: number) => t !== T.OCEAN && t !== T.ICE;

// Matérias-primas de docs/recursos.md que já aparecem no mapa. 0 = sem recurso.
export const RESOURCES = ["—", "Grãos", "Frutas e vegetais", "Carne e caça", "Peles", "Madeira", "Pedra", "Fibras",
  "Argila", "Sal", "Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Especiarias", "Cavalos",
  "Gado", "Carvão mineral", "Enxofre", "Petróleo"];
const R = Object.fromEntries(RESOURCES.map((n, i) => [n, i]));
const RESOURCES_BY_TERRAIN: number[][] = [
  [],
  [R["Grãos"], R["Grãos"], R["Cavalos"], R["Gado"], R["Argila"], R["Fibras"]],
  [R["Grãos"], R["Gado"], R["Cavalos"], R["Frutas e vegetais"], R["Fibras"]],
  [R["Sal"], R["Petróleo"], R["Ouro"], R["Enxofre"]],
  [R["Madeira"], R["Madeira"], R["Carne e caça"], R["Peles"], R["Frutas e vegetais"]],
  [R["Madeira"], R["Especiarias"], R["Frutas e vegetais"], R["Pedras preciosas"]],
  [R["Pedra"], R["Cobre"], R["Estanho"], R["Ferro"], R["Carvão mineral"], R["Prata"]],
  [R["Pedra"], R["Ferro"], R["Ouro"], R["Prata"], R["Pedras preciosas"], R["Carvão mineral"]],
  [R["Peles"], R["Carne e caça"], R["Petróleo"]],
  [],
];

export const START_RADIUS = 3; // território inicial em volta da capital

export type World = {
  W: number; H: number; seed: number;
  terrain: Uint8Array; resource: Uint8Array; owner: Uint8Array; pop: Float32Array;
  countries: { name: string; color: [number, number, number]; capital: number }[];
  landCount: number;
};

export function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, s: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruído de valor que se repete a cada `period` unidades em x, para o mapa fechar a volta sem emenda. */
function valueNoise(x: number, y: number, s: number, period: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % period) + period) % period, x1 = (x0 + 1) % period;
  const a = hash2(x0, yi, s), b = hash2(x1, yi, s), c = hash2(x0, yi + 1, s), d = hash2(x1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, s: number, octaves: number, period: number) {
  let sum = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f, y * f, s + o, period * f) * amp;
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

/** Valor que deixa `frac` dos itens de `v` (todos em 0..1) acima dele. */
function percentile(v: Float32Array, frac: number) {
  const bins = new Uint32Array(1024);
  for (const x of v) bins[Math.min(1023, (x * 1024) | 0)]++;
  let acc = 0;
  for (let b = 1023; b >= 0; b--) if ((acc += bins[b]) >= v.length * frac) return b / 1024;
  return 0;
}

export function generateWorld(W: number, H: number, seed: number, nCountries = 20, landFrac = 0.29): World {
  const N = W * H, rand = mulberry32(seed);
  const elev = new Float32Array(N), moist = new Float32Array(N), hot = new Float32Array(N);
  // período inteiro de células de ruído ao longo da largura, para o mapa fechar a volta
  const cells = (size: number) => Math.max(1, Math.round(W / size));
  const pE = cells(120), pM = cells(70), pH = cells(40);
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const x = (col + 0.5 * (row & 1)) / W, y = (row * 0.866) / W, i = row * W + col; // x em 0..1 = uma volta
      elev[i] = fbm(x * pE, y * pE, seed, 7, pE);
      moist[i] = fbm(x * pM, y * pM, seed + 99, 4, pM);
      hot[i] = fbm(x * pH, y * pH, seed + 7, 3, pH);
    }
  }
  const sea = percentile(elev, landFrac), mountain = percentile(elev, landFrac * 0.06), hills = percentile(elev, landFrac * 0.2);

  const terrain = new Uint8Array(N), resource = new Uint8Array(N), pop = new Float32Array(N);
  let landCount = 0;
  for (let row = 0; row < H; row++) {
    const lat = Math.abs(row / (H - 1) - 0.5) * 2; // 0 = equador, 1 = polo
    for (let col = 0; col < W; col++) {
      const i = row * W + col, e = elev[i], m = moist[i];
      let t: number;
      if (e < sea) t = lat > 0.93 ? T.ICE : T.OCEAN;
      else if (lat > 0.9) t = T.ICE;
      else if (lat > 0.78) t = T.TUNDRA;
      else if (e >= mountain) t = T.MOUNTAIN;
      else if (e >= hills) t = T.HILLS;
      else if (lat < 0.25) t = m > 0.55 ? T.JUNGLE : m < 0.42 ? T.DESERT : T.GRASS;
      else if (lat < 0.45 && m < 0.45) t = T.DESERT;
      else t = m > 0.56 ? T.FOREST : m > 0.47 ? T.GRASS : T.PLAINS;
      terrain[i] = t;
      if (t === T.OCEAN) continue;
      landCount++;
      const opts = RESOURCES_BY_TERRAIN[t];
      if (opts.length && rand() < 0.4) resource[i] = opts[(rand() * opts.length) | 0];
      // espalhada por igual (~40 por hex fértil), com polos de até ~8× onde o ruído "hot" é alto
      const h = Math.min(1, Math.max(0, (hot[i] - 0.5) * 4 + 0.5));
      pop[i] = 60 * TERRAINS[t].fertility * (0.5 + 8 * h ** 4) * (0.8 + 0.4 * rand());
    }
  }

  // Países: uma capital em terra fértil, com território de raio START_RADIUS. O resto do mundo começa livre.
  const owner = new Uint8Array(N), countries: World["countries"] = [];
  for (let tries = 0; countries.length < nCountries && tries < 200000; tries++) {
    const i = (rand() * N) | 0;
    if (!isLand(terrain[i]) || TERRAINS[terrain[i]].fertility < 0.5 || owner[i]) continue;
    const area = hexesInRadius(i, START_RADIUS + 2, W, H);
    if (area.some((j) => owner[j])) continue; // longe de outros países
    const id = countries.length + 1;
    countries.push({ name: `País ${id}`, capital: i, color: [60 + rand() * 180, 60 + rand() * 180, 60 + rand() * 180].map(Math.round) as [number, number, number] });
    for (const j of hexesInRadius(i, START_RADIUS, W, H)) if (isLand(terrain[j])) owner[j] = id;
  }
  return { W, H, seed, terrain, resource, owner, pop, countries, landCount };
}

export const MAP_MODES = ["Terreno", "Político", "População", "Recursos"] as const;
export const URBAN_COLOR = [190, 180, 170];

/**
 * Cor RGBA de cada hex para o modo de mapa escolhido; `urban[i]` = 1 marca hex de cidade.
 * Trocar de modo = recalcular isto e subir a textura.
 */
export function colorize(w: World, mode: number, urban: Uint8Array, out = new Uint8Array(w.W * w.H * 4)) {
  const resColors = RESOURCES.map((_, k) => [((k * 97) % 200) + 55, ((k * 57) % 200) + 55, ((k * 151) % 200) + 55]);
  for (let i = 0; i < w.W * w.H; i++) {
    const t = w.terrain[i];
    let c: readonly number[] = TERRAINS[t].color;
    if (t !== T.OCEAN) {
      if (mode === 1) c = w.owner[i] ? w.countries[w.owner[i] - 1].color : [90, 90, 90];
      else if (mode === 2) { const v = Math.min(1, Math.sqrt(w.pop[i] / 400)); c = [40 + 215 * v, 40 + 80 * v, 40]; }
      else if (mode === 3) c = w.resource[i] ? resColors[w.resource[i]] : [70, 70, 70];
      if (urban[i] && mode !== 2) c = mode === 1 ? c.map((v) => v * 0.6) : URBAN_COLOR;
    }
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2];
    // alfa = id do bioma para o shader; 255 = desenhar cor lisa (cidade, ou modo que não é terreno)
    out[i * 4 + 3] = mode === 0 && !urban[i] ? t : 255;
  }
  return out;
}

/** Arquivo de imagem de cada bioma em public/biomas/, na ordem de TERRAINS. */
export const BIOME_FILES = TERRAINS.map((t) => t.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() + ".png");
