import { RESOURCES, TERRAINS, isLand, type World } from "./world.ts";
import { hexDistance, hexesInRadius, forNeighbors } from "./hex.ts";
import { newResearch, research, ERAS, TECHS, TECH_FOR_BUILDING, type Research } from "./tech.ts";
import { jobsFor, idleType, newPops, distributeIncome, P, POP_RULES, type Pops } from "./pops.ts";
import { newPolitics, updatePolitics, advanceLaw, lawOf, type Politics } from "./politics.ts";

/** Bens do jogo: matérias-primas do mapa (mesmos índices de RESOURCES) + produtos industriais. */
export const GOODS = [...RESOURCES, "Bronze", "Tecidos", "Ferramentas", "Armas"];
const g = (n: string) => { const k = GOODS.indexOf(n); if (k < 0) throw new Error(`bem desconhecido: ${n}`); return k; };
const NG = GOODS.length;

const BASE: Record<string, number> = {
  "Grãos": 10, "Frutas e vegetais": 10, "Carne e caça": 14, "Peles": 18, "Madeira": 12, "Pedra": 10, "Fibras": 12,
  "Argila": 8, "Sal": 15, "Cobre": 30, "Estanho": 35, "Ferro": 30, "Ouro": 120, "Prata": 80, "Pedras preciosas": 150,
  "Especiarias": 60, "Cavalos": 50, "Gado": 30, "Carvão mineral": 20, "Enxofre": 25, "Petróleo": 40,
  "Bronze": 60, "Tecidos": 35, "Ferramentas": 55, "Armas": 90,
};
export const BASE_PRICE = GOODS.map((n) => BASE[n] ?? 0);

// Consumo semanal por pessoa (era tribal/antiga). Comida pesa mais; o resto é pouco por pessoa.
const POP_DEMAND = new Float64Array(NG).fill(1 / 1500);
POP_DEMAND[0] = 0;
const FOOD = ["Grãos", "Frutas e vegetais", "Carne e caça"].map(g);
const BASIC_NEEDS = [...FOOD, g("Peles"), g("Madeira")];
for (const f of FOOD) POP_DEMAND[f] = 1 / 200;
POP_DEMAND[g("Tecidos")] = 1 / 300; POP_DEMAND[g("Ferramentas")] = 1 / 800; POP_DEMAND[g("Armas")] = 1 / 3000;
POP_DEMAND[g("Bronze")] = 1 / 4000;

type Building = {
  name: string; workers: number;
  for: number[];                 // recursos do hex onde pode ser construída (vazio = qualquer, se industrial)
  boosts?: number; mult?: number; // melhoria: multiplica a extratora `boosts`
  industry?: { inputs: [number, number][]; outputs: [number, number][] }; // só em hex urbano
};
/**
 * Construções. Extratora: produz o recurso do hex. Melhoria: multiplica uma extratora.
 * Indústria: só em hex de cidade; compra insumos no mercado da cidade e vende o produto nele.
 * Cada nível ocupa `workers` pessoas, que saem do manpower do país.
 */
