import { RESOURCES, TERRAINS, T, isLand, claim, snowAt, exhaust, mulberry32, type World } from "./world.ts";
import { hexDistance, hexesInRadius, forNeighbors } from "./hex.ts";
import { newResearch, research, available, techSum, ERAS, TECHS, TECH_FOR_BUILDING, ERA_RESEARCH, START_YEAR, type Research } from "./tech.ts";
import { jobsFor, idleType, newPops, distributeIncome, updateLoyalty, lowerClassQol, P, POP_RULES, type Pops } from "./pops.ts";
import { newPolitics, updatePolitics, advanceLaw, lawOf, type Politics } from "./politics.ts";
import { cityTax, adminBonus, updateStates, type State } from "./states.ts";
import type { Flag } from "./flags.ts";
import { makeName } from "./names.ts";
import { updateControl, CONTROL } from "./control.ts";
import { relation, DIPLO, stepDiplomacy } from "./diplomacy.ts";
import { payTribute, stepSubjects, type Subject } from "./subjects.ts";
import { stepClaims, type Claim } from "./claims.ts";
import { expireProposals, type Proposal, type Vote } from "./proposals.ts";
import { rulerOf, attrMod, CHAR, noteRuler, type Character } from "./characters.ts";
import { homeIdentity, stepCulture, type Identity } from "./culture.ts";
import { ADMIN, hasIncentive, stepAdmin, INCENTIVES, type Incentive } from "./admin.ts";

/** Bens do jogo: matérias-primas do mapa (mesmos índices de RESOURCES) + produtos industriais. */
export const GOODS = [...RESOURCES, "Bronze", "Tecidos", "Ferramentas", "Armas", "Papel"];
const g = (n: string) => { const k = GOODS.indexOf(n); if (k < 0) throw new Error(`bem desconhecido: ${n}`); return k; };
const NG = GOODS.length;

const BASE: Record<string, number> = {
  "Grãos": 10, "Frutas e vegetais": 10, "Carne e caça": 14, "Peles": 18, "Madeira": 12, "Pedra": 10, "Fibras": 12,
  "Argila": 8, "Sal": 15, "Cobre": 30, "Estanho": 35, "Ferro": 30, "Ouro": 120, "Prata": 80, "Pedras preciosas": 150,
  "Especiarias": 60, "Cavalos": 50, "Gado": 30, "Carvão mineral": 20, "Enxofre": 25, "Petróleo": 40,
  "Bronze": 60, "Tecidos": 35, "Ferramentas": 55, "Armas": 90, "Papel": 30,
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
  industry?: { inputs: [number, number][]; outputs: [number, number][]; admin?: number }; // só em hex urbano; admin = pontos administrativos por nível
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
add({ name: "Oficina de papel", for: [], workers: 25, industry: { inputs: [[g("Madeira"), 2]], outputs: [[g("Papel"), 2]] } });
add({ name: "Centro administrativo", for: [], workers: 30, industry: { inputs: [[g("Papel"), 1]], outputs: [], admin: ADMIN.perLevel } });
// Revolução Industrial: fábricas grandes, mais produção por trabalhador
add({ name: "Siderúrgica", for: [], workers: 60, industry: { inputs: [[g("Ferro"), 1], [g("Carvão mineral"), 1]], outputs: [[g("Ferramentas"), 4]] } });
add({ name: "Fábrica têxtil", for: [], workers: 50, industry: { inputs: [[g("Fibras"), 2]], outputs: [[g("Tecidos"), 5]] } });
add({ name: "Arsenal", for: [], workers: 60, industry: { inputs: [[g("Ferro"), 1], [g("Carvão mineral"), 1]], outputs: [[g("Armas"), 3]] } });
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
  settlerPop: 20,           // pessoas que saem da capital para virar colonos
  minCityDistance: 4,       // hexágonos entre cidades
  settlerSupplyRange: 6,    // colonos a mais que isto de uma cidade do país ficam sem suprimentos
  settlerAttrition: 0.05,   // fração das pessoas dos colonos que morre por semana sem suprimentos
  settleClaimRadius: 1,     // território que uma cidade nova reivindica (cresce com o tamanho)
  manpowerRegen: 0.02,      // fração do teto de manpower recuperada por semana
  radicalPenalty: 0.3,      // produção × (1 − isto × fração de radicais)
  radicalLegitimacy: 0.3,   // legitimidade − isto × fração de radicais
  migrationMinQol: 5,       // diferença mínima de QV da classe baixa para alguém emigrar
  migrationMonth: 0.003,    // fração máxima da população rural que emigra por mês (com 50 pontos de diferença)
  foreignShare: 0.25,       // fração da sobra que vai para parceiros comerciais por semana
  foreignRange: 25,         // cidades a até esta distância de uma cidade do parceiro comerciam (portos: o dobro)
  tariff: 0.1,              // quem importa cobra esta fração do valor importado
  portTradeBonus: 1.5,      // cidade em rio navegável exporta esta vezes mais
  taxBaseEfficiency: 0.5,   // arrecadação = imposto × (isto + legitimidade): legitimidade 0,5 arrecada 100%
  migrationWeek: 0.0005,    // fração da população rural que vai para a cidade do mercado por semana
  cityGrowthPop: 300,       // a IA compra centro urbano quando a população urbana passa disto × tamanho
  harborCost: 120,          // porto nível n custa isto × n
  harborTrade: 0.25,        // cada nível: +25% do que a cidade troca
  roadCost: 80,             // estrada nível n custa isto × n
  roadTrade: 0.1,           // cada nível: +10% do que a cidade manda/recebe no comércio terrestre (mais barato levar)
  roadControl: 0.05,        // cada nível: +5% de controle máximo na região da cidade
  urbanCost: 150,           // centro urbano novo: isto × tamanho atual da cidade
  popCapRural: 600,         // teto de população de um hex rural (× fertilidade do terreno)
  popCapUrban: 2500,        // teto de um centro urbano...
  popCapPerEra: 0.25,       // ...que sobe isto por era (saneamento, técnicas)
  urbanExtract: 0.5,        // centro urbano tira só metade dos recursos naturais...
  urbanIndustry: 1.25,      // ...mas a indústria rende mais
  maxCitySize: 37,          // 1 + 6 + 12 + 18 = raio 3
  researchBase: 3,          // pontos de pesquisa por semana de qualquer país (tribo média ≈ 3,5 da tabela; atrasadas só pela "vontade")
  researchPerPop: 1000,     // +1 ponto por semana a cada tantas pessoas
  // letrados: o alvo vem das tecnologias de ensino; anda devagar até ele; pesquisa × (1 + literacyResearch × letrados)
  literacyTechs: [["Escrita", 0.05], ["Universidades", 0.1], ["Imprensa", 0.15], ["Iluminismo", 0.15], ["Telégrafo", 0.1], ["Rádio", 0.1], ["Computadores", 0.15], ["Internet", 0.15]] as [string, number][],
  literacyYear: 0.01,       // quanto a fração anda por ano até o alvo
  literacyResearch: 1.5,
  diffusion: 0.15,          // +pesquisa por vizinho/parceiro que já conhece a tecnologia...
  diffusionMax: 0.6,        // ...até isto
};

