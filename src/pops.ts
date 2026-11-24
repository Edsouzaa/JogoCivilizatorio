// Tipos de POP (docs/game-desing.md). O país não guarda POP por hexágono: a composição vem dos empregos
// das construções; quem não tem emprego vive de subsistência.
import { ERAS } from "./tech.ts";

export const CLASSES = ["Baixa", "Média", "Alta"] as const;
const era = (name: string) => ERAS.indexOf(name);
const CLASSICAL = era("Clássica"), REVOLUTIONS = era("Revoluções");

export type PopType = {
  name: string; cls: 0 | 1 | 2;
  wage: number;    // peso no rateio dos salários (classes baixa/média). 0 = vive de subsistência / sem salário
  weight: number;  // peso político por pessoa
  era: number;     // primeira era em que aparece
  owner?: boolean; // classe alta dona: recebe a parte dos donos, não salário
};

export const POP_TYPES: PopType[] = [
  { name: "Escravos", cls: 0, wage: 0, weight: 0, era: 0 },
  { name: "Caçadores-coletores", cls: 0, wage: 0, weight: 0.2, era: 0 },
  { name: "Camponeses", cls: 0, wage: 0.2, weight: 0.2, era: 0 },
  { name: "Trabalhadores", cls: 0, wage: 1, weight: 1, era: CLASSICAL },
  { name: "Fazendeiros", cls: 0, wage: 2, weight: 1, era: CLASSICAL },
  { name: "Marinheiros", cls: 0, wage: 1.5, weight: 1, era: CLASSICAL },
  { name: "Soldados", cls: 0, wage: 1.5, weight: 1.5, era: 0 },
  { name: "Operários especializados", cls: 0, wage: 1.5, weight: 1.5, era: REVOLUTIONS },
  { name: "Escriturários", cls: 1, wage: 1.5, weight: 1.5, era: CLASSICAL },
  { name: "Comerciantes", cls: 1, wage: 3, weight: 3, era: CLASSICAL },
  { name: "Clérigos", cls: 1, wage: 3, weight: 3, era: 0 },
  { name: "Acadêmicos", cls: 1, wage: 4, weight: 4, era: CLASSICAL },
  { name: "Engenheiros", cls: 1, wage: 3, weight: 3, era: REVOLUTIONS },
  { name: "Oficiais", cls: 1, wage: 5, weight: 5, era: CLASSICAL },
  { name: "Burocratas", cls: 1, wage: 4, weight: 4, era: CLASSICAL },
  { name: "Chefes e anciãos", cls: 2, wage: 0, weight: 5, era: 0, owner: true },
  { name: "Aristocratas", cls: 2, wage: 0, weight: 5, era: CLASSICAL, owner: true },
  { name: "Capitalistas", cls: 2, wage: 0, weight: 5, era: REVOLUTIONS, owner: true },
];
export const P = Object.fromEntries(POP_TYPES.map((p, k) => [p.name, k])) as Record<string, number>;
export const NP = POP_TYPES.length;

export const POP_RULES = {
  ownerShare: 0.3,       // parte do PIB que vai para os donos (classe alta); o resto vira salário
  clergyShare: 0.01,     // clérigos (xamãs na era tribal) por pessoa
  bureaucratShare: 0.01, // burocratas e escriturários a partir da Clássica
  academicShare: 0.002,  // acadêmicos, só com Escrita
  researchPerAcademic: 1 / 20, // pontos de pesquisa por semana por acadêmico
  loyaltyStart: 50,
  loyaltyStep: 0.05,     // fração do caminho até o alvo que a lealdade anda por semana
  radicalBelow: 30,      // lealdade abaixo disto = radical
};

type Kind = "farm" | "hunt" | "labor" | "industry";
const KIND: Record<string, Kind> = {
  "Fazenda": "farm", "Irrigação": "farm", "Pasto": "farm", "Estábulo": "farm",
  "Acampamento de caça": "hunt",
  "Serraria": "labor", "Trilhas de transporte": "labor", "Mina": "labor", "Galerias escoradas": "labor", "Barreiro": "labor", "Poço": "labor",
  "Fundição de bronze": "industry", "Tecelagem": "industry", "Ferraria": "industry", "Armeiro": "industry",
};

/** Dono das construções na era: chefes tribais → aristocratas → capitalistas (indústria). */
const ownerFor = (kind: Kind, e: number) =>
  e < CLASSICAL ? P["Chefes e anciãos"] : kind === "industry" && e >= REVOLUTIONS ? P["Capitalistas"] : P["Aristocratas"];