export const BUILDINGS: Building[] = [];
const add = (b: Building) => BUILDINGS.push(b) - 1;
const res = (...names: string[]) => names.map(g);
const FARM = add({ name: "Fazenda", for: res("Grãos", "Frutas e vegetais", "Fibras", "Especiarias"), workers: 20 });
add({ name: "Irrigação", for: BUILDINGS[FARM].for, workers: 10, boosts: FARM, mult: 0.5 });
const PASTURE = add({ name: "Pasto", for: res("Cavalos", "Gado"), workers: 15 });
add({ name: "Estábulo", for: BUILDINGS[PASTURE].for, workers: 8, boosts: PASTURE, mult: 0.4 });
add({ name: "Acampamento de caça", for: res("Carne e caça", "Peles"), workers: 15 });
const LUMBER = add({ name: "Serraria", for: res("Madeira"), workers: 20 });
add({ name: "Trilhas de transporte", for: BUILDINGS[LUMBER].for, workers: 8, boosts: LUMBER, mult: 0.3 });
const MINE = add({ name: "Mina", for: res("Pedra", "Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Carvão mineral", "Enxofre", "Sal"), workers: 30 });
add({ name: "Galerias escoradas", for: BUILDINGS[MINE].for, workers: 15, boosts: MINE, mult: 0.5 });
add({ name: "Barreiro", for: res("Argila"), workers: 12 });
add({ name: "Poço", for: res("Petróleo"), workers: 20 });
// Cadeia curta. A ordem importa: Bronze sai antes das Armas no mesmo tick.
add({ name: "Fundição de bronze", for: [], workers: 40, industry: { inputs: [[g("Cobre"), 2], [g("Estanho"), 1]], outputs: [[g("Bronze"), 2]] } });
add({ name: "Tecelagem", for: [], workers: 30, industry: { inputs: [[g("Fibras"), 2]], outputs: [[g("Tecidos"), 2]] } });
add({ name: "Ferraria", for: [], workers: 35, industry: { inputs: [[g("Ferro"), 1], [g("Madeira"), 1]], outputs: [[g("Ferramentas"), 2]] } });
add({ name: "Armeiro", for: [], workers: 35, industry: { inputs: [[g("Bronze"), 1], [g("Madeira"), 1]], outputs: [[g("Armas"), 1]] } });
const NB = BUILDINGS.length;
const INDUSTRIES = BUILDINGS.map((_, b) => b).filter((b) => BUILDINGS[b].industry);
for (const [name] of TECH_FOR_BUILDING) if (!BUILDINGS.some((b) => b.name === name)) throw new Error(`tecnologia libera construção inexistente: ${name}`);
for (const t of TECHS) for (const [name] of t.bonus ?? []) if (!BUILDINGS.some((b) => b.name === name)) throw new Error(`bônus para construção inexistente: ${name}`);

const JOBS = ERAS.map((_, era) => BUILDINGS.map((b) => jobsFor(b.name, era))); // [era][construção]

/** Tecnologia que a construção b exige, se exigir alguma. */
export const techFor = (b: number) => TECH_FOR_BUILDING.get(BUILDINGS[b].name);

export const MIN_PRICE = 0.5, MAX_PRICE = 1.75; // -50% a +75% do preço base

/** Fator de preço pela oferta e demanda: falta empurra para +75%, sobra para -50%. */
export function priceFactor(supply: number, demand: number) {
  if (supply <= 0 && demand <= 0) return 1;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, 1 + (demand - supply) / Math.max(supply, demand)));
}

export const RULES = {
  outputPerLevel: 5,        // unidades por semana por nível de extratora; indústria = receita × nível
  buildCost: 100,           // custo do nível n = buildCost * n
  upkeepPerLevel: 0.5,      // por semana, por nível de qualquer construção
  interestYear: 0.05,       // juros anuais da dívida
  bankruptDebtToGdp: 2,     // dívida > 2× PIB anual = falência
  bankruptPenalty: 0.75,    // produção ×0.75 enquanto falido
  bankruptWeeks: 52,
  manpowerShare: 0.5,       // fração da população que pode ser mobilizada (trabalho ou exército); tribal = quase todos
  subsistence: 0.8,         // comida que cada hex produz sozinho, em fração do que a população dele come × fertilidade
  hexLaborShare: 0.5,       // fração da população do hex que trabalha nas construções dele
  startSettlers: 2,
  settlerCost: 200,         // dinheiro para treinar colonos
  settlerPop: 50,           // pessoas que saem da capital para virar colonos
  minCityDistance: 4,       // hexágonos entre cidades
  maxSettleDistance: 12,    // colonos só fundam até esta distância de uma cidade do país
  settleClaimRadius: 2,     // território que uma cidade nova reivindica
  taxBaseEfficiency: 0.5,   // arrecadação = imposto × (isto + legitimidade): legitimidade 0,5 arrecada 100%
  migrationWeek: 0.0005,    // fração da população rural que vai para a cidade do mercado por semana
  cityGrowthPop: 300,       // população urbana por nível de tamanho antes de crescer
  maxCitySize: 37,          // 1 + 6 + 12 + 18 = raio 3
  researchBase: 1,          // pontos de pesquisa por semana de qualquer país
  researchPerPop: 1000,     // +1 ponto por semana a cada tantas pessoas
};

