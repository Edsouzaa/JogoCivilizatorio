import { hexesInRadius, forNeighbors } from "./hex.ts";
import { makeName, languageAt } from "./names.ts";

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
  { name: "Savana", color: [190, 175, 95], fertility: 0.6 },
  { name: "Estepe", color: [170, 165, 110], fertility: 0.35 },
  { name: "Taiga", color: [40, 75, 60], fertility: 0.3 },
] as const;
export const T = { OCEAN: 0, PLAINS: 1, GRASS: 2, DESERT: 3, FOREST: 4, JUNGLE: 5, HILLS: 6, MOUNTAIN: 7, TUNDRA: 8, ICE: 9, SAVANNA: 10, STEPPE: 11, TAIGA: 12 };

/** Clima de cada hex (por latitude e umidade). Define os biomas e onde neva no inverno. */
export const CLIMATES = ["Tropical", "Árido", "Temperado", "Continental", "Polar"] as const;
export const C = { TROPICAL: 0, ARID: 1, TEMPERATE: 2, CONTINENTAL: 3, POLAR: 4 };
export const isLand = (t: number) => t !== T.OCEAN && t !== T.ICE;

// Matérias-primas de docs/recursos.md que já aparecem no mapa. 0 = sem recurso.
export const RESOURCES = ["—", "Grãos", "Frutas e vegetais", "Carne e caça", "Peles", "Madeira", "Pedra", "Fibras",
  "Argila", "Sal", "Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Especiarias", "Cavalos",
  "Gado", "Carvão mineral", "Enxofre", "Petróleo"];
/** Cor de cada recurso no mapa de recursos. */
export const RES_COLORS = RESOURCES.map((_, k) => [((k * 97) % 200) + 55, ((k * 57) % 200) + 55, ((k * 151) % 200) + 55]);
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
  [R["Gado"], R["Carne e caça"], R["Fibras"], R["Ouro"]],
  [R["Cavalos"], R["Gado"], R["Sal"]],
  [R["Madeira"], R["Peles"], R["Carne e caça"], R["Ferro"]],
];
// recursos de jazida (minérios, pedras, petróleo...) são mais raros que os de fazenda/pasto
/** Recurso comum de cada terreno: o que o hex tem quando não há jazida (o primeiro não mineral da lista). */
const commonOf = (t: number) => RESOURCES_BY_TERRAIN[t].find((r) => !MINERAL.has(r)) ?? RESOURCES_BY_TERRAIN[t][0] ?? 0;
/** Reservas (em semanas de extratora nível 1 com equipe completa). Pedra e sal quase não acabam. */
export const RESERVE = { minYears: 150, maxYears: 600, abundant: 5 };
const MINERAL = new Set(["Pedra", "Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Carvão mineral", "Enxofre", "Petróleo", "Sal"].map((n) => R[n]));

export const START_RADIUS = 1; // território inicial em volta da capital; cresce com a cidade

import type { Flag } from "./flags.ts";
export type World = {
  W: number; H: number; seed: number;
  terrain: Uint8Array; resource: Uint8Array; owner: Uint16Array;
  pop: Float32Array; climate: Uint8Array;
  resource2: Uint8Array; // segundo produto do hex (0 = nenhum); a reserva é sempre do primeiro
  reserve: Float32Array; // semanas de extração que restam na jazida (Infinity = renovável)
  river: Uint8Array;     // bits 0–5: rio na borda k do hex (ver `across`)
  navigable: Uint8Array; // bits 0–5: trecho navegável (futuro: navios)
  seaZone: Uint16Array;  // zona marítima do hex de oceano (1..n); 0 = terra/gelo
  countries: { name: string; color: [number, number, number]; capital: number; flag?: Flag; lang?: number }[];
  continent?: Uint8Array;                        // continente de cada hex de terra (0 = ilha pequena / mar)
  continents?: { name: string; hex: number }[];  // índice = id − 1; hex = onde escrever o nome
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

/** Oceano profundo: mar a mais de DEEP_OCEAN hexes da terra. Navio fraco não entra (war.ts). Calculado uma vez por mundo. */
export const DEEP_OCEAN = 4;
const deepCache = new WeakMap<World, Uint8Array>();
export function deepOcean(w: World) {
  let d = deepCache.get(w);
  if (d) return d;
  const N = w.W * w.H, dist = new Uint8Array(N).fill(255);
  let queue: number[] = [];
  for (let i = 0; i < N; i++) if (w.terrain[i] !== T.OCEAN) { dist[i] = 0; queue.push(i); }
  for (let k = 1; k <= DEEP_OCEAN && queue.length; k++) {
    const next: number[] = [];
    for (const i of queue) forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (dist[j] === 255) { dist[j] = k; next.push(j); } });
    queue = next;
  }
  d = new Uint8Array(N);
  for (let i = 0; i < N; i++) d[i] = dist[i] === 255 ? 1 : 0;
  deepCache.set(w, d);
  return d;
}

