// Subsistência (docs/subsistencia.md): a gente sem emprego vive da terra do próprio hex. Não é construção: é uma
// atividade automática que depende do terreno, da água, do clima e das tecnologias. Cada hex tem uma capacidade
// (quantas pessoas a terra sustenta); a produção por pessoa cai devagar quando a pressão passa de 80%.
// O que a família come não passa pelo mercado (fora do PIB e do imposto); só o excedente é vendido.
import { T, C, TERRAINS, isLand, weatherAt, type World } from "./world.ts";
import { forNeighbors } from "./hex.ts";
import { techSum } from "./tech.ts";
import type { Economy, Country } from "./economy.ts";

export const SUBSIST = {
  capacity: 450,        // pessoas por hex com terra fértil 1 (antes de água, clima e tecnologia)
  yieldBase: 0.4, yieldFert: 0.6, // comida por pessoa, em fração do que ela come: base + fertilidade do tipo
  techMax: 0.5,         // tecnologia aumenta a subsistência até +50% (nunca vira agricultura comercial)
  soft: 0.8,            // pressão a partir da qual a produção por pessoa começa a cair
  sell: 0.8,            // fração do excedente que chega ao mercado (o resto se perde, é trocado ou guardado em casa)
  river: 1.25, coast: 1.1, arid: 0.8, polar: 0.6,
  plots: 0.3,           // mesmo com emprego, esta fração da gente ainda vive em parte da terra (roça de casa)
  landMax: 0.85,        // construções ocupam no máximo isto da terra: a subsistência nunca some de todo
  landExtract: 0.1, landIndustry: 0.04, landOther: 0.02, landUrban: 0.4, // terra por nível (extratora, indústria, outra); centro urbano
  urbanFarm: 0.6, urbanFarmEra: 0.05, urbanFarmMin: 0.1, // fração da gente do centro urbano que ainda vive da terra (cai por era)
  weather: { calor: 0.8, lama: 0.85, chuva: 0.95, neve: 0.5, neblina: 1, limpo: 1 } as Record<string, number>, // seca, enchente...
  storagePerEra: 0.05, storageMax: 0.5, // celeiros: parte da perda pelo clima que a era evita
};

export const KINDS = ["Agricultura de subsistência", "Coleta e caça", "Pecuária de subsistência", "Pesca de subsistência", "Agricultura alagada"] as const;
export type Kind = (typeof KINDS)[number];
/** Por tipo: fertilidade efetiva (da fertilidade do terreno) e divisão da comida entre Grãos, Frutas e vegetais, Carne e caça (soma 3). */
const KIND_FX: Record<Kind, { fert: (f: number) => number; mix: [number, number, number]; extra?: [string, number] }> = {
  "Agricultura de subsistência": { fert: (f) => f, mix: [1.4, 1.1, 0.5], extra: ["Fibras", 0.05] },
  "Coleta e caça": { fert: (f) => 0.1 + f * 0.5, mix: [0.5, 1.1, 1.4], extra: ["Peles", 0.1] },
  "Pecuária de subsistência": { fert: (f) => 0.3 + f * 0.5, mix: [0.6, 0.5, 1.9], extra: ["Peles", 0.08] },
  "Pesca de subsistência": { fert: (f) => 0.45 + f * 0.3, mix: [0.6, 0.6, 1.8] }, // peixe conta como carne (não há bem Peixe)
  "Agricultura alagada": { fert: (f) => f * 1.3, mix: [1.9, 0.8, 0.3], extra: ["Fibras", 0.05] },
};

const techCache = new WeakMap<object, { n: number; v: number }>();
/** 1 + tecnologias de subsistência (até techMax); guardado enquanto o país não aprender nada novo. */
function techMul(c: Country) {
  const r = c.research, hit = techCache.get(r);
  if (hit && hit.n === r.known.size) return hit.v;
  const v = 1 + Math.min(SUBSIST.techMax, techSum(r, "subsistence"));
  techCache.set(r, { n: r.known.size, v }); return v;
}
// tipo geográfico de cada hex (o terreno não muda): calculado uma vez por mundo
const geoCache = new WeakMap<World, Uint8Array>();
function geoKind(w: World, i: number): number {
  let arr = geoCache.get(w);
  if (!arr) { arr = new Uint8Array(w.W * w.H).fill(255); geoCache.set(w, arr); }
  if (arr[i] !== 255) return arr[i];
  const t = w.terrain[i], f = TERRAINS[t].fertility;
  let coast = false;
  forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (n) => { if (w.terrain[n] === T.OCEAN) coast = true; });
  let k: number;
  if (w.river[i] && (t === T.JUNGLE || ((t === T.PLAINS || t === T.GRASS || t === T.SAVANNA) && w.climate[i] === C.TROPICAL))) k = 4;
  else if (coast && f < 0.6) k = 3;
  else if (t === T.PLAINS || t === T.GRASS) k = 0;
  else if (t === T.STEPPE || t === T.SAVANNA || t === T.HILLS) k = 2;
  else k = 1;
  return (arr[i] = k);
}
/** Tipo de subsistência do hex para o país (sem Agricultura, roça vira coleta; sem Domesticação, pasto vira caça). */
export function kindOf(w: World, i: number, c?: Country): Kind {
  let k = geoKind(w, i);
  if (c && (k === 0 || k === 4) && !c.research.known.has("Agricultura")) k = 1;
  if (c && k === 2 && !c.research.known.has("Domesticação")) k = 1;
  return KINDS[k];
}