export type Market = {
  supply: Float64Array; demand: Float64Array; price: Float64Array; pop: number;
  used: Float64Array;  // consumido por indústrias neste tick
  need: Float64Array;  // consumo da população + insumos a plena carga (para o comércio)
  trade: Float64Array; // > 0 importado de outras cidades do país, < 0 exportado
};
export type City = { name: string; country: number; hex: number; size: number; urban: number[]; market: Market };
export type Country = {
  treasury: number; debt: number; tax: number;
  gdpWeek: number; income: number; upkeep: number; interest: number;
  bankruptWeeks: number; pop: number;
  manpower: number; // pessoas livres para trabalhar em novas construções (e, no futuro, para o exército)
  settlers: number;
  gdpHistory: number[]; // PIB anual, um ponto por mês
  research: Research;
  pops: Pops;           // população por tipo de POP, renda e qualidade de vida
  politics: Politics;   // grupos, governo, legitimidade e leis
  subsistence: number;  // valor da comida de subsistência na semana (renda de quem não tem salário)
  bonus: Float64Array;  // +fração de produção por construção, vinda das tecnologias
  researchWeek: number; // pontos de pesquisa na última semana
};

function updateBonus(c: Country) {
  c.bonus.fill(0);
  for (const t of TECHS) if (c.research.known.has(t.name))
    for (const [name, add] of t.bonus ?? []) c.bonus[BUILDINGS.findIndex((b) => b.name === name)] += add;
}

/** levels[b][i] = nível da construção b no hex i. market[i] = cidade (1-based) cujo mercado atende o hex. */
export type Economy = {
  week: number; levels: Uint8Array[]; producers: Set<number>;
  countries: Country[]; cities: City[];
  market: Uint16Array; urban: Uint8Array; owned: Int32Array;
  version: number; // muda a cada refresh: hora de redesenhar cidades e fronteiras
};

const newMarket = (): Market => ({
  supply: new Float64Array(NG), demand: new Float64Array(NG), price: new Float64Array(NG).fill(1), pop: 0,
  used: new Float64Array(NG), need: new Float64Array(NG), trade: new Float64Array(NG),
});

/** Construções possíveis num hex com este recurso; indústrias só se o hex for urbano. */
export const buildingsFor = (resource: number, urban: boolean) =>
  BUILDINGS.map((_, b) => b).filter((b) => (BUILDINGS[b].industry ? urban : BUILDINGS[b].for.includes(resource)));
const extractorFor = (resource: number) => BUILDINGS.findIndex((b) => !b.industry && b.boosts === undefined && b.for.includes(resource));

/** Recalcula hexes urbanos, a que mercado cada hex pertence e a lista de hexes com dono. */
export function refresh(w: World, e: Economy) {
  const N = w.W * w.H;
  e.version++;
  e.urban.fill(0); e.market.fill(0);
  const owned: number[] = [];
  for (let i = 0; i < N; i++) if (w.owner[i]) owned.push(i);
  e.owned = Int32Array.from(owned);
  let queue: number[] = [];
  e.cities.forEach((c, k) => {
    c.urban = hexesInRadius(c.hex, 3, w.W, w.H).filter((j) => w.owner[j] === c.country && isLand(w.terrain[j])).slice(0, c.size);
    for (const j of c.urban) e.urban[j] = 1;
    e.market[c.hex] = k + 1; queue.push(c.hex);
  });
  // cada hex do país compra/vende no mercado da cidade mais próxima (por caminho dentro do país)
  while (queue.length) {
    const next: number[] = [];
    for (const i of queue) forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => {
      if (!e.market[j] && w.owner[j] === w.owner[i]) { e.market[j] = e.market[i]; next.push(j); }
    });
    queue = next;
  }
}