/** Continentes: terras ligadas com pelo menos CONTINENT_MIN hexes, cada uma com nome. */
export const CONTINENT_MIN = 800;
/** Hex da lista mais perto do centro dela (média circular nas colunas: o mapa dá a volta). */
function centerOf(part: number[], W: number) {
  let sx = 0, sy = 0, sr = 0;
  for (const i of part) { const a = (2 * Math.PI * (i % W)) / W; sx += Math.cos(a); sy += Math.sin(a); sr += (i / W) | 0; }
  const cc = ((Math.atan2(sy, sx) / (2 * Math.PI)) * W + W) % W, cr = sr / part.length;
  let best = part[0], bd = Infinity;
  for (const i of part) { let dc = Math.abs((i % W) - cc); dc = Math.min(dc, W - dc); const d = dc * dc + (((i / W) | 0) - cr) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
export function generateContinents(w: World) {
  const { W, H } = w, N = W * H, id = new Uint8Array(N), seen = new Uint8Array(N);
  w.continents = [];
  for (let s = 0; s < N; s++) {
    if (seen[s] || !isLand(w.terrain[s])) continue;
    const part = [s]; seen[s] = 1;
    for (let q = 0; q < part.length; q++) forNeighbors(part[q] % W, (part[q] / W) | 0, W, H, (j) => { if (!seen[j] && isLand(w.terrain[j])) { seen[j] = 1; part.push(j); } });
    if (part.length < CONTINENT_MIN || w.continents.length >= 255) continue;
    const k = w.continents.length + 1;
    for (const j of part) id[j] = k;
    w.continents.push({ name: makeName(languageAt(s % W, (s / W) | 0, W, H, w.seed) + 3, w.seed * 13 + k), hex: centerOf(part, W) });
  }
  w.continent = id;
}

/** A jazida do hex acabou: vira o recurso comum do terreno. */
export function exhaust(w: World, i: number) { w.resource[i] = commonOf(w.terrain[i]); w.resource2[i] = 0; w.reserve[i] = Infinity; }

export function generateWorld(W: number, H: number, seed: number, nCountries?: number, landFrac = 0.29): World {
  const N = W * H, rand = mulberry32(seed);
  const elev = new Float32Array(N), moist = new Float32Array(N), hot = new Float32Array(N);
  const deposit = new Float32Array(N), kind = new Float32Array(N);
  // período inteiro de células de ruído ao longo da largura, para o mapa fechar a volta
  const cells = (size: number) => Math.max(1, Math.round(W / size));
  const pE = cells(120), pM = cells(70), pH = cells(40), pD = cells(12), pK = cells(20);
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const x = (col + 0.5 * (row & 1)) / W, y = (row * 0.866) / W, i = row * W + col; // x em 0..1 = uma volta
      elev[i] = fbm(x * pE, y * pE, seed, 7, pE);
      moist[i] = fbm(x * pM, y * pM, seed + 99, 4, pM);
      hot[i] = fbm(x * pH, y * pH, seed + 7, 3, pH);
      deposit[i] = fbm(x * pD, y * pD, seed + 31, 3, pD); // manchas de jazidas
      kind[i] = fbm(x * pK, y * pK, seed + 57, 2, pK);    // que recurso a mancha tem
    }
  }
  const sea = percentile(elev, landFrac), mountain = percentile(elev, landFrac * 0.06), hills = percentile(elev, landFrac * 0.2);

  const terrain = new Uint8Array(N), resource = new Uint8Array(N), pop = new Float32Array(N), climate = new Uint8Array(N);
  const resource2 = new Uint8Array(N); // segundo produto do hex (0 = nenhum)
  const reserve = new Float32Array(N).fill(Infinity); // Infinity = renovável (lavoura, floresta, pasto)
  let landCount = 0;
  for (let row = 0; row < H; row++) {
    const lat = Math.abs(row / (H - 1) - 0.5) * 2; // 0 = equador, 1 = polo
    for (let col = 0; col < W; col++) {
      const i = row * W + col, e = elev[i], m = moist[i];
      // clima: faixas de latitude; pouca umidade fora dos polos = árido
      const cl = lat > 0.8 ? C.POLAR : m < 0.42 && lat < 0.6 ? C.ARID : lat < 0.28 ? C.TROPICAL : lat < 0.6 ? C.TEMPERATE : C.CONTINENTAL;
      climate[i] = cl;
      let t: number;
      if (e < sea) t = lat > 0.93 ? T.ICE : T.OCEAN;
      else if (lat > 0.9) t = T.ICE;
      else if (e >= mountain) t = T.MOUNTAIN;
      else if (e >= hills) t = T.HILLS;
      else if (cl === C.POLAR) t = T.TUNDRA;
      else if (cl === C.ARID) t = lat < 0.4 ? T.DESERT : T.STEPPE;
      else if (cl === C.TROPICAL) t = m > 0.55 ? T.JUNGLE : T.SAVANNA;
      else if (cl === C.TEMPERATE) t = m > 0.56 ? T.FOREST : m > 0.47 ? T.GRASS : T.PLAINS;
      else t = m > 0.5 ? T.TAIGA : T.STEPPE;
      terrain[i] = t;
      if (t === T.OCEAN) continue;
      landCount++;
      const opts = RESOURCES_BY_TERRAIN[t];
      if (opts.length) { // jazidas em manchas: hexes vizinhos tendem a ter o mesmo recurso
        const r = opts[Math.min(opts.length - 1, Math.max(0, Math.floor(((kind[i] - 0.25) / 0.5) * opts.length)))];
        if (deposit[i] > (MINERAL.has(r) ? 0.64 : 0.56)) resource[i] = r;
      }
      const common = commonOf(t);
      if (!resource[i]) resource[i] = common; // todo hex de terra produz alguma coisa
      else if (common !== resource[i]) resource2[i] = common; // jazida em cima de lavoura/floresta: 2 produtos
      if (MINERAL.has(resource[i])) { // jazida: acaba um dia
        const years = RESERVE.minYears + (RESERVE.maxYears - RESERVE.minYears) * Math.min(1, Math.max(0, deposit[i]));
        reserve[i] = years * 52 * (resource[i] === R["Pedra"] || resource[i] === R["Sal"] ? RESERVE.abundant : 1);
      }
      // espalhada por igual (~13 por hex fértil), com polos de até ~8× onde o ruído "hot" é alto
      const h = Math.min(1, Math.max(0, (hot[i] - 0.5) * 4 + 0.5));
      pop[i] = 20 * TERRAINS[t].fertility * (0.5 + 8 * h ** 4) * (0.8 + 0.4 * rand());
    }
  }

  // Países: uma capital em terra fértil, com território de raio START_RADIUS. O resto do mundo começa livre.
  const owner = new Uint16Array(N), countries: World["countries"] = [];
  const w: World = { W, H, seed, terrain, resource, resource2, reserve, owner, pop, climate, countries, landCount, river: new Uint8Array(N), navigable: new Uint8Array(N), seaZone: new Uint16Array(N) };
  generateRivers(w, elev, hills, rand);
  generateSeaZones(w);
  generateContinents(w);
  for (let i = 0; i < N; i++) if (w.river[i]) pop[i] *= 1.5; // gente vive perto da água
  const target = Math.min(nCountries ?? Math.max(4, Math.round(landCount / 10000)), 65535); // 1 tribo a cada 10.000 hexes de terra
  for (let tries = 0; countries.length < target && tries < 2000000; tries++) {
    const i = (rand() * N) | 0;
    if (!isLand(terrain[i]) || TERRAINS[terrain[i]].fertility < 0.5 || owner[i]) continue;
    const area = hexesInRadius(i, START_RADIUS + 4, W, H);
    if (area.some((j) => owner[j])) continue; // longe de outros países
    const id = countries.length + 1;
    const lang = languageAt(i % W, (i / W) | 0, W, H, seed);
    countries.push({ name: makeName(lang, seed * 31 + id), lang, capital: i, color: [60 + rand() * 180, 60 + rand() * 180, 60 + rand() * 180].map(Math.round) as [number, number, number] });
    claim(w, id, i, START_RADIUS); // já agora, para o próximo país enxergar que aqui tem dono
  }
  return w;
}

