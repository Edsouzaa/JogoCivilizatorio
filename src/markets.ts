// Mercados em três níveis (docs/mercados.md): local (cada cidade, com estoque), nacional (as cidades do país trocam pelo
// acesso de cada uma) e internacional (nós comerciais marítimos e terrestres, poder e vantagem comercial, política por bem).
// Mais a Complexidade da Economia (0–1000), que encarece construções sofisticadas. Configuração em MARKET.
import { GOODS, BUILDINGS, type City, type Country, type Economy } from "./economy.ts";
import { T, type World } from "./world.ts";
import { TECHS } from "./tech.ts";
import { forNeighbors } from "./hex.ts";
import { incFx } from "./admin.ts";
import { tv, tvMul, tvCut } from "./techvars.ts";

export const MARKET = {
  release: 0.5,          // fração do estoque que volta à venda por semana
  keep: 0.5,             // fração do encalhe que é guardada (o resto se perde: sem comprador)
  spoilFood: 0.1, spoilOther: 0.01, // estoque estragado por semana (comida apodrece)
  storagePerSize: 15,    // capacidade de estoque por bem por tamanho de cidade (× 1 + era/2) + estruturas comerciais
  accessBase: [0.3, 0.4, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.9, 0.95], // acesso ao mercado nacional por era, antes da infraestrutura
  accessRoad: 0.08, accessWater: 0.15, accessDistance: 60, // estrada por nível, porto/rio navegável; −1 a cada tantos hexes da capital
  powerPop: 1000,        // poder comercial: +1 a cada tantas pessoas da cidade
  powerHarbor: 2,        // + por nível de porto
  complexityTech: { Indústria: 6, Comércio: 6, Ciência: 5, Infraestrutura: 5, Governo: 4, Militar: 3, Naval: 3, Agricultura: 2, Sociedade: 3 } as Record<string, number>,
  complexityGood: 5,     // por bem produzido no país
  complexityUrban: 300,  // × fração da gente nas cidades
  complexityStep: 0.1,   // anda 10% por mês até o alvo (sobe e cai devagar)
};
export const FOODS = ["Grãos", "Frutas e vegetais", "Carne e caça", "Produtos alimentícios"];
export const POLICIES = ["Livre", "Proibir exportação", "Reservar consumo interno", "Prioridade à exportação", "Proibir importação"] as const;
export type Policy = (typeof POLICIES)[number];
export const policyOf = (c: Country, gi: number): Policy => (c.tradePolicy?.[GOODS[gi]] as Policy) ?? "Livre";

/** Estrutura comercial do edifício (se for uma). */
export const commerceOf = (b: number) => BUILDINGS[b].industry?.commerce;
function cityCommerce(e: Economy, city: City) {
  let storage = 0, access = 0, power = 0;
  for (const j of city.urban) for (let b = 0; b < BUILDINGS.length; b++) { const cm = commerceOf(b), lv = e.levels[b][j]; if (cm && lv) { storage += cm.storage * lv; access += cm.access * lv; power += cm.power * lv; } }
  return { storage, access: Math.min(0.4, access), power };
}

// ---------- mercado local: estoque
/** Início da semana: parte do estoque volta à venda. */
export function releaseStock(e: Economy) {
  for (const k of e.cities) {
    const m = k.market, st = (m.stock ??= new Float64Array(GOODS.length)), rel = (m.released ??= new Float64Array(GOODS.length));
    for (let g = 1; g < GOODS.length; g++) { rel[g] = st[g] * MARKET.release; st[g] -= rel[g]; m.supply[g] += rel[g]; }
  }
}
/** Fim da semana (depois dos preços): o que encalhou vai para o estoque, até a capacidade; o estoque estraga um pouco. */
export function storeSurplus(e: Economy) {
  for (const k of e.cities) {
    const m = k.market, st = (m.stock ??= new Float64Array(GOODS.length)), c = e.countries[k.country - 1];
    const cap = (MARKET.storagePerSize * k.size * (1 + c.research.era / 2) + cityCommerce(e, k).storage) * tvMul(c.research, "storageCapacity");
    for (let g = 1; g < GOODS.length; g++) {
      const unsold = Math.max(0, m.supply[g] - m.used[g] - m.demand[g]);
      st[g] = Math.min(cap, (st[g] + unsold * MARKET.keep) * (1 - (FOODS.includes(GOODS[g]) ? MARKET.spoilFood * tvCut(c.research, "foodPreservation") : MARKET.spoilOther)));
    }
  }
}

// ---------- mercado nacional: acesso de cada cidade
/** Uma vez por mês: acesso de cada cidade ao mercado nacional (0–1) pela era, estrada, água, estruturas e distância. */
export function updateAccess(w: World, e: Economy) {
  for (const k of e.cities) {
    const c = e.countries[k.country - 1], cap = e.cities.find((x) => x.country === k.country)!;
    const dx = Math.min(Math.abs((k.hex % w.W) - (cap.hex % w.W)), w.W - Math.abs((k.hex % w.W) - (cap.hex % w.W))), dy = Math.abs(((k.hex / w.W) | 0) - ((cap.hex / w.W) | 0));
    const water = k.port || (k.harbor ?? 0) > 0 ? MARKET.accessWater : 0;
    let a = incFx(e, e.cities.indexOf(k), "access") + tv(c.research, "marketAccess") + MARKET.accessBase[c.research.era] + MARKET.accessRoad * (k.road ?? 0) + water + cityCommerce(e, k).access - Math.max(dx, dy) / MARKET.accessDistance;
    if (k.isolated) a *= 0.5; // sem ligação por terra com a capital
    if (k === cap) a = 1;
    k.access = Math.max(0.05, Math.min(1, a));
  }
}