export function createEconomy(w: World): Economy {
  const N = w.W * w.H;
  const e: Economy = {
    week: 0, levels: Array.from({ length: NB }, () => new Uint8Array(N)), producers: new Set(),
    countries: w.countries.map(() => ({
      treasury: 500, debt: 0, tax: 0.15, gdpWeek: 0, income: 0, upkeep: 0, interest: 0, bankruptWeeks: 0, pop: 0,
      manpower: 0, settlers: RULES.startSettlers, gdpHistory: [],
      research: newResearch(), pops: newPops(), politics: newPolitics(), subsistence: 0, bonus: new Float64Array(NB), researchWeek: 0,
    })),
    cities: w.countries.map((c, k) => ({ name: `Capital ${k + 1}`, country: k + 1, hex: c.capital, size: 1, urban: [], market: newMarket() })),
    market: new Uint16Array(N), urban: new Uint8Array(N), owned: new Int32Array(0), version: 0,
  };
  refresh(w, e);
  for (const i of e.owned) {
    const c = e.countries[w.owner[i] - 1];
    c.pop += w.pop[i];
    const ex = w.resource[i] ? extractorFor(w.resource[i]) : -1;
    if (ex >= 0) { e.levels[ex][i] = 1; e.producers.add(i); c.manpower -= BUILDINGS[ex].workers; } // começa com extratora nível 1
  }
  for (const c of e.countries) c.manpower += c.pop * RULES.manpowerShare;
  return e;
}

export function buildCost(e: Economy, b: number, i: number) { return RULES.buildCost * (e.levels[b][i] + 1); }

/** Constrói (ou melhora) a construção b no hex i. O que faltar no tesouro vira dívida. Retorna erro ou null. */
export function build(w: World, e: Economy, i: number, b: number): string | null {
  const def = BUILDINGS[b];
  if (!w.owner[i]) return "Hex sem dono";
  if (!def) return "Construção inválida";
  if (def.industry ? !e.urban[i] : !def.for.includes(w.resource[i])) return def.industry ? "Indústria só em hex de cidade" : "Construção não serve para este recurso";
  if (def.boosts !== undefined && !e.levels[def.boosts][i]) return `Precisa de ${BUILDINGS[def.boosts].name} antes`;
  if (e.levels[b][i] >= 255) return "Nível máximo";
  const c = e.countries[w.owner[i] - 1], tech = techFor(b);
  if (tech && !c.research.known.has(tech)) return `Precisa pesquisar ${tech}`;
  if (c.manpower < def.workers) return `Manpower insuficiente (precisa ${def.workers})`;
  c.treasury -= buildCost(e, b, i);
  if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
  c.manpower -= def.workers;
  e.producers.add(i);
  e.levels[b][i]++;
  return null;
}

/** Colonos do país `country` (1-based) fundam uma cidade no hex i. */
export function foundCity(w: World, e: Economy, i: number, country: number): string | null {
  const c = e.countries[country - 1];
  if (c.settlers <= 0) return "Sem colonos";
  if (!isLand(w.terrain[i])) return "Precisa ser em terra";
  if (w.owner[i] && w.owner[i] !== country) return "Território de outro país";
  const col = i % w.W, row = (i / w.W) | 0;
  const dist = (h: number) => hexDistance(col, row, h % w.W, (h / w.W) | 0, w.W);
  if (e.cities.some((k) => dist(k.hex) < RULES.minCityDistance)) return `Muito perto de outra cidade (mínimo ${RULES.minCityDistance})`;
  if (!e.cities.some((k) => k.country === country && dist(k.hex) <= RULES.maxSettleDistance)) return `Longe demais das suas cidades (máximo ${RULES.maxSettleDistance})`;
  c.settlers--;
  for (const j of hexesInRadius(i, RULES.settleClaimRadius, w.W, w.H)) if (!w.owner[j] && isLand(w.terrain[j])) { w.owner[j] = country; c.pop += w.pop[j]; }
  e.cities.push({ name: `Cidade ${e.cities.length + 1}`, country, hex: i, size: 1, urban: [], market: newMarket() });
  refresh(w, e);
  return null;
}