export type Market = {
  supply: Float64Array; demand: Float64Array; price: Float64Array; pop: number;
  used: Float64Array;  // consumido por indústrias neste tick
  need: Float64Array;  // consumo da população + insumos a plena carga (para o comércio)
  trade: Float64Array; // > 0 importado de outras cidades do país, < 0 exportado
};
export type City = {
  name: string; country: number; hex: number; size: number; urban: number[]; market: Market;
  port: boolean; // cidade em rio navegável: exporta mais no comércio
  blockaded?: boolean; // frota inimiga na zona marítima colada: sem comércio exterior, metade do interno, sem porto
  state?: number;       // id do estado da cidade (states.ts)
  flag?: Flag;          // bandeira própria (sem ela, a do país)
  identity?: Identity;  // cultura, língua e religião da população (culture.ts)
  harbor?: number;      // nível do porto (0 = sem porto): mais comércio, até o máximo da era
  coast?: boolean;      // algum centro urbano encosta no mar (pode ter porto)
  road?: number;        // nível da estrada que liga a cidade ao resto do país (0 = trilha)
  picked?: number[];    // centros urbanos comprados, na ordem (o resto do tamanho vem dos hexes mais perto)
};
export type Country = {
  treasury: number; debt: number; tax: number;
  gdpWeek: number; income: number; upkeep: number; interest: number;
  bankruptWeeks: number; pop: number;
  manpower: number; // pessoas livres para trabalhar em novas construções (e, no futuro, para o exército)
  gdpHistory: number[]; // PIB anual, um ponto por mês
  history?: Record<string, number[]>; // séries da aba Gráficos (history.ts)
  research: Research;
  pops: Pops;           // população por tipo de POP, renda e qualidade de vida
  politics: Politics;   // grupos, governo, legitimidade e leis
  radicals: number;     // fração da população com lealdade baixa
  migration: number;    // saldo migratório do último mês (+ chegou, − saiu)
  subsistence: number;  // valor da comida de subsistência na semana (renda de quem não tem salário)
  bonus: Float64Array;  // +fração de produção por construção, vinda das tecnologias
  researchWeek: number; // pontos de pesquisa na última semana
  admin?: number;       // pontos administrativos guardados (admin.ts)
  primaryCulture?: number; acceptedCultures?: number[]; officialLanguage?: number; stateReligion?: number; // culture.ts
  investPool?: number;  // fundo de investimento privado (sim.ts → ai.ts privateInvest)
  investWeek?: number;  // quanto entrou na última semana
  ruler?: number;       // id do governante (characters.ts)
  tributeWeek?: number; // tributo da semana: + recebido (soberano), − pago (súdito)
  glory?: number;       // prestígio de guerras (diplomacy.ts), se apaga devagar
  culturePenalty?: number; // pontos de lealdade perdidos por gente de cultura não aceita
  adminWeek?: number;   // produzidos na última semana
  literacy?: number;    // 0..1: fração dos letrados (sabem ler, escrever e contar); acelera a pesquisa
  control?: number;     // controle médio (pela população) na última semana
  drive: number;        // 0,3–1: vontade de sair da era tribal (tribos isoladas ficam paradas mais tempo)
  exports: number; imports: number; tariffs: number; // comércio exterior na última semana (valor) e tarifas cobradas
  infamy: number;       // reputação de agressor (ver INFAMY)
};

function updateBonus(c: Country) {
  c.bonus.fill(0);
  for (const t of TECHS) if (c.research.known.has(t.name))
    for (const [name, add] of t.bonus ?? []) c.bonus[BUILDINGS.findIndex((b) => b.name === name)] += add;
}

/** levels[b][i] = nível da construção b no hex i. market[i] = cidade (1-based) cujo mercado atende o hex. */
/**
 * Unidade no mapa (regras em war.ts): divisão do exército ou grupo de colonos.
 * strength = soldados (ou pessoas, nos colonos); org = organização 0..1.
 */
