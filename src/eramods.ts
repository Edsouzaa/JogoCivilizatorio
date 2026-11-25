// Dificuldades estruturais por era (EconomicEraModifiers): a sociedade começa com pouca moeda, arrecadação fraca,
// comércio curto e construção lenta. A era vem da pesquisa do país (não da data): só tecnologia e instituições melhoram.
// Cada fator é aplicado UMA vez, num lugar só (economy.ts, construction.ts) — ver docs/economia-por-era.md.
//   tax: fração do imposto devido que o Estado consegue cobrar          monetization: fração da atividade que vira dinheiro
//   trade: × comércio entre cidades e com o exterior                    industry: × produção das indústrias
//   admin: × pontos administrativos                                     construction: × pontos de construção
//   upkeep: × manutenção das construções                                foodLoss: comida de subsistência perdida por mês
//   credit: capacidade de endividamento (× PIB anual)                   privateInvest: × o que os donos põem no fundo
import { lawOf } from "./politics.ts";
import type { Country } from "./economy.ts";

export type EconKey = "tax" | "monetization" | "trade" | "industry" | "admin" | "construction" | "upkeep" | "foodLoss" | "credit" | "privateInvest";
type Row = Record<EconKey, number>;
const row = (tax: number, monetization: number, trade: number, industry: number, admin: number, construction: number, upkeep: number, foodLoss: number, credit: number, privateInvest: number): Row =>
  ({ tax, monetization, trade, industry, admin, construction, upkeep, foodLoss, credit, privateInvest });

/** Valores de partida por era (Tribal … Moderna). Ajuste aqui: é o único lugar. */
export const ERA_ECON: Row[] = [
  row(0.15, 0.2, 0.25, 0.35, 0.2, 0.5, 1.5, 0.15, 0, 0),
  row(0.3, 0.4, 0.4, 0.5, 0.35, 0.6, 1.3, 0.1, 0.1, 0.1),
  row(0.4, 0.5, 0.5, 0.6, 0.45, 0.7, 1.2, 0.08, 0.2, 0.2),
  row(0.5, 0.6, 0.6, 0.7, 0.55, 0.8, 1.1, 0.06, 0.35, 0.4),
  row(0.6, 0.7, 0.7, 0.75, 0.6, 0.85, 1.05, 0.05, 0.45, 0.6),
  row(0.7, 0.8, 0.8, 0.85, 0.7, 0.95, 1, 0.04, 0.6, 0.8),
  row(0.8, 0.9, 0.9, 1, 0.8, 1.1, 0.95, 0.03, 0.75, 1),
  row(0.85, 0.95, 0.9, 1.1, 0.85, 1.2, 1, 0.02, 0.85, 1),
  row(0.9, 1, 1, 1.2, 0.9, 1.3, 0.95, 0.01, 0.95, 1),
  row(0.95, 1, 1.1, 1.3, 1, 1.4, 0.9, 0.005, 1, 1),
];

/** Melhorias de tecnologias e leis (somadas à base da era; manutenção e perdas: subtraídas). Nenhuma tira tudo sozinha. */
export const ECON_TECH: Record<string, Partial<Row>> = {
  "Moeda": { monetization: 0.1, tax: 0.03, trade: 0.05 },
  "Escrita": { tax: 0.03, admin: 0.05 },
  "Direito escrito": { tax: 0.03, admin: 0.03 },
  "Cerâmica": { foodLoss: 0.03 },
  "Letras de câmbio": { credit: 0.1, monetization: 0.05 },
  "Contabilidade de partidas dobradas": { tax: 0.05, credit: 0.1, upkeep: 0.05 },
  "Bancos": { credit: 0.15, monetization: 0.05 },
  "Bolsa de valores": { credit: 0.1, privateInvest: 0.2 },
  "Correios": { admin: 0.05, tax: 0.03 },
  "Ferrovias": { trade: 0.1, construction: 0.05 },
  "Eletricidade": { industry: 0.1, construction: 0.05 },
  "Refrigeração": { foodLoss: 0.02 },
  "Computadores": { admin: 0.05, tax: 0.03 },
  "Internet": { trade: 0.05, admin: 0.03 },
  "Governo digital": { tax: 0.05, admin: 0.05, upkeep: 0.05 },
};
/** Leis que mexem nos fatores (lei ativa em qualquer categoria). */
export const ECON_LAW: Record<string, Partial<Row>> = {
  "Imposto proporcional": { tax: 0.05 },
  "Imposto de renda": { tax: 0.08 },
  "Burocracia profissional": { admin: 0.08, tax: 0.03 },
  "Administração digital": { admin: 0.08, upkeep: 0.05 },
  "Livre comércio": { trade: 0.05 },
  "Educação pública": { industry: 0.05 },
};
const SUBTRACT: EconKey[] = ["upkeep", "foodLoss"]; // nesses, melhorar = diminuir

/** Fator do país para a chave: base da era + tecnologias + leis, com limites (eficiências até 1; produtividade até 1,5). */
export function econ(c: Country, key: EconKey): number {
  let v = ERA_ECON[c.research.era][key];
  for (const t of c.research.known) v += (SUBTRACT.includes(key) ? -1 : 1) * (ECON_TECH[t]?.[key] ?? 0);
  for (const cat of Object.keys(c.politics.laws)) v += (SUBTRACT.includes(key) ? -1 : 1) * (ECON_LAW[lawOf(c.politics, cat).name]?.[key] ?? 0);
  const max = key === "industry" || key === "construction" || key === "trade" ? 1.5 : key === "upkeep" ? 2 : 1;
  const min = key === "upkeep" ? 0.8 : 0;
  return Math.max(min, Math.min(max, v));
}

/** Teto de dívida do país: crédito × PIB anual (sociedade sem crédito não se endivida). */
export const debtCap = (c: Country) => econ(c, "credit") * ECON_RULES.debtPerGdp * c.gdpWeek * 52;
export const ECON_RULES = { debtPerGdp: 1 };

/** Paga `amount` do tesouro sem passar do teto de crédito. Devolve a fração paga (o resto fica sem pagar). */
export function spend(c: Country, amount: number): number {
  if (amount <= 0) return 1;
  const pay = Math.min(amount, Math.max(0, c.treasury) + Math.max(0, debtCap(c) - c.debt));
  c.treasury -= pay;
  if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; }
  return pay / amount;
}