/** Treina um grupo de colonos: custa dinheiro e gente da capital. */
export function trainSettlers(w: World, e: Economy, country: number): string | null {
  const c = e.countries[country - 1], capital = e.cities.find((k) => k.country === country)!;
  if (w.pop[capital.hex] < RULES.settlerPop * 2) return "Capital pequena demais";
  if (c.treasury < RULES.settlerCost) return `Precisa de ${RULES.settlerCost} no tesouro`;
  c.treasury -= RULES.settlerCost;
  w.pop[capital.hex] -= RULES.settlerPop; c.pop -= RULES.settlerPop;
  c.settlers++;
  return null;
}

/** Passa 1 de tamanho da cidade `from` para a cidade `to` (índices em e.cities), do mesmo país. */
export function transferSize(w: World, e: Economy, from: number, to: number): string | null {
  const a = e.cities[from], b = e.cities[to];
  if (!a || !b || a === b) return "Cidade inválida";
  if (a.country !== b.country) return "Só entre cidades do mesmo país";
  if (a.size <= 1) return "A cidade precisa manter tamanho 1";
  if (b.size >= RULES.maxCitySize) return "Cidade de destino no tamanho máximo";
  a.size--; b.size++;
  refresh(w, e);
  return null;
}

/**
 * Comércio entre as cidades de cada país: quem tem sobra (oferta − já usado − necessidade) manda
 * a fração da lei de Economia (tradeShare) dela para quem tem falta, dividida pela falta de cada um. `trade[gi]` > 0 = importou.
 */
// shortcut: instantâneo, sem custo por distância e só dentro do país; trocar quando entrarem rotas, nós e comércio exterior.
function trade(e: Economy, need: (m: Market, gi: number) => number) {
  const byCountry = new Map<number, Market[]>();
  for (const c of e.cities) {
    if (!byCountry.has(c.country)) byCountry.set(c.country, []);
    byCountry.get(c.country)!.push(c.market);
  }
  for (const [country, ms] of byCountry) {
    if (ms.length < 2) continue;
    const share = lawOf(e.countries[country - 1].politics, "Economia").tradeShare!; // lei de Economia
    for (let gi = 1; gi < NG; gi++) {
      let offer = 0, lack = 0;
      const net = ms.map((m) => m.supply[gi] - m.used[gi] - need(m, gi));
      for (const n of net) { if (n > 0) offer += n * share; else lack -= n; }
      const moved = Math.min(offer, lack);
      if (moved <= 0) continue;
      ms.forEach((m, k) => {
        const d = net[k] > 0 ? -net[k] * share * (moved / offer) : -net[k] * (moved / lack);
        m.supply[gi] += d; m.trade[gi] += d;
      });
    }
  }
}

/**
 * Completa a população por tipo (os empregados já foram contados nas construções): clérigos, burocratas,
 * acadêmicos e, por último, quem sobra vive de subsistência. Depois divide a renda e calcula a qualidade de vida.
 */