export type Division = {
  id: number; kind: "army" | "settler" | "fleet" | "air"; country: number; hex: number; strength: number; org: number;
  target: number | null; progress: number; // destino e avanço (0..1) até o próximo hex
  equip: number;                           // 0,5..1: quanto de Armas o país conseguiu dar
  siege?: number;                          // semanas cercando a cidade onde está
  unit?: string;                           // tipo de tropa (units.ts); sem = Lanceiros
  general?: number;                        // id do personagem que comanda (characters.ts)
  supplied?: boolean;                      // exército: tinha suprimento na última semana (war.ts)
  path?: { target: number; steps: number[] }; // caminho calculado (vai no save: o lockstep precisa dele igual em todos)
};
/** Números de uma guerra, por país participante. */
export type WarStats = { start: number; dead: Record<number, number>; civil: Record<number, number>; cost: Record<number, number> };
export type Economy = {
  week: number; levels: Uint8Array[]; producers: Set<number>;
  countries: Country[]; cities: City[];
  market: Uint16Array; urban: Uint8Array; owned: Int32Array;
  version: number; // muda a cada refresh ou ocupação: hora de redesenhar o mapa
  divisions: Division[]; nextDivision: number;
  wars: Set<string>;    // pares de países em guerra, "a-b" com a < b
  pacts: Set<string>;   // pares com acordo comercial, mesmo formato
  states: State[]; nextState: number;
  humans: number[];     // países com jogador (fora da IA)
  aiWarStart: Record<string, number>; // semana em que cada guerra da IA começou (para a paz)
  warStats?: Record<string, WarStats>; // por guerra ("a-b"): baixas, custo, desde quando
  control: Float32Array; // 0..1: quanto o governo administra o hex (control.ts)
  contacts?: number[][]; // por país: vizinhos de fronteira e parceiros comerciais (recalculado todo mês)
  characters?: Character[]; nextCharacter?: number; // personagens (characters.ts)
  obituaries?: { name: string; country: number; age: number }[]; // governantes que morreram nesta semana (aviso)
  proposals?: Proposal[]; nextProposal?: number; votes?: Vote[]; // propostas esperando jogador (proposals.ts)
  claims?: Claim[];                   // reivindicações sobre cidades (claims.ts)
  subjects?: Record<number, Subject>; // súdito → ligação com o soberano (subjects.ts)
  freed?: number[];                   // súditos que se soltaram neste mês (aviso)
  relations?: Record<string, number>; // "a-b" → −100..100 (diplomacy.ts); ausente = 0
  choices?: Record<number, { id: number; week: number }>; // evento esperando a escolha do jogador (choices.ts)
  incentives?: Incentive[]; // incentivos ativos (admin.ts)
  famine?: boolean[];    // por cidade: passando fome (events.ts)
  plague?: number[];     // por cidade: semanas de peste que restam
  news?: { kind: "fome" | "peste"; city: number }[]; // começaram nesta semana (para avisar)
  exhausted: number[];   // hexes cuja jazida acabou nesta semana (para avisar o jogador)
  occupier: Uint16Array; // país que ocupa o hex (0 = ninguém); hex ocupado não produz para o dono
};

/** Armas consumidas por semana por divisão (vão para a demanda do mercado da capital). */
export const ARMS_PER_DIVISION = 0.5;

const newMarket = (): Market => ({
  supply: new Float64Array(NG), demand: new Float64Array(NG), price: new Float64Array(NG).fill(1), pop: 0,
  used: new Float64Array(NG), need: new Float64Array(NG), trade: new Float64Array(NG),
});

/** Construções possíveis num hex com este recurso; indústrias só se o hex for urbano. */
export const buildingsFor = (resource: number, urban: boolean, resource2 = 0) =>
  BUILDINGS.map((_, b) => b).filter((b) => (BUILDINGS[b].industry ? urban : BUILDINGS[b].for.includes(resource) || (!!resource2 && BUILDINGS[b].for.includes(resource2))));
/** Produto que a construção b tira do hex i (o primeiro recurso, ou o segundo se ela for dele). */
export const outputOf = (w: World, b: number, i: number) => (BUILDINGS[b].for.includes(w.resource[i]) ? w.resource[i] : w.resource2[i]);
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
    const ok = (j: number) => w.owner[j] === c.country && isLand(w.terrain[j]);
    c.urban = [...new Set([c.hex, ...(c.picked ?? []).filter(ok), ...hexesInRadius(c.hex, 3, w.W, w.H).filter(ok)])].slice(0, c.size);
    for (const j of c.urban) e.urban[j] = 1;
    c.port = c.urban.some((j) => w.navigable[j] > 0);
    c.coast = c.urban.some((j) => { let s = false; forNeighbors(j % w.W, (j / w.W) | 0, w.W, w.H, (n) => { if (w.terrain[n] === T.OCEAN) s = true; }); return s; });
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
    countries: w.countries.map((_, k) => ({
      drive: 0.3 + 0.7 * (((Math.imul(w.seed + 1, 2654435761) ^ Math.imul(k + 1, 40503)) >>> 0) % 1000) / 1000, // determinístico (lockstep)
      treasury: 500, debt: 0, tax: 0.15, gdpWeek: 0, income: 0, upkeep: 0, interest: 0, bankruptWeeks: 0, pop: 0,
      manpower: 0, gdpHistory: [],
      research: newResearch(), pops: newPops(), politics: newPolitics(), radicals: 0, migration: 0, subsistence: 0, exports: 0, imports: 0, tariffs: 0, infamy: 0, bonus: new Float64Array(NB), researchWeek: 0,
    })),
    cities: w.countries.map((c, k) => ({ name: c.lang === undefined ? `Capital ${k + 1}` : makeName(c.lang, w.seed * 53 + k), country: k + 1, hex: c.capital, size: 1, urban: [], market: newMarket(), port: false })),
    market: new Uint16Array(N), urban: new Uint8Array(N), owned: new Int32Array(0), version: 0,
    divisions: [], nextDivision: 1, wars: new Set(), pacts: new Set(), states: [], nextState: 1, humans: [], aiWarStart: {}, occupier: new Uint16Array(N), exhausted: [], control: new Float32Array(N),
  };
  refresh(w, e);
  for (const i of e.owned) {
    const c = e.countries[w.owner[i] - 1];
    c.pop += w.pop[i];
    const ex = w.resource[i] ? extractorFor(w.resource[i]) : -1;
    if (ex >= 0) { e.levels[ex][i] = 1; e.producers.add(i); } // começa com extratora nível 1
  }
  updateControl(w, e, true);
  for (const city of e.cities) city.identity = homeIdentity(w, e, city.country);
  for (const c of e.countries) c.manpower += c.pop * RULES.manpowerShare;
  e.cities.forEach((city) => { for (let k = 0; k < RULES.startSettlers; k++) spawnSettlers(e, city.country, city.hex); });
  return e;
}

