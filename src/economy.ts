import { RESOURCES, type World } from "./world.ts";

// Preço base por recurso (mesma ordem de RESOURCES; 0 = "sem recurso").
const BASE: Record<string, number> = {
  "Grãos": 10, "Frutas e vegetais": 10, "Carne e caça": 14, "Peles": 18, "Madeira": 12, "Pedra": 10, "Fibras": 12,
  "Argila": 8, "Sal": 15, "Cobre": 30, "Estanho": 35, "Ferro": 30, "Ouro": 120, "Prata": 80, "Pedras preciosas": 150,
  "Especiarias": 60, "Cavalos": 50, "Gado": 30, "Carvão mineral": 20, "Enxofre": 25, "Petróleo": 40,
};
export const BASE_PRICE = RESOURCES.map((n) => BASE[n] ?? 0);
const FOOD = new Set(["Grãos", "Frutas e vegetais", "Carne e caça"].map((n) => RESOURCES.indexOf(n)));
const G = RESOURCES.length;
const ids = (...names: string[]) => names.map((n) => { const k = RESOURCES.indexOf(n); if (k < 0) throw new Error(n); return k; });

/**
 * Construções. Extratora: produz o recurso do hex. Melhoria: multiplica a extratora indicada em `boosts`.
 * Cada nível ocupa `workers` pessoas, que saem do manpower do país.
 */
export const BUILDINGS: { name: string; for: number[]; workers: number; boosts?: number; mult?: number }[] = [];
const add = (b: (typeof BUILDINGS)[number]) => BUILDINGS.push(b) - 1;
const FARM = add({ name: "Fazenda", for: ids("Grãos", "Frutas e vegetais", "Fibras", "Especiarias"), workers: 500 });
add({ name: "Irrigação", for: BUILDINGS[FARM].for, workers: 200, boosts: FARM, mult: 0.5 });
const PASTURE = add({ name: "Pasto", for: ids("Cavalos", "Gado"), workers: 300 });
add({ name: "Estábulo", for: BUILDINGS[PASTURE].for, workers: 150, boosts: PASTURE, mult: 0.4 });
add({ name: "Acampamento de caça", for: ids("Carne e caça", "Peles"), workers: 300 });
const LUMBER = add({ name: "Serraria", for: ids("Madeira"), workers: 400 });
add({ name: "Trilhas de transporte", for: BUILDINGS[LUMBER].for, workers: 150, boosts: LUMBER, mult: 0.3 });
const MINE = add({ name: "Mina", for: ids("Pedra", "Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Pedras preciosas", "Carvão mineral", "Enxofre", "Sal"), workers: 700 });
add({ name: "Galerias escoradas", for: BUILDINGS[MINE].for, workers: 300, boosts: MINE, mult: 0.5 });
add({ name: "Barreiro", for: ids("Argila"), workers: 250 });
add({ name: "Poço", for: ids("Petróleo"), workers: 400 });
const B = BUILDINGS.length;

export const MIN_PRICE = 0.5, MAX_PRICE = 1.75; // -50% a +75% do preço base

/** Fator de preço pela oferta e demanda: falta empurra para +75%, sobra para -50%. */
export function priceFactor(supply: number, demand: number) {
  if (supply <= 0 && demand <= 0) return 1;
  return Math.min(MAX_PRICE, Math.max(MIN_PRICE, 1 + (demand - supply) / Math.max(supply, demand)));
}

export type Country = {
  treasury: number; debt: number; tax: number;
  gdpWeek: number; income: number; upkeep: number; interest: number;
  bankruptWeeks: number; pop: number;
  manpower: number; // pessoas livres para trabalhar em novas construções (e, no futuro, para o exército)
  supply: Float64Array; demand: Float64Array; price: Float64Array;
  gdpHistory: number[]; // PIB anual, um ponto por mês
};

export const RULES = {
  outputPerLevel: 5,        // unidades por semana por nível de extratora
  buildCost: 100,           // custo do nível n = buildCost * n
  upkeepPerLevel: 0.5,      // por semana, por nível de qualquer construção
  interestYear: 0.05,       // juros anuais da dívida
  bankruptDebtToGdp: 2,     // dívida > 2× PIB anual = falência
  bankruptPenalty: 0.75,    // produção ×0.75 enquanto falido
  bankruptWeeks: 52,
  foodPerPop: 1 / 20000,    // demanda semanal de comida por pessoa (calibrado p/ oferta ≈ demanda no início)
  goodsPerPop: 1 / 40000,   // demanda semanal dos outros bens
  manpowerShare: 0.1,       // fração da população que pode ser mobilizada (trabalho ou exército)
  hexLaborShare: 0.3,       // fração da população do hex que trabalha nas construções dele
};