function updatePops(e: Economy, c: Country, country: number) {
  const n = c.pops.count, r = c.research;
  const add = (t: number, v: number) => { n[t] += v; };
  add(P["Clérigos"], c.pop * POP_RULES.clergyShare);
  if (r.era >= 1) { add(P["Burocratas"], c.pop * POP_RULES.bureaucratShare / 2); add(P["Escriturários"], c.pop * POP_RULES.bureaucratShare / 2); }
  if (r.known.has("Escrita")) add(P["Acadêmicos"], c.pop * POP_RULES.academicShare);
  const counted = n.reduce((s, v) => s + v, 0);
  if (counted > c.pop) { const k = c.pop / counted; for (let t = 0; t < n.length; t++) n[t] *= k; } // empregos além da população
  else add(idleType(r.known.has("Agricultura")), c.pop - counted);
  // custo semanal das necessidades de 1 pessoa, pelos preços da capital
  const cap = e.cities.find((k) => k.country === country)!.market;
  let needCost = 0; // só necessidades básicas: comida, peles e madeira (QV 25 = básicas cobertas)
  for (const gi of BASIC_NEEDS) needCost += POP_DEMAND[gi] * BASE_PRICE[gi] * cap.price[gi];
  distributeIncome(c.pops, c.gdpWeek, c.subsistence, needCost);
}