/** Raio de território de uma cidade pelo tamanho: 1, 2 a partir do tamanho 2, 3 a partir do 4. */
/** Quanta gente cabe no hex: rural pela fertilidade; centro urbano bem mais, crescendo com a era. */
export const popCap = (w: World, e: Economy, i: number) => {
  const era = w.owner[i] ? e.countries[w.owner[i] - 1].research.era : 0;
  return e.urban[i] ? RULES.popCapUrban * (1 + RULES.popCapPerEra * era) : RULES.popCapRural * Math.max(0.1, TERRAINS[w.terrain[i]].fertility);
};

/** Cidade com saída para água (rio navegável ou mar com porto): troca mais e mais longe. */
const onWater = (c: City) => c.port || (c.harbor ?? 0) > 0;
const portMult = (c: City) => (c.port ? RULES.portTradeBonus : 1) * (1 + RULES.harborTrade * (c.harbor ?? 0));
/** Porto máximo pela era: 1 até a Clássica, +1 a cada duas eras (até 5). */
export const maxHarbor = (e: Economy, country: number) => Math.min(5, 1 + Math.floor(e.countries[country - 1].research.era / 2));

/** Melhora o porto da cidade k em 1 nível (precisa encostar no mar ou num rio navegável). */
export function buildHarbor(e: Economy, k: number): string | null {
  const city = e.cities[k];
  if (!city) return "Cidade inválida";
  if (!city.coast && !city.port) return "A cidade não encosta no mar nem num rio navegável";
  const lv = (city.harbor ?? 0) + 1, c = e.countries[city.country - 1];
  if (lv > maxHarbor(e, city.country)) return `Porto no máximo da era (${maxHarbor(e, city.country)})`;
  const cost = RULES.harborCost * lv;
  if (c.treasury < cost) return `Faltam ${Math.ceil(cost - c.treasury)} de dinheiro`;
  c.treasury -= cost; city.harbor = lv;
  return null;
}

/** Estrada máxima pela era: 1 na Tribal, até 5. */
export const maxRoad = (e: Economy, country: number) => Math.min(5, e.countries[country - 1].research.era + 1);

/** Melhora a estrada da cidade k em 1 nível. */
export function buildRoad(e: Economy, k: number): string | null {
  const city = e.cities[k];
  if (!city) return "Cidade inválida";
  const lv = (city.road ?? 0) + 1, c = e.countries[city.country - 1];
  if (lv > maxRoad(e, city.country)) return `Estrada no máximo da era (${maxRoad(e, city.country)})`;
  const cost = RULES.roadCost * lv;
  if (c.treasury < cost) return `Faltam ${Math.ceil(cost - c.treasury)} de dinheiro`;
  c.treasury -= cost; city.road = lv;
  return null;
}

/** Custo do próximo centro urbano da cidade. */
export const urbanCost = (city: City) => RULES.urbanCost * city.size;

/** Compra o hex `i` (vizinho de um centro urbano da cidade) como centro urbano novo: a cidade cresce 1. */
export function urbanize(w: World, e: Economy, k: number, i: number): string | null {
  const city = e.cities[k];
  if (!city) return "Cidade inválida";
  if (city.size >= RULES.maxCitySize) return "Cidade no tamanho máximo";
  if (w.owner[i] !== city.country || !isLand(w.terrain[i])) return "O hex precisa ser terra do país";
  if (e.urban[i]) return "Já é centro urbano";
  let near = false;
  forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (city.urban.includes(j)) near = true; });
  if (!near) return "Precisa encostar num centro urbano da cidade";
  const c = e.countries[city.country - 1], cost = urbanCost(city);
  if (c.treasury < cost) return `Faltam ${Math.ceil(cost - c.treasury)} de dinheiro`;
  c.treasury -= cost;
  city.size++;
  city.picked = [...(city.picked ?? []), i];
  claim(w, city.country, city.hex, borderRadius(city.size)); // a fronteira cresce com a cidade
  refresh(w, e);
  return null;
}

export const borderRadius = (size: number) => Math.min(3, 1 + Math.floor(size / 2));

export function buildCost(e: Economy, b: number, i: number) { return RULES.buildCost * (e.levels[b][i] + 1); }

/** Constrói (ou melhora) a construção b no hex i. O que faltar no tesouro vira dívida. Retorna erro ou null. */
export function build(w: World, e: Economy, i: number, b: number): string | null {
  const def = BUILDINGS[b];
  if (!w.owner[i]) return "Hex sem dono";
  if (!def) return "Construção inválida";
  if (def.industry ? !e.urban[i] : !def.for.includes(w.resource[i]) && !(w.resource2[i] && def.for.includes(w.resource2[i]))) return def.industry ? "Indústria só em hex de cidade" : "Construção não serve para este recurso";
  if (def.boosts !== undefined && !e.levels[def.boosts][i]) return `Precisa de ${BUILDINGS[def.boosts].name} antes`;
  if (e.levels[b][i] >= 255) return "Nível máximo";
  const c = e.countries[w.owner[i] - 1], tech = techFor(b);
  if (tech && !c.research.known.has(tech)) return `Precisa pesquisar ${tech}`;
  c.treasury -= buildCost(e, b, i);
  if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
  e.producers.add(i);
  e.levels[b][i]++;
  return null;
}

const spawnSettlers = (e: Economy, country: number, hex: number) =>
  e.divisions.push({ id: e.nextDivision++, kind: "settler", country, hex, strength: RULES.settlerPop, org: 1, target: null, progress: 0, equip: 1 });

/** Quantos grupos de colonos o país tem. */
export const settlersOf = (e: Economy, country: number) => e.divisions.filter((d) => d.kind === "settler" && d.country === country).length;

