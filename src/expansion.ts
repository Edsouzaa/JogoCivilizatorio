// Expansão por etapas (docs/roadmap.md): interesse → claim → expedição (colonos andando) → posto avançado ou cidade
// → consolidação (controle subindo) → integração (cidade ligada ao resto do país).
// Fundar longe não é proibido: só fica mais caro, conta na capacidade de expansão e a cidade nasce isolada.
import { forNeighbors, hexesInRadius } from "./hex.ts";
import { T, isLand, type World } from "./world.ts";
import type { Economy } from "./economy.ts";

export const EXPAND = {
  foundBase: 60,       // dinheiro para fundar uma cidade (× multiplicador da distância)
  outpostCost: 30,     // posto avançado (acampamento)
  influence: 2,        // área de influência: hexes além da fronteira da cidade
  isolation: 0.6,      // cidade isolada: controle máximo × isto na região dela
  capacityWeeks: 104,  // cidades fundadas nos últimos 2 anos contam na capacidade de expansão
  maxSearch: 40,       // custo de caminho máximo procurado (mais que isso = expansão remota)
};
/** Multiplicador pela distância (custo de caminho até a cidade ou posto mais perto). */
export const distanceMult = (d: number) => (d <= 3 ? 1 : d <= 6 ? 1.25 : d <= 10 ? 1.75 : d <= 15 ? 2.5 : 3.5);
export const distanceLabel = (d: number) => (d <= 3 ? "muito próxima" : d <= 6 ? "próxima" : d <= 10 ? "distante" : d <= 15 ? "muito distante" : "remota");

/** Custo de atravessar o hex: terreno difícil pesa; rio navegável e costa encurtam (rotas de água). */
function stepCost(w: World, i: number) {
  if (w.terrain[i] === T.OCEAN) return 0.6; // costa: vai de barco
  if (w.navigable[i]) return 0.5;
  const t = w.terrain[i];
  return t === T.MOUNTAIN ? 3 : t === T.HILLS || t === T.FOREST || t === T.JUNGLE || t === T.TAIGA ? 1.5 : t === T.ICE ? 4 : 1;
}

/** Âncoras do país: cidades e postos avançados (de onde a expansão parte). */
export const anchors = (e: Economy, country: number) => [
  ...e.cities.filter((k) => k.country === country).map((k) => k.hex),
  ...(e.outposts ?? []).filter((o) => o.country === country).map((o) => o.hex),
];

/** Distância de caminho (pelo terreno) do hex até a âncora mais perto do país. Infinity se passar de maxSearch. */
export function pathDistance(w: World, e: Economy, country: number, from: number) {
  const goal = new Set(anchors(e, country));
  if (goal.has(from)) return 0;
  const dist = new Map<number, number>([[from, 0]]);
  let open = [from];
  while (open.length) { // Dijkstra simples (lista pequena: o raio é limitado)
    open.sort((a, b) => dist.get(a)! - dist.get(b)!);
    const i = open.shift()!, d = dist.get(i)!;
    if (goal.has(i)) return d;
    if (d > EXPAND.maxSearch) break;
    forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => {
      const nd = d + stepCost(w, j);
      if (nd < (dist.get(j) ?? Infinity)) { if (!dist.has(j)) open.push(j); dist.set(j, nd); }
    });
  }
  return Infinity;
}

export type ExpansionClaim = "Proximidade" | "Continuidade" | "Recursos" | "Estratégico" | "Assentamento distante";
const RICH = new Set(["Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Especiarias", "Sal", "Cavalos"]);
/** Que tipo de reivindicação justifica fundar aqui (o mais barato que couber). */
export function expansionClaim(w: World, e: Economy, country: number, hex: number, d: number, resourceNames: string[]): ExpansionClaim {
  const near = anchors(e, country).filter((a) => hexesInRadius(hex, 6, w.W, w.H).includes(a)).length;
  if (near >= 2) return "Continuidade";
  if (d <= 6 || e.influence?.[hex] === country) return "Proximidade";
  const around = hexesInRadius(hex, 1, w.W, w.H);
  if (around.some((j) => RICH.has(resourceNames[w.resource[j]]))) return "Recursos";
  if (around.some((j) => w.terrain[j] === T.OCEAN || w.navigable[j] || w.terrain[j] === T.MOUNTAIN)) return "Estratégico";
  return "Assentamento distante";
}
/** Claim com justificativa (recursos, estratégico) barateia a fundação distante. */
const CLAIM_DISCOUNT: Record<ExpansionClaim, number> = { "Proximidade": 1, "Continuidade": 0.8, "Recursos": 0.85, "Estratégico": 0.85, "Assentamento distante": 1 };