/** Terra ocupada por construções e pelo centro urbano (0..landMax). */
export function landUsed(e: Economy, i: number, buildings: { for: readonly unknown[]; industry?: unknown }[]) {
  let u = e.urban[i] ? SUBSIST.landUrban : 0;
  if (e.producers.has(i)) for (let b = 0; b < buildings.length; b++) {
    const lv = e.levels[b][i];
    if (lv) u += lv * (buildings[b].industry ? SUBSIST.landIndustry : buildings[b].for.length ? SUBSIST.landExtract : SUBSIST.landOther);
  }
  return Math.min(SUBSIST.landMax, u);
}

export type SubInfo = { kind: Kind; capacity: number; dependants: number; pressure: number; gross: number; self: number; surplus: number; deficit: number; land: number; perGood: [number, number, number]; extra?: [string, number] };
/**
 * Subsistência de um hex numa semana. `need` = comida semanal por pessoa de cada um dos 3 bens; `jobs` = vagas das
 * construções do hex (quem trabalha nelas não vive da terra). Comida em unidades de bem por semana.
 */
export function subsistAt(w: World, e: Economy, i: number, c: Country, need: number, jobs: number, buildings: { for: readonly unknown[]; industry?: unknown }[], loss = 0): SubInfo {
  const kind = kindOf(w, i, c), fx = KIND_FX[kind], t = w.terrain[i], fert = fx.fert(TERRAINS[t].fertility);
  const tech = techMul(c);
  const water = w.river[i] ? SUBSIST.river : kind !== "Pesca de subsistência" && geoKind(w, i) === 3 ? SUBSIST.coast : 1;
  const clim = w.climate[i] === C.POLAR ? SUBSIST.polar : w.climate[i] === C.ARID && !w.river[i] ? SUBSIST.arid : 1;
  const land = landUsed(e, i, buildings);
  const capacity = isLand(t) ? SUBSIST.capacity * fert * water * clim * tech * (1 - land) : 0;
  const farmShare = e.urban[i] ? Math.max(SUBSIST.urbanFarmMin, SUBSIST.urbanFarm - SUBSIST.urbanFarmEra * c.research.era) : 1;
  const dependants = Math.max(w.pop[i] - jobs, w.pop[i] * SUBSIST.plots) * farmShare; // empregado ainda cuida da roça de casa
  const pressure = capacity > 0 ? dependants / capacity : dependants > 0 ? 9 : 0;
  // curva suave: até 80% da capacidade cada um produz cheio; acima, cada pessoa a mais rende menos (teto 120%)
  const s = SUBSIST.soft * capacity, worked = dependants <= s ? dependants : s + 0.4 * capacity * (1 - Math.exp(-(dependants - s) / (0.4 * capacity || 1)));
  const wx = SUBSIST.weather[weatherAt(w, i, e.week)] ?? 1, store = Math.min(SUBSIST.storageMax, SUBSIST.storagePerEra * c.research.era);
  const gross = worked * need * (SUBSIST.yieldBase + SUBSIST.yieldFert * fert) * tech * (1 - (1 - wx) * (1 - store)) * (1 - loss) * 3; // 3 bens de comida; loss: perda da era (armazenamento)
  const perGood = fx.mix.map((m) => (gross * m) / 3) as [number, number, number];
  let self = 0, surplus = 0;
  for (const g of perGood) { const eat = Math.min(g, dependants * need); self += eat; surplus += g - eat; }
  return { kind, capacity, dependants, pressure, gross, self, surplus, deficit: Math.max(0, dependants * need * 3 - self), land, perGood, extra: fx.extra && [fx.extra[0], fx.extra[1] * gross / 3] };
}