/** O grupo de colonos `unit` funda uma cidade onde está, e deixa de existir. */
/** `later`: quem chama faz o refresh (a IA funda várias de uma vez e recalcula uma vez só). */
export function foundCity(w: World, e: Economy, unit: number, later = false): string | null {
  const s = e.divisions.find((d) => d.id === unit && d.kind === "settler");
  if (!s) return "Selecione um grupo de colonos";
  const i = s.hex, country = s.country;
  if (!isLand(w.terrain[i])) return "Precisa ser em terra";
  if (w.owner[i] && w.owner[i] !== country) return "Território de outro país";
  const col = i % w.W, row = (i / w.W) | 0;
  const dist = (h: number) => hexDistance(col, row, h % w.W, (h / w.W) | 0, w.W);
  if (e.cities.some((k) => dist(k.hex) < RULES.minCityDistance)) return `Muito perto de outra cidade (mínimo ${RULES.minCityDistance})`;
  e.divisions = e.divisions.filter((d) => d !== s);
  if (!w.owner[i]) w.owner[i] = country;
  claim(w, country, i, RULES.settleClaimRadius);
  e.cities.push({ name: cityName(w, e, country), country, hex: i, size: 1, urban: [], market: newMarket(), port: false, identity: homeIdentity(w, e, country) });
  if (!later) refresh(w, e);
  return null;
}