/** levels[b][i] = nível da construção b no hex i. */
export type Economy = { week: number; levels: Uint8Array[]; producers: Int32Array; countries: Country[] };

/** Construções que podem existir no hex i (pelo recurso dele). */
export const buildingsFor = (resource: number) => BUILDINGS.map((_, b) => b).filter((b) => BUILDINGS[b].for.includes(resource));
const extractorFor = (resource: number) => BUILDINGS.findIndex((b) => b.boosts === undefined && b.for.includes(resource));

export function createEconomy(w: World): Economy {
  const N = w.W * w.H, levels = Array.from({ length: B }, () => new Uint8Array(N)), prod: number[] = [];
  const countries: Country[] = w.countries.map(() => ({
    treasury: 500, debt: 0, tax: 0.15, gdpWeek: 0, income: 0, upkeep: 0, interest: 0, bankruptWeeks: 0, pop: 0, manpower: 0,
    supply: new Float64Array(G), demand: new Float64Array(G), price: new Float64Array(G).fill(1), gdpHistory: [],
  }));
  for (let i = 0; i < N; i++) {
    if (!w.owner[i]) continue;
    const c = countries[w.owner[i] - 1];
    c.pop += w.pop[i];
    const ex = w.resource[i] ? extractorFor(w.resource[i]) : -1;
    if (ex >= 0) { levels[ex][i] = 1; prod.push(i); c.manpower -= BUILDINGS[ex].workers; } // começa com extratora nível 1
  }
  for (const c of countries) c.manpower += c.pop * RULES.manpowerShare;
  return { week: 0, levels, producers: Int32Array.from(prod), countries };
}

export function buildCost(e: Economy, b: number, i: number) { return RULES.buildCost * (e.levels[b][i] + 1); }

/** Constrói (ou melhora) a construção b no hex i. O que faltar no tesouro vira dívida. Retorna erro ou null. */
export function build(w: World, e: Economy, i: number, b: number): string | null {
  const def = BUILDINGS[b];
  if (!w.owner[i]) return "Hex sem dono";
  if (!def || !def.for.includes(w.resource[i])) return "Construção não serve para este recurso";
  if (def.boosts !== undefined && !e.levels[def.boosts][i]) return `Precisa de ${BUILDINGS[def.boosts].name} antes`;
  if (e.levels[b][i] >= 255) return "Nível máximo";
  const c = e.countries[w.owner[i] - 1];
  if (c.manpower < def.workers) return `Manpower insuficiente (precisa ${def.workers})`;
  c.treasury -= buildCost(e, b, i);
  if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
  c.manpower -= def.workers;
  if (!e.producers.includes(i)) e.producers = Int32Array.from([...e.producers, i]);
  e.levels[b][i]++;
  return null;
}

/** Avança uma semana. */
// shortcut: cada país é um mercado fechado (sem comércio entre países), trocar quando entrar comércio/nós.
export function tick(w: World, e: Economy) {
  for (const c of e.countries) { c.supply.fill(0); c.upkeep = 0; }
  for (const i of e.producers) {
    const c = e.countries[w.owner[i] - 1];
    let base = 0, mult = 1, required = 0;
    for (let b = 0; b < B; b++) {
      const lv = e.levels[b][i];
      if (!lv) continue;
      const def = BUILDINGS[b];
      if (def.boosts === undefined) base += lv * RULES.outputPerLevel; else mult += lv * def.mult!;
      required += lv * def.workers;
      c.upkeep += lv * RULES.upkeepPerLevel;
    }
    const staffing = required ? Math.min(1, (w.pop[i] * RULES.hexLaborShare) / required) : 0; // hex vazio não opera tudo
    c.supply[w.resource[i]] += base * mult * staffing * (c.bankruptWeeks > 0 ? RULES.bankruptPenalty : 1);
  }
  for (const c of e.countries) {
    let gdp = 0;
    for (let g = 1; g < G; g++) {
      c.demand[g] = c.pop * (FOOD.has(g) ? RULES.foodPerPop : RULES.goodsPerPop);
      c.price[g] = priceFactor(c.supply[g], c.demand[g]);
      gdp += c.supply[g] * BASE_PRICE[g] * c.price[g];
    }
    c.gdpWeek = gdp;
    c.income = gdp * c.tax;
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
  }
  e.week++;
}

export function dateLabel(week: number) {
  const year = -2000 + Math.floor(week / 52), w = (week % 52) + 1;
  return `${year < 0 ? `${-year} a.C.` : `${year + 1} d.C.`} · semana ${w}`; // não existe ano 0
}