/**
 * O país reivindica a terra livre a até `radius` do hex e o mar colado nela (1 hex de águas territoriais).
 * Retorna os hexes reivindicados.
 */
export function claim(w: World, country: number, center: number, radius: number) {
  const got: number[] = [];
  for (const j of hexesInRadius(center, radius, w.W, w.H)) if (!w.owner[j] && isLand(w.terrain[j])) { w.owner[j] = country; got.push(j); }
  for (const j of [...got]) forNeighbors(j % w.W, (j / w.W) | 0, w.W, w.H, (k) => {
    if (!w.owner[k] && w.terrain[k] === T.OCEAN) { w.owner[k] = country; got.push(k); }
  });
  return got;
}

export const MAP_MODES = ["Terreno", "Político", "População", "Recursos", "Controle", "Clima", "Tecnologia", "Satisfação"] as const;
const CLIMATE_COLORS = [[40, 150, 60], [220, 190, 90], [110, 190, 110], [120, 150, 190], [225, 235, 245]];
export const URBAN_COLOR = [190, 180, 170];

/**
 * Cor RGBA de cada hex para o modo de mapa escolhido; `urban[i]` = 1 marca hex de cidade; `occupier[i]` = país que ocupa.
 * Trocar de modo = recalcular isto e subir a textura.
 */