/** Avança uma semana. Cada cidade é um mercado; o país soma os mercados das suas cidades. */
export function tick(w: World, e: Economy) {
  for (const k of e.cities) { const m = k.market; m.supply.fill(0); m.demand.fill(0); m.used.fill(0); m.trade.fill(0); m.pop = 0; }
  for (const c of e.countries) { c.upkeep = 0; c.pop = 0; c.subsistence = 0; c.pops.count.fill(0); }

  for (const i of e.owned) {
    const k = e.market[i];
    if (!k) continue;
    const city = e.cities[k - 1];
    if (!e.urban[i] && w.pop[i] > 1) { // cidades atraem a população em volta
      const moved = w.pop[i] * RULES.migrationWeek, to = city.urban[(e.week + i) % city.urban.length];
      w.pop[i] -= moved; w.pop[to] += moved;
    }
    city.market.pop += w.pop[i];
    // subsistência: caça, coleta e roças sem construção; fazendas vêm por cima disso
    const food = w.pop[i] * POP_DEMAND[FOOD[0]] * TERRAINS[w.terrain[i]].fertility * RULES.subsistence;
    const c = e.countries[w.owner[i] - 1];
    for (const f of FOOD) { city.market.supply[f] += food; c.subsistence += food * BASE_PRICE[f] * city.market.price[f]; }
    c.pop += w.pop[i];
  }

  // throughput[cidade][b] = soma de nível × ocupação das indústrias b no mercado da cidade
  const throughput = e.cities.map(() => new Float64Array(NB));
  for (const i of e.producers) {
    const k = e.market[i];
    if (!k) continue;
    const m = e.cities[k - 1].market, c = e.countries[w.owner[i] - 1];
    let base = 0, mult = 1, required = 0;
    for (let b = 0; b < NB; b++) {
      const lv = e.levels[b][i];
      if (!lv) continue;
      const def = BUILDINGS[b];
      required += lv * def.workers;
      c.upkeep += lv * RULES.upkeepPerLevel;
      if (def.industry) continue;
      if (def.boosts === undefined) base += lv * RULES.outputPerLevel * (1 + c.bonus[b]); else mult += lv * def.mult!;
    }
    const staffing = required ? Math.min(1, (w.pop[i] * RULES.hexLaborShare) / required) : 0; // hex vazio não opera tudo
    const penalty = c.bankruptWeeks > 0 ? RULES.bankruptPenalty : 1;
    if (base) m.supply[w.resource[i]] += base * mult * staffing * penalty;
    for (let b = 0; b < NB; b++) { // quem trabalha aqui, por tipo de POP
      const lv = e.levels[b][i];
      if (lv) for (const [t, share] of JOBS[c.research.era][b]) c.pops.count[t] += lv * BUILDINGS[b].workers * staffing * share;
    }
    for (const b of INDUSTRIES) if (e.levels[b][i]) throughput[e.market[i] - 1][b] += e.levels[b][i] * staffing * penalty * (1 + c.bonus[b]);
  }

  // o que cada mercado quer: consumo da população + insumos das indústrias a plena carga
  e.cities.forEach((city, k) => {
    const m = city.market;
    for (let gi = 1; gi < NG; gi++) m.need[gi] = m.pop * POP_DEMAND[gi];
    for (const b of INDUSTRIES) for (const [gi, q] of BUILDINGS[b].industry!.inputs) m.need[gi] += q * throughput[k][b];
  });
  trade(e, (m, gi) => m.need[gi]); // matéria-prima vai para onde falta, antes de virar produto

  e.cities.forEach((city, k) => {
    const m = city.market;
    for (const b of INDUSTRIES) { // na ordem de BUILDINGS: o bronze feito aqui já serve ao armeiro
      const thr = throughput[k][b];
      if (!thr) continue;
      const { inputs, outputs } = BUILDINGS[b].industry!;
      let eff = 1;
      for (const [gi, q] of inputs) { m.demand[gi] += q * thr; eff = Math.min(eff, Math.max(0, m.supply[gi] - m.used[gi]) / (q * thr)); }
      for (const [gi, q] of inputs) m.used[gi] += q * thr * eff;
      for (const [go, q] of outputs) m.supply[go] += q * thr * eff;
    }
  });
  trade(e, (m, gi) => m.pop * POP_DEMAND[gi]); // produtos prontos circulam

  e.cities.forEach((city) => {
    const m = city.market;
    for (let gi = 1; gi < NG; gi++) {
      m.demand[gi] += m.pop * POP_DEMAND[gi];
      m.price[gi] = priceFactor(m.supply[gi], m.demand[gi]);
    }
  });

  e.countries.forEach((c, ci) => {
    let gdp = 0;
    for (const city of e.cities) {
      if (city.country !== ci + 1) continue;
      const m = city.market;
      for (let gi = 1; gi < NG; gi++) gdp += m.supply[gi] * BASE_PRICE[gi] * m.price[gi];
    }
    c.gdpWeek = gdp;
    c.tax = lawOf(c.politics, "Impostos").tax!;
    c.income = gdp * c.tax * (RULES.taxBaseEfficiency + c.politics.legitimacy); // governo legítimo arrecada mais
    c.interest = (c.debt * RULES.interestYear) / 52;
    c.treasury += c.income - c.upkeep - c.interest;
    if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
    else if (c.debt > 0) { const pay = Math.min(c.debt, c.treasury * 0.5); c.debt -= pay; c.treasury -= pay; }
    if (c.bankruptWeeks > 0) c.bankruptWeeks--;
    else if (c.debt > RULES.bankruptDebtToGdp * gdp * 52 && c.debt > 0) {
      c.bankruptWeeks = RULES.bankruptWeeks; // calote: perde metade da dívida, ganha penalidade de produção
      c.debt /= 2;
    }
    if (e.week % 4 === 0) { c.gdpHistory.push(gdp * 52); if (c.gdpHistory.length > 600) c.gdpHistory.shift(); }
    updatePops(e, c, ci + 1);
    updatePolitics(c.politics, c.pops, c.research.era);
    advanceLaw(c.politics);
    c.researchWeek = RULES.researchBase + c.pop / RULES.researchPerPop + c.pops.count[P["Acadêmicos"]] * POP_RULES.researchPerAcademic;
    if (research(c.research, c.researchWeek)) updateBonus(c);
  });

  if (e.week % 4 === 0) { // cidades crescem quando a população urbana passa do limite do tamanho atual
    let grew = false;
    for (const city of e.cities) {
      const urbanPop = city.urban.reduce((s, j) => s + w.pop[j], 0);
      if (city.size < RULES.maxCitySize && urbanPop > city.size * RULES.cityGrowthPop) { city.size++; grew = true; }
    }
    if (grew) refresh(w, e);
  }
  e.week++;
}

export function dateLabel(week: number) {
  const year = -2000 + Math.floor(week / 52), w = (week % 52) + 1;
  return `${year < 0 ? `${-year} a.C.` : `${year + 1} d.C.`} · semana ${w}`; // não existe ano 0
}