/** Capacidade de expansão: quantas cidades o país aguenta fundar a cada 2 anos. */
export const expansionCapacity = (e: Economy, country: number) => 1 + e.countries[country - 1].research.era + Math.floor(e.cities.filter((k) => k.country === country).length / 4);
export const recentFoundings = (e: Economy, country: number) => e.cities.filter((k) => k.country === country && k.founded !== undefined && e.week - k.founded < EXPAND.capacityWeeks).length;

/** Quanto custa fundar uma cidade no hex (e por quê). */
export function foundingCost(w: World, e: Economy, country: number, hex: number, resourceNames: string[]) {
  const d = pathDistance(w, e, country, hex), dd = Number.isFinite(d) ? d : 99;
  const claim = expansionClaim(w, e, country, hex, dd, resourceNames);
  return { distance: dd, claim, cost: Math.round(EXPAND.foundBase * distanceMult(dd) * CLAIM_DISCOUNT[claim]) };
}

/**
 * Uma vez por mês: área de influência (hexes livres perto das cidades) e continuidade territorial —
 * cidade que não chega à capital por terra do país (nem tem porto/rio navegável) fica isolada.
 */
export function updateExpansion(w: World, e: Economy, radiusOf: (size: number) => number) {
  const N = w.W * w.H;
  e.outposts = (e.outposts ?? []).filter((o) => w.owner[o.hex] === o.country); // posto tomado ou perdido some
  const inf = (e.influence ??= new Uint16Array(N));
  inf.fill(0);
  for (const k of e.cities) for (const j of hexesInRadius(k.hex, radiusOf(k.size) + EXPAND.influence, w.W, w.H)) if (!w.owner[j] && isLand(w.terrain[j]) && !inf[j]) inf[j] = k.country;
  for (const o of e.outposts ?? []) for (const j of hexesInRadius(o.hex, 2, w.W, w.H)) if (!w.owner[j] && isLand(w.terrain[j]) && !inf[j]) inf[j] = o.country;
  // conectividade: busca por terra do país a partir da capital
  const capitals = new Map<number, number>();
  for (const k of e.cities) if (!capitals.has(k.country)) capitals.set(k.country, k.hex);
  const reached = new Uint8Array(N);
  for (const [country, cap] of capitals) {
    const queue = [cap]; reached[cap] = 1;
    for (let q = 0; q < queue.length; q++) forNeighbors(queue[q] % w.W, (queue[q] / w.W) | 0, w.W, w.H, (j) => { if (!reached[j] && w.owner[j] === country) { reached[j] = 1; queue.push(j); } });
  }
  for (const k of e.cities) k.isolated = !reached[k.hex] && !k.port && !(k.harbor ?? 0); // água também liga
}

/** Posto avançado: colonos viram um acampamento que reivindica o hex e espalha influência (base para expandir). */
export function buildOutpost(w: World, e: Economy, unit: number): string | null {
  const s = e.divisions.find((d) => d.id === unit && d.kind === "settler");
  if (!s) return "Selecione um grupo de colonos";
  const i = s.hex, c = e.countries[s.country - 1];
  if (!isLand(w.terrain[i])) return "Precisa ser em terra";
  if (w.owner[i] && w.owner[i] !== s.country) return "Território de outro país";
  if ((e.outposts ?? []).some((o) => o.hex === i) || e.cities.some((k) => k.hex === i)) return "Já tem assentamento aqui";
  if (c.treasury < EXPAND.outpostCost) return `Precisa de ${EXPAND.outpostCost} no tesouro`;
  c.treasury -= EXPAND.outpostCost;
  (e.outposts ??= []).push({ country: s.country, hex: i });
  w.owner[i] = s.country;
  e.divisions = e.divisions.filter((d) => d !== s);
  return null;
}