/** `byCountry[país − 1]` em 0..1 para os mapas por país (Tecnologia, Satisfação). */
export function colorize(w: World, mode: number, urban: Uint8Array, occupier: Uint16Array, out = new Uint8Array(w.W * w.H * 4), control?: Float32Array, byCountry?: number[]) {
  for (let i = 0; i < w.W * w.H; i++) {
    const t = w.terrain[i];
    let c: readonly number[] = TERRAINS[t].color;
    if (mode === 0 && w.owner[i]) c = w.countries[w.owner[i] - 1].color;
    if (t === T.OCEAN && mode === 1 && w.owner[i]) c = w.countries[w.owner[i] - 1].color.map((v, k) => (v + TERRAINS[0].color[k] * 2) / 3);
    if (t !== T.OCEAN) {
      if (mode === 1) c = w.owner[i] ? w.countries[w.owner[i] - 1].color : [90, 90, 90];
      if (mode === 1 && occupier[i] && (2 * (i % w.W) + ((i / w.W) | 0)) % 4 < 2) c = w.countries[occupier[i] - 1].color; // ocupado: listras diagonais na cor de quem ocupa
      else if (mode === 2) { const v = Math.min(1, Math.sqrt(w.pop[i] / 400)); c = [40 + 215 * v, 40 + 80 * v, 40]; }
      else if (mode === 3) c = w.resource[i] ? RES_COLORS[w.resource[i]] : [70, 70, 70];
      else if (mode === 5) c = CLIMATE_COLORS[w.climate[i]];
      else if (mode === 6) { const v = w.owner[i] ? byCountry?.[w.owner[i] - 1] ?? 0 : -1; c = v < 0 ? [70, 70, 70] : [30 + 40 * v, 50 + 110 * v, 90 + 165 * v]; } // azul: mais avançado
      else if (mode === 7) { const v = w.owner[i] ? byCountry?.[w.owner[i] - 1] ?? 0.5 : -1; c = v < 0 ? [70, 70, 70] : v < 0.5 ? [220, 60 + 260 * v, 60] : [440 - 400 * v, 200, 70]; } // vermelho → amarelo → verde
      else if (mode === 4) { const v = control?.[i] ?? 0; c = w.owner[i] ? [220 - 180 * v, 60 + 160 * v, 60] : [70, 70, 70]; } // vermelho = pouco, verde = muito
      if (urban[i] && (mode === 0 || mode === 1 || mode === 3)) c = mode === 1 ? c.map((v) => v * 0.6) : URBAN_COLOR;
    }
    out[i * 4] = c[0]; out[i * 4 + 1] = c[1]; out[i * 4 + 2] = c[2];
    // alfa = id do bioma para o shader; 255 = desenhar cor lisa (cidade, ou modo que não é terreno)
    out[i * 4 + 3] = mode === 0 && !urban[i] ? t : 255;
  }
  return out;
}