/** Treina um grupo de colonos: custa dinheiro e gente da capital. */
export function trainSettlers(w: World, e: Economy, country: number): string | null {
  const c = e.countries[country - 1], capital = e.cities.find((k) => k.country === country);
  if (!capital) return "Sem cidades";
  if (w.pop[capital.hex] < RULES.settlerPop * 2) return "Capital pequena demais";
  if (c.treasury < RULES.settlerCost) return `Precisa de ${RULES.settlerCost} no tesouro`;
  c.treasury -= RULES.settlerCost;
  w.pop[capital.hex] -= RULES.settlerPop; c.pop -= RULES.settlerPop;
  spawnSettlers(e, country, capital.hex);
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
/**
 * Infâmia: reputação de agressor. Sobe ao declarar guerra, tomar território e descobrir armas temidas;
 * cai devagar com o tempo. Com noPacts ninguém fecha acordo; com pactsBreak os acordos caem e a IA pode se
 * juntar contra o país (ai.ts).
 */
export const INFAMY = { declareWar: 10, perHexTaken: 0.5, decayWeek: 0.2, noPacts: 25, pactsBreak: 50, coalition: 50 };

export const pactKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const hasPact = (e: Economy, a: number, b: number) => a !== b && e.pacts.has(pactKey(a, b));

/** Acordo comercial: os dois países precisam estar em paz. Retorna erro ou null. */
export function proposePact(e: Economy, a: number, b: number): string | null {
  if (a === b || !a || !b) return "Escolha outro país";
  if (e.wars.has(pactKey(a, b))) return "Não dá para comerciar com quem está em guerra com você";
  if (hasPact(e, a, b)) return "Já existe acordo";
  const bad = [a, b].find((x) => e.countries[x - 1].infamy >= INFAMY.noPacts);
  if (bad) return `Recusado: infâmia alta (${Math.round(e.countries[bad - 1].infamy)} ≥ ${INFAMY.noPacts})`;
  const puppet = [a, b].find((x) => e.subjects?.[x]?.kind === "Fantoche" && e.subjects[x].overlord !== (x === a ? b : a));
  if (puppet) return "Fantoche não assina acordos sem o soberano";
  if (relation(e, a, b) < DIPLO.pactMin) return `Recusado: relações ruins demais (${Math.round(relation(e, a, b))})`;
  e.pacts.add(pactKey(a, b));
  return null;
}
export const cancelPact = (e: Economy, a: number, b: number) => { e.pacts.delete(pactKey(a, b)); };

/**
 * Comércio exterior: em cada acordo, as cidades de fronteira (a até foreignRange de uma cidade do parceiro;
 * portos o dobro) trocam sobra por falta, como o comércio interno, mas só foreignShare da sobra.
 * O importador cobra tariff sobre o valor importado.
 */
// shortcut: distância em linha reta e todos os acordos iguais; trocar por rotas/nós e tarifas por lei quando houver.
function foreignTrade(w: World, e: Economy) {
  for (const c of e.countries) { c.exports = 0; c.imports = 0; c.tariffs = 0; }
  for (const key of e.pacts) {
    const [a, b] = key.split("-").map(Number);
    const near = (city: City, other: number) => e.cities.some((k) => k.country === other &&
      hexDistance(city.hex % w.W, (city.hex / w.W) | 0, k.hex % w.W, (k.hex / w.W) | 0, w.W) <= RULES.foreignRange * (onWater(city) || onWater(k) ? 2 : 1));
    const pool = e.cities.filter((k) => !k.blockaded && ((k.country === a && near(k, b)) || (k.country === b && near(k, a))));
    if (!pool.some((k) => k.country === a) || !pool.some((k) => k.country === b)) continue;
    for (let gi = 1; gi < NG; gi++) {
      const net = pool.map((k) => k.market.supply[gi] - k.market.used[gi] - k.market.pop * POP_DEMAND[gi]);
      // cada país só exporta para o outro: sobra de um lado, falta do outro
      for (const [from, to] of [[a, b], [b, a]]) {
        let offer = 0, lack = 0;
        const fs = Math.min(1, RULES.foreignShare * (1 + techSum(e.countries[from - 1].research, "trade")));
        pool.forEach((k, i) => { if (k.country === from && net[i] > 0) offer += net[i] * Math.min(1, fs * portMult(k)); if (k.country === to && net[i] < 0) lack -= net[i]; });
        const moved = Math.min(offer, lack);
        if (moved <= 0) continue;
        const value = moved * BASE_PRICE[gi];
        pool.forEach((k, i) => {
          let d = 0;
          if (k.country === from && net[i] > 0) d = -net[i] * Math.min(1, fs * portMult(k)) * (moved / offer);
          if (k.country === to && net[i] < 0) d = -net[i] * (moved / lack);
          k.market.supply[gi] += d; k.market.trade[gi] += d; net[i] += d;
        });
        e.countries[from - 1].exports += value;
        e.countries[to - 1].imports += value;
        e.countries[to - 1].tariffs += value * RULES.tariff;
      }
    }
  }
}

function trade(e: Economy, need: (m: Market, gi: number) => number) {
  const byCountry = new Map<number, City[]>();
  for (const c of e.cities) {
    if (!byCountry.has(c.country)) byCountry.set(c.country, []);
    byCountry.get(c.country)!.push(c);
  }
  for (const [country, cs] of byCountry) {
    if (cs.length < 2) continue;
    const ms = cs.map((c) => c.market), port = cs.map((c) => (c.blockaded ? 0.5 : portMult(c)) * (1 + RULES.roadTrade * (c.road ?? 0)));
    const c0 = e.countries[country - 1];
    const share = lawOf(c0.politics, "Economia").tradeShare! * (1 + techSum(c0.research, "trade")); // lei de Economia + tecnologia
    for (let gi = 1; gi < NG; gi++) {
      let offer = 0, lack = 0;
      const net = ms.map((m) => m.supply[gi] - m.used[gi] - need(m, gi));
      net.forEach((n, k) => { if (n > 0) offer += n * Math.min(1, share * port[k]); else lack -= n; });
      const moved = Math.min(offer, lack);
      if (moved <= 0) continue;
      ms.forEach((m, k) => {
        const d = net[k] > 0 ? -net[k] * Math.min(1, share * port[k]) * (moved / offer) : -net[k] * (moved / lack);
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
  for (const d of e.divisions) if (d.country === country && (d.kind === "army" || d.kind === "air")) add(P["Soldados"], d.strength);
  for (const d of e.divisions) if (d.country === country && d.kind === "fleet") add(P["Marinheiros"], d.strength);
  if (r.era >= 1) { add(P["Burocratas"], c.pop * POP_RULES.bureaucratShare / 2); add(P["Escriturários"], c.pop * POP_RULES.bureaucratShare / 2); }
  if (r.known.has("Escrita")) add(P["Acadêmicos"], c.pop * POP_RULES.academicShare);
  const counted = n.reduce((s, v) => s + v, 0);
  if (counted > c.pop) { const k = c.pop / counted; for (let t = 0; t < n.length; t++) n[t] *= k; } // empregos além da população
  else add(idleType(r.known.has("Agricultura")), c.pop - counted);
  // custo semanal das necessidades de 1 pessoa, pelos preços da capital
  const cap = e.cities.find((k) => k.country === country)?.market;
  if (!cap) return; // país sem cidades: sem mercado para medir qualidade de vida
  let needCost = 0; // só necessidades básicas: comida, peles e madeira (QV 25 = básicas cobertas)
  for (const gi of BASIC_NEEDS) needCost += POP_DEMAND[gi] * BASE_PRICE[gi] * cap.price[gi];
  distributeIncome(c.pops, c.gdpWeek, c.subsistence, needCost);
}

/**
 * Migração entre países (mensal): a população rural de cada país vai para as cidades do país onde a classe
 * baixa tem a melhor qualidade de vida, se a diferença passar de migrationMinQol. A população total se conserva.
 */
// shortcut: qualquer distância e para um único destino; trocar por vizinhos/rotas quando houver fronteiras e comércio exterior.
export function migrate(w: World, e: Economy) {
  const qol = e.countries.map((c) => lowerClassQol(c.pops));
  const dest = e.countries.map((_, a) => {
    let best = -1;
    e.countries.forEach((_, b) => { if (b !== a && (best < 0 || qol[b] > qol[best])) best = b; });
    return best;
  });
  const rate = e.countries.map((_, a) => {
    const diff = dest[a] < 0 ? 0 : qol[dest[a]] - qol[a];
    return diff < RULES.migrationMinQol ? 0 : RULES.migrationMonth * Math.min(1, diff / 50);
  });
  const inflow = new Float64Array(e.countries.length), outflow = new Float64Array(e.countries.length);
  for (const i of e.owned) {
    const a = w.owner[i] - 1;
    if (!rate[a] || e.urban[i]) continue;
    const moved = w.pop[i] * rate[a];
    w.pop[i] -= moved; outflow[a] += moved; inflow[dest[a]] += moved;
  }
  e.countries.forEach((c, b) => {
    c.migration = inflow[b] - outflow[b];
    if (!inflow[b]) return;
    const urban = e.cities.filter((k) => k.country === b + 1).flatMap((k) => k.urban);
    for (const j of urban) w.pop[j] += inflow[b] / urban.length;
  });
}

/** Países que se encostam (fronteira) ou têm acordo comercial, por país (índice 0 = país 1). */
export function contactsOf(w: World, e: Economy) {
  const sets = e.countries.map(() => new Set<number>());
  for (const i of e.owned) {
    const a = w.owner[i];
    forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { const b = w.owner[j]; if (b && b !== a) sets[a - 1].add(b); });
  }
  for (const k of e.pacts) { const [a, b] = k.split("-").map(Number); sets[a - 1].add(b); sets[b - 1].add(a); }
  return sets.map((s) => [...s].sort((x, y) => x - y));
}

/** Nome para a próxima cidade do país, na língua dele. */
export const cityName = (w: World, e: Economy, country: number) => {
  const lang = w.countries[country - 1].lang;
  return lang === undefined ? `Cidade ${e.cities.length + 1}` : makeName(lang, w.seed * 53 + e.cities.length * 7 + country);
};

/** País que ficou sem cidades perde as tropas (não há de onde abastecer, pagar nem para onde recuar). */
export function dropHomeless(e: Economy) {
  const alive = new Set(e.cities.map((k) => k.country));
  e.divisions = e.divisions.filter((d) => alive.has(d.country));
}

/** Avança uma semana. Cada cidade é um mercado; o país soma os mercados das suas cidades. */
export function tick(w: World, e: Economy) {
  e.exhausted = []; e.freed = [];
  dropHomeless(e);
  if (e.week % 4 === 0) { updateControl(w, e); e.contacts = contactsOf(w, e); stepDiplomacy(e); e.freed = stepSubjects(e); expireProposals(e); }
  if (e.week % 52 === 26) stepClaims(w, e);
  if (e.week % 52 === 0) stepCulture(w, e).forEach((p, ci) => (e.countries[ci].culturePenalty = p));
  const ctrlCity = new Float64Array(e.cities.length), ctrlCountry = new Float64Array(e.countries.length); // soma de pop × controle
  for (const k of e.cities) { const m = k.market; m.supply.fill(0); m.demand.fill(0); m.used.fill(0); m.trade.fill(0); m.pop = 0; }
  for (const c of e.countries) { c.upkeep = 0; c.pop = 0; c.subsistence = 0; c.pops.count.fill(0); c.adminWeek = 0; }

  for (const i of e.owned) {
    const k = e.market[i];
    if (!k) continue;
    const city = e.cities[k - 1];
    if (!e.urban[i] && w.pop[i] > 1) { // cidades atraem a população em volta, enquanto houver lugar
      const to = city.urban[(e.week + i) % city.urban.length];
      const moved = Math.min(w.pop[i] * RULES.migrationWeek, Math.max(0, popCap(w, e, to) - w.pop[to]));
      w.pop[i] -= moved; w.pop[to] += moved;
    }
    city.market.pop += w.pop[i]; ctrlCity[k - 1] += w.pop[i] * e.control[i];
    const c = e.countries[w.owner[i] - 1];
    c.pop += w.pop[i]; ctrlCountry[w.owner[i] - 1] += w.pop[i] * e.control[i];
    if (e.occupier[i]) continue; // ocupado: a população continua, mas não produz para o dono
    // subsistência: caça, coleta e roças sem construção; fazendas vêm por cima disso
    const food = w.pop[i] * POP_DEMAND[FOOD[0]] * TERRAINS[w.terrain[i]].fertility * RULES.subsistence
      * (w.river[i] ? 1.25 : 1) * (snowAt(w, i, e.week) ? 0.5 : 1); // rio rega; neve cobre o campo
    for (const f of FOOD) { city.market.supply[f] += food; c.subsistence += food * BASE_PRICE[f] * city.market.price[f]; }
  }

  // throughput[cidade][b] = soma de nível × ocupação das indústrias b no mercado da cidade
  const throughput = e.cities.map(() => new Float64Array(NB));
  for (const i of e.producers) {
    const k = e.market[i];
    if (!k || e.occupier[i]) continue;
    const m = e.cities[k - 1].market, c = e.countries[w.owner[i] - 1];
    let base = 0, mult = 1, required = 0, mined = 0; // mined: produção do 1º recurso (gasta a jazida)
    const out = new Map<number, number>(); // produto → produção base
    for (let b = 0; b < NB; b++) {
      const lv = e.levels[b][i];
      if (!lv) continue;
      const def = BUILDINGS[b];
      required += lv * def.workers;
      c.upkeep += lv * RULES.upkeepPerLevel;
      if (def.industry) continue;
      if (def.boosts === undefined) {
        const q = lv * RULES.outputPerLevel * (1 + c.bonus[b]), g = outputOf(w, b, i);
        base += q; out.set(g, (out.get(g) ?? 0) + q);
        if (g === w.resource[i]) mined += q;
      } else mult += lv * def.mult!;
    }
    const staffing = required ? Math.min(1, (w.pop[i] * RULES.hexLaborShare) / required) : 0; // hex vazio não opera tudo
    const penalty = (c.bankruptWeeks > 0 ? RULES.bankruptPenalty : 1) * (1 - RULES.radicalPenalty * c.radicals);
    const natural = (hasIncentive(e, k - 1, "Isenção fiscal") ? 1.15 : 1) * (e.urban[i] ? RULES.urbanExtract : 1) * (1 - CONTROL.market + CONTROL.market * e.control[i]); // pouco controle: parte some no caminho
    for (const [g, q] of out) m.supply[g] += q * mult * staffing * penalty * natural;
    if (mined && w.reserve[i] !== Infinity) { // jazida: cada semana de extração gasta a reserva
      w.reserve[i] -= (mined / RULES.outputPerLevel) * staffing;
      if (w.reserve[i] <= 0) {
        for (let b = 0; b < NB; b++) if (!BUILDINGS[b].industry && outputOf(w, b, i) === w.resource[i]) e.levels[b][i] = 0; // a mina fecha (a lavoura de cima continua)
        exhaust(w, i); e.exhausted.push(i);
      }
    }
    for (let b = 0; b < NB; b++) { // quem trabalha aqui, por tipo de POP
      const lv = e.levels[b][i];
      if (lv) for (const [t, share] of JOBS[c.research.era][b]) c.pops.count[t] += lv * BUILDINGS[b].workers * staffing * share;
    }
    for (const b of INDUSTRIES) if (e.levels[b][i]) throughput[e.market[i] - 1][b] += e.levels[b][i] * staffing * penalty * (1 + c.bonus[b]) * RULES.urbanIndustry;
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
      const adm = BUILDINGS[b].industry!.admin;
      if (adm) { const c = e.countries[city.country - 1]; c.adminWeek = (c.adminWeek ?? 0) + adm * thr * eff; }
    }
  });
  trade(e, (m, gi) => m.pop * POP_DEMAND[gi]); // produtos prontos circulam
  foreignTrade(w, e);

  const ARMS = g("Armas"); // exércitos compram armas no mercado da capital
  for (const d of e.divisions) if (d.kind === "army") e.cities.find((k) => k.country === d.country)!.market.demand[ARMS] += ARMS_PER_DIVISION;

  e.cities.forEach((city) => {
    const m = city.market;
    for (let gi = 1; gi < NG; gi++) {
      m.demand[gi] += m.pop * POP_DEMAND[gi];
      m.price[gi] = priceFactor(m.supply[gi], m.demand[gi]);
    }
  });

  for (const c of e.countries) c.tributeWeek = 0;
  e.countries.forEach((c, ci) => {
    let gdp = 0, taxed = 0, nominal = 0; // taxed = PIB × imposto de cada cidade (na Federação, o do estado dela)
    e.cities.forEach((city, k) => {
      if (city.country !== ci + 1) return;
      const m = city.market;
      let g = 0;
      for (let gi = 1; gi < NG; gi++) g += m.supply[gi] * BASE_PRICE[gi] * m.price[gi];
      const exempt = hasIncentive(e, k, "Isenção fiscal") ? 0 : 1;
      gdp += g; nominal += g * cityTax(e, k); taxed += g * cityTax(e, k) * exempt * (m.pop ? ctrlCity[k] / m.pop : 1); // só arrecada onde controla
    });
    c.gdpWeek = gdp;
    c.investWeek = gdp * (lawOf(c.politics, "Economia").invest ?? 0); // o dinheiro é dos donos, não do tesouro
    c.investPool = (c.investPool ?? 0) + c.investWeek;
    c.tax = gdp ? nominal / gdp : lawOf(c.politics, "Impostos").tax!; // imposto médio
    // governo legítimo arrecada mais; no Centralizado, estados melhoram a administração
    const ruler = rulerOf(e, ci + 1);
    c.income = taxed * (RULES.taxBaseEfficiency + c.politics.legitimacy) * (1 + adminBonus(e, ci + 1)) * (1 + (ruler ? CHAR.admTax * attrMod(ruler.adm) : 0)); // governante bom administrador arrecada mais
    c.interest = (c.debt * RULES.interestYear) / 52;
    c.treasury += c.income + c.tariffs - c.upkeep - c.interest;
    if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
    else if (c.debt > 0) { const pay = Math.min(c.debt, c.treasury * 0.5); c.debt -= pay; c.treasury -= pay; }
    if (c.bankruptWeeks > 0) c.bankruptWeeks--;
    else if (c.debt > RULES.bankruptDebtToGdp * gdp * 52 && c.debt > 0) {
      c.bankruptWeeks = RULES.bankruptWeeks; // calote: perde metade da dívida, ganha penalidade de produção
      c.debt /= 2;
    }
    if (e.week % 4 === 0) { c.gdpHistory.push(gdp * 52); if (c.gdpHistory.length > 600) c.gdpHistory.shift(); }
    updatePops(e, c, ci + 1);
    c.control = c.pop ? ctrlCountry[ci] / c.pop : 1;
    const cap = c.pop * c.control * (RULES.manpowerShare + techSum(c.research, "manpower")) - c.pops.count[P["Soldados"]];
    c.manpower = Math.min(cap, c.manpower + cap * RULES.manpowerRegen);
    updatePolitics(c.politics, c.pops, c.research.era);
    c.radicals = updateLoyalty(c.pops, c.politics.legitimacy, techSum(c.research, "unrest") + (c.culturePenalty ?? 0)); // + minorias não aceitas
    c.politics.legitimacy = Math.max(0, c.politics.legitimacy - updateStates(e, ci + 1)); // estados insatisfeitos
    c.politics.legitimacy = Math.max(0, c.politics.legitimacy - RULES.radicalLegitimacy * c.radicals);
    const ideas = Math.min(0.3, 0.1 * (e.incentives ?? []).filter((x) => x.kind === "Impor ideias" && e.cities[x.city]?.country === ci + 1).length);
    const law = advanceLaw(c.politics, mulberry32(w.seed * 7 + e.week * 131 + ci), ideas);
    if (law) noteRuler(e, ci + 1, `aprovou a lei ${law}`);
    // ERA_RESEARCH[era] / ERA_RESEARCH[0]: cada era pesquisa na escala da tabela de custos
    const litTarget = RULES.literacyTechs.reduce((s, [t, v]) => s + (c.research.known.has(t) ? v : 0), 0.01);
    c.literacy = (c.literacy ?? 0.01) + Math.sign(litTarget - (c.literacy ?? 0.01)) * Math.min(Math.abs(litTarget - (c.literacy ?? 0.01)), RULES.literacyYear / 52);
    c.researchWeek = (1 + RULES.literacyResearch * c.literacy) * (RULES.researchBase + c.pop / RULES.researchPerPop + c.pops.count[P["Acadêmicos"]] * POP_RULES.researchPerAcademic) * ERA_RESEARCH[c.research.era] / ERA_RESEARCH[0];
    if (c.research.era === 0) { // comércio puxa a tribo para fora do isolamento, mas não garante
      let partners = 0;
      for (const key of e.pacts) if (key.split("-").includes(String(ci + 1))) partners++;
      c.researchWeek *= Math.min(1, c.drive + 0.15 * partners);
    }
    // difusão: cada vizinho/parceiro que já sabe o que estamos pesquisando dá +DIFFUSION (até o teto)
    if (!c.research.researching) c.research.researching = available(c.research).sort((a, b) => a.cost - b.cost)[0]?.name ?? null;
    const knowers = (e.contacts?.[ci] ?? []).filter((o) => c.research.researching && e.countries[o - 1].research.known.has(c.research.researching)).length;
    c.researchWeek *= 1 + Math.min(RULES.diffusionMax, RULES.diffusion * knowers);
    const learned = research(c.research, c.researchWeek);
    if (learned) { updateBonus(c); c.infamy += learned.infamy ?? 0; }
    c.infamy = Math.max(0, c.infamy - INFAMY.decayWeek);
    if (c.infamy >= INFAMY.pactsBreak) for (const k of [...e.pacts]) if (k.split("-").map(Number).includes(ci + 1)) e.pacts.delete(k); // ninguém quer negócio
  });

  if (e.week % 4 === 0) migrate(w, e);

  stepAdmin(e);
  payTribute(e);
  e.week++;
}

export function dateLabel(week: number) {
  const year = START_YEAR + Math.floor(week / 52), w = (week % 52) + 1;
  return `${year < 0 ? `${-year} a.C.` : `${year + 1} d.C.`} · semana ${w}`; // não existe ano 0
}