/** Empregos de 1 trabalhador da construção: [tipo de POP, fração]. Somam 1. */
export function jobsFor(building: string, e: number): [number, number][] {
  const kind = KIND[building];
  if (!kind) throw new Error(`construção sem empregos definidos: ${building}`);
  const owner: [number, number] = [ownerFor(kind, e), 0.05];
  const tribal = e < CLASSICAL;
  if (kind === "hunt") return [[P[tribal ? "Caçadores-coletores" : "Trabalhadores"], 0.95], owner];
  if (kind === "farm") return tribal ? [[P["Camponeses"], 0.95], owner] : [[P["Fazendeiros"], 0.45], [P["Camponeses"], 0.5], owner];
  if (kind === "labor") return [[P[tribal ? "Camponeses" : "Trabalhadores"], 0.95], owner];
  return tribal ? [[P["Camponeses"], 0.95], owner] : [[P["Trabalhadores"], 0.85], [P["Comerciantes"], 0.1], owner];
}

/** Quem não tem emprego: caçadores-coletores até a Agricultura, depois camponeses. */
export const idleType = (knowsAgriculture: boolean) => P[knowsAgriculture ? "Camponeses" : "Caçadores-coletores"];

export type Pops = { count: Float64Array; income: Float64Array; qol: Float64Array; loyalty: Float64Array };
export const newPops = (): Pops => ({
  count: new Float64Array(NP), income: new Float64Array(NP), qol: new Float64Array(NP),
  loyalty: new Float64Array(NP).fill(POP_RULES.loyaltyStart),
});

/** Classe baixa de salário baixo (escravos, caçadores-coletores, camponeses) vive também da subsistência. */
const livesOffLand = (t: PopType) => t.cls === 0 && t.wage < 0.5;

/**
 * Divide a renda da semana entre os tipos de POP e calcula a qualidade de vida (1–50).
 * `gdp` = PIB da semana; `subsistenceValue` = valor da comida de subsistência (vai para quem vive da terra);
 * `needCost` = custo semanal das necessidades básicas de 1 pessoa. Renda igual a esse custo = 25.
 */
export function distributeIncome(p: Pops, gdp: number, subsistenceValue: number, needCost: number) {
  p.income.fill(0);
  let wageWeight = 0, owners = 0, subsisting = 0;
  POP_TYPES.forEach((t, k) => {
    if (t.owner) owners += p.count[k]; else wageWeight += p.count[k] * t.wage;
    if (livesOffLand(t)) subsisting += p.count[k];
  });
  const market = Math.max(0, gdp - subsistenceValue);
  POP_TYPES.forEach((t, k) => {
    if (!p.count[k]) return;
    if (t.owner) p.income[k] = (market * POP_RULES.ownerShare * p.count[k]) / owners;
    else if (t.wage) p.income[k] = (market * (1 - POP_RULES.ownerShare) * p.count[k] * t.wage) / wageWeight;
    if (livesOffLand(t)) p.income[k] += (subsistenceValue * p.count[k]) / subsisting;
  });
  POP_TYPES.forEach((_, k) => {
    p.qol[k] = p.count[k] ? Math.min(50, Math.max(1, (25 * p.income[k]) / p.count[k] / needCost)) : 0;
  });
}

/** Peso político total por classe (base para os grupos políticos). */
export const politicalWeight = (p: Pops) => CLASSES.map((_, c) => POP_TYPES.reduce((s, t, k) => s + (t.cls === c ? p.count[k] * t.weight : 0), 0));

/** Alvo de lealdade (0–100): QV 25 e legitimidade 0,5 dão 50; cada ponto de QV vale 2, cada 10% de legitimidade vale 4. */
export const loyaltyTarget = (qol: number, legitimacy: number) => Math.min(100, Math.max(0, 50 + (qol - 25) * 2 + (legitimacy - 0.5) * 40));

/** Anda a lealdade de cada tipo em direção ao alvo. Retorna a fração da população que é radical. */
export function updateLoyalty(p: Pops, legitimacy: number) {
  let total = 0, radicals = 0;
  for (let k = 0; k < NP; k++) {
    if (!p.count[k]) continue;
    p.loyalty[k] += (loyaltyTarget(p.qol[k], legitimacy) - p.loyalty[k]) * POP_RULES.loyaltyStep;
    total += p.count[k];
    if (p.loyalty[k] < POP_RULES.radicalBelow) radicals += p.count[k];
  }
  return total ? radicals / total : 0;
}

/** Qualidade de vida média da classe baixa (quem mais migra). */
export const lowerClassQol = (p: Pops) => {
  let n = 0, q = 0;
  POP_TYPES.forEach((t, k) => { if (t.cls === 0) { n += p.count[k]; q += p.count[k] * p.qol[k]; } });
  return n ? q / n : 0;
};

/** Lealdade média ponderada pela população. */
export const averageLoyalty = (p: Pops) => {
  let n = 0, l = 0;
  for (let k = 0; k < NP; k++) { n += p.count[k]; l += p.count[k] * p.loyalty[k]; }
  return n ? l / n : POP_RULES.loyaltyStart;
};