/** Arquivo de imagem de cada bioma em public/biomas/, na ordem de TERRAINS. */
export const BIOME_FILES = TERRAINS.map((t) => t.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() + ".png");

// ---------- Rios (nas bordas dos hexágonos, como no Civ) ----------
// Borda k do hex (pointy-top, y para baixo): 0 NE, 1 E, 2 SE, 3 SW, 4 W, 5 NW. A borda oposta é (k + 3) % 6.
// Canto k fica entre as bordas k−1 e k: 0 topo, 1 cima-direita, 2 baixo-direita, 3 base, 4 baixo-esquerda, 5 cima-esquerda.
const NB_EVEN = [[0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const NB_ODD = [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 0], [0, -1]];

/** Vizinho do hex `h` do outro lado da borda k (−1 fora do mapa, nos polos). */
export function across(W: number, H: number, h: number, k: number) {
  const col = h % W, row = (h / W) | 0, [dc, dr] = (row & 1 ? NB_ODD : NB_EVEN)[k];
  const r = row + dr;
  return r < 0 || r >= H ? -1 : r * W + (((col + dc) % W) + W) % W;
}

/** Tem rio na borda k do hex h? */
export const riverAt = (w: World, h: number, k: number) => (w.river[h] >> k) & 1;

function generateRivers(w: World, elev: Float32Array, minElev: number, rand: () => number) {
  const { W, H, terrain } = w;
  const N = W * H;
  const mark = (h: number, k: number, nav: boolean) => {
    const n = across(W, H, h, k);
    w.river[h] |= 1 << k; if (nav) w.navigable[h] |= 1 << k;
    if (n >= 0) { w.river[n] |= 1 << ((k + 3) % 6); if (nav) w.navigable[n] |= 1 << ((k + 3) % 6); }
  };
  // um canto é (hex, k); os 3 hexes em volta dele: o próprio, o do outro lado da borda k−1 e o da borda k
  const around = (h: number, k: number) => [h, across(W, H, h, (k + 5) % 6), across(W, H, h, k)];
  const cornerElev = (h: number, k: number) => { const hs = around(h, k); return hs.some((x) => x < 0) ? 1 : hs.reduce((s, x) => s + elev[x], 0) / 3; };
  const touchesSea = (h: number, k: number) => around(h, k).some((x) => x >= 0 && terrain[x] === T.OCEAN);
  const key = (h: number, k: number) => { // mesmo canto visto por qualquer um dos 3 hexes
    const a = across(W, H, h, (k + 5) % 6), b = across(W, H, h, k);
    return Math.min(h * 6 + k, a >= 0 ? a * 6 + ((k + 2) % 6) : Infinity, b >= 0 ? b * 6 + ((k + 4) % 6) : Infinity);
  };
  const riverCorner = new Set<number>();
  const sources = Math.round(w.landCount / 250);
  for (let s = 0, tries = 0; s < sources && tries < sources * 50; tries++) {
    const src = (rand() * N) | 0;
    if (!isLand(terrain[src]) || elev[src] < minElev) continue;
    s++;
    let h = src, k = 0; // começa no canto de cima do hex de origem
    const path: [number, number][] = []; // bordas do caminho (hex, k)
    const seen = new Set<number>([key(h, k)]);
    const edgesOn = new Map<number, number>(); // bordas do caminho por hex (3+ = rio dando voltas num hex)
    const useEdge = (x: number) => (edgesOn.get(x) ?? 0) < 2;
    let reachedSea = false;
    for (let step = 0; step < 300; step++) {
      if (touchesSea(h, k)) { reachedSea = true; break; }
      const b = across(W, H, h, k);
      // 3 cantos vizinhos: dois no próprio hex e um entre os dois vizinhos; cada um com a borda percorrida
      const moves: [number, number, number, number][] = [[h, (k + 1) % 6, h, k], [h, (k + 5) % 6, h, (k + 5) % 6]];
      if (b >= 0) moves.push([b, (k + 5) % 6, b, (k + 4) % 6]);
      let best: [number, number, number, number] | null = null, bestE = Infinity;
      for (const m of moves) {
        if (seen.has(key(m[0], m[1]))) continue;
        const other = across(W, H, m[2], m[3]);
        if (!useEdge(m[2]) || (other >= 0 && !useEdge(other))) continue; // evita espiral
        const ce = cornerElev(m[0], m[1]);
        if (ce < bestE) { bestE = ce; best = m; }
      }
      if (!best || bestE > cornerElev(h, k) + 0.0015) break; // pouca subida tolerada (planícies); mais que isso: bacia, vira lago
      path.push([best[2], best[3]]);
      for (const x of [best[2], across(W, H, best[2], best[3])]) if (x >= 0) edgesOn.set(x, (edgesOn.get(x) ?? 0) + 1);
      const kk = key(best[0], best[1]);
      seen.add(kk);
      h = best[0]; k = best[1];
      if (riverCorner.has(kk)) { reachedSea = true; break; } // juntou com outro rio
    }
    if (path.length < 4) continue; // filete: descarta
    if (!reachedSea && path.length >= 8 && rand() < 0.25) { // terminou numa bacia: lago (vira água; os mares fechados viram zona própria)
      for (const x of hexesInRadius(h, 1, W, H)) if (isLand(terrain[x])) { // lago de ~7 hexes em volta do fim
        terrain[x] = T.OCEAN; w.pop[x] = 0; w.resource[x] = 0; w.resource2[x] = 0; w.reserve[x] = Infinity; w.landCount--;
      }
      reachedSea = true; // o rio deságua no lago: o trecho de baixo pode ser navegável
    }
    // rio comprido que chega ao mar ou a outro rio: o trecho de baixo é navegável
    path.forEach(([ph, pk], idx) => mark(ph, pk, reachedSea && path.length >= 14 && idx >= path.length * 0.4));
    for (const [ph, pk] of path) { riverCorner.add(key(ph, pk)); riverCorner.add(key(ph, (pk + 1) % 6)); }
  }
}

/**
 * Neve: polar sempre; continental em boa parte do inverno; temperado só no auge do inverno.
 * `week` = semana do jogo; o inverno do hemisfério sul é o verão do norte.
 */
export function winterOf(w: World, i: number, week: number) {
  const phase = Math.cos((2 * Math.PI * (week % 52)) / 52); // 1 = janeiro
  return ((i / w.W) | 0) < w.H / 2 ? phase : -phase;      // 1 = auge do inverno neste hemisfério
}
export function snowAt(w: World, i: number, week: number) {
  const c = w.climate[i];
  if (!isLand(w.terrain[i])) return false;
  if (c === C.POLAR) return true;
  const wi = winterOf(w, i, week);
  return (c === C.CONTINENTAL && wi > 0.3) || (c === C.TEMPERATE && wi > 0.8);
}

/**
 * Zonas marítimas (como os nós do Victoria 3): o oceano é dividido em regiões grandes, crescendo por
 * busca em largura a partir de sementes numa grade. Mares fechados viram zona própria.
 */
export const SEA_ZONE_SPACING = { cols: 48, rows: 32 };
function generateSeaZones(w: World) {
  const { W, H, terrain, seaZone } = w;
  let next = 1;
  const grow = (seeds: number[]) => {
    let queue = seeds;
    while (queue.length) {
      const nq: number[] = [];
      for (const i of queue) forNeighbors(i % W, (i / W) | 0, W, H, (j) => {
        if (!seaZone[j] && terrain[j] === T.OCEAN) { seaZone[j] = seaZone[i]; nq.push(j); }
      });
      queue = nq;
    }
  };
  const seeds: number[] = [];
  for (let r = SEA_ZONE_SPACING.rows >> 1; r < H; r += SEA_ZONE_SPACING.rows)
    for (let c = SEA_ZONE_SPACING.cols >> 1; c < W; c += SEA_ZONE_SPACING.cols) {
      const i = r * W + c;
      if (terrain[i] === T.OCEAN && next < 65535) { seaZone[i] = next++; seeds.push(i); }
    }
  grow(seeds);
  for (let i = 0; i < W * H; i++) if (terrain[i] === T.OCEAN && !seaZone[i] && next < 65535) { seaZone[i] = next++; grow([i]); } // mares fechados
}