// ---------- internacional: nós comerciais, poder e vantagem
export type TradeNode = { id: string; name: string; kind: "marítimo" | "terrestre"; power: Record<number, number>; cities: number };
/** Nó de uma cidade: o nó marítimo da zona colada nela (cidade costeira) ou o nó terrestre do continente. */
export function nodeOf(w: World, k: City): string {
  for (const j of k.urban) { let z = -1; forNeighbors(j % w.W, (j / w.W) | 0, w.W, w.H, (n) => { if (z < 0 && w.terrain[n] === T.OCEAN) z = w.seaZone[n]; }); if (z >= 0) return `mar:${z}`; }
  return `terra:${w.continent?.[k.hex] ?? 0}`;
}
/** Uma vez por mês: monta os nós e o poder comercial de cada país em cada um. */
export function updateNodes(w: World, e: Economy) {
  const nodes = new Map<string, TradeNode>();
  for (const k of e.cities) {
    const id = (k.node = nodeOf(w, k));
    if (!nodes.has(id)) { const [kind, n] = id.split(":"); nodes.set(id, { id, kind: kind === "mar" ? "marítimo" : "terrestre", name: kind === "mar" ? `Mar ${n}` : (w.continents?.[+n - 1]?.name ?? `Terras ${n}`), power: {}, cities: 0 }); }
    const nd = nodes.get(id)!, p = k.market.pop / MARKET.powerPop + MARKET.powerHarbor * (k.harbor ?? 0) + (k.road ?? 0) + cityCommerce(e, k).power;
    nd.power[k.country] = (nd.power[k.country] ?? 0) + p; nd.cities++;
  }
  e.tradeNodes = [...nodes.values()];
}
/** Vantagem comercial: eficiência com que o país transforma presença em comércio (tecnologia, era, tarifa, infraestrutura). */
export function advantage(e: Economy, country: number, econTrade: number, tradeTech: number) {
  const c = e.countries[country - 1], ks = e.cities.filter((k) => k.country === country);
  const infra = ks.length ? ks.reduce((s, k) => s + (k.access ?? 0.5), 0) / ks.length : 0.5;
  return Math.max(0.2, Math.min(2, econTrade * (1 + tradeTech) * (0.5 + infra) * (c.tariffRate !== undefined ? 1 - c.tariffRate : 1)));
}
/** Parte do país no poder comercial dos nós que ele divide com o parceiro (0..1; 0,5 = iguais). */
export function powerShare(e: Economy, a: number, b: number) {
  let pa = 0, pb = 0;
  for (const n of e.tradeNodes ?? []) if (n.power[a] && n.power[b]) { pa += n.power[a]; pb += n.power[b]; }
  return pa + pb > 0 ? pa / (pa + pb) : 0.5;
}

// ---------- Complexidade da Economia
const sectorOf = (name: string) => {
  const t = TECHS.find((x) => x.name === name)!;
  return t.army || t.fleet || t.air || t.manpower ? "Militar" : t.research || t.unrest ? "Ciência" : t.trade ? "Comércio" : t.unlocks?.length || t.bonus?.some(([b]) => b !== "Fazenda" && b !== "Pasto") ? "Indústria" : "Agricultura";
};
/** Alvo de complexidade do país: tecnologias (cada uma uma vez), bens diferentes produzidos e urbanização. */
export function complexityTarget(w: World, e: Economy, country: number) {
  const c = e.countries[country - 1];
  let v = 0;
  for (const t of c.research.known) v += MARKET.complexityTech[sectorOf(t)] ?? 3;
  const made = new Set<number>(); let urban = 0;
  for (const k of e.cities) if (k.country === country) { k.market.supply.forEach((s, g) => { if (s > 0.01 && g) made.add(g); }); for (const j of k.urban) urban += w.pop[j]; }
  return Math.min(1000, v + made.size * MARKET.complexityGood + MARKET.complexityUrban * Math.min(1, urban / Math.max(1, c.pop)));
}
export function updateComplexity(w: World, e: Economy) {
  e.countries.forEach((c, ci) => { const t = complexityTarget(w, e, ci + 1); c.complexity = (c.complexity ?? t) + (t - (c.complexity ?? t)) * MARKET.complexityStep; });
}
/** Impacto da complexidade por construção (fração máxima de custo a mais com complexidade 1000). */
export const COMPLEXITY_IMPACT = {
  low: 0.05, medium: 0.15, high: 0.3, veryHigh: 0.45,
  veryHighSet: ["Fábrica de eletrônicos", "Fábrica de baterias", "Usina nuclear", "Fábrica de telecomunicações", "Fábrica de equipamentos de energia", "Arsenal naval", "Fundição de alumínio"],
  highSet: ["Siderúrgica", "Fábrica química", "Refinaria", "Fábrica de máquinas", "Aciaria", "Fábrica têxtil", "Arsenal", "Fábrica de plásticos", "Fábrica de fertilizantes", "Fábrica de medicamentos", "Fábrica de cimento", "Usina termelétrica", "Estaleiro", "Centro comercial", "Bolsa de comércio", "Companhia comercial", "Centro logístico comercial"],
};
export function complexityImpact(b: number) {
  const n = BUILDINGS[b].name, I = COMPLEXITY_IMPACT;
  return I.veryHighSet.includes(n) ? I.veryHigh : I.highSet.includes(n) ? I.high : BUILDINGS[b].industry ? I.medium : I.low;
}
/** Multiplicador do custo em dinheiro (e, pela metade, em pontos de construção) da construção b no país. */
export const complexityCost = (c: Country, b: number) => 1 + complexityImpact(b) * (c.complexity ?? 0) / 1000 * tvCut(c.research, "industrialComplexity");
