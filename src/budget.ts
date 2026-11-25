// Orçamento do Estado: impostos por classe social, tributos específicos e o livro de receitas e despesas da semana.
// O imposto sai da renda de mercado das POPs (subsistência não paga). A parte que o Estado não consegue cobrar
// (eficiência tributária da era, legitimidade, controle, isenções) fica com o povo: nada é criado nem some.
// Imposto alto baixa a renda disponível → baixa a qualidade de vida → empurra a emigração (economy.ts migrate usa a QV).
import { CLASSES, POP_TYPES, type Pops } from "./pops.ts";
import { GOODS, BASE_PRICE, BUILDINGS, type Country, type Economy } from "./economy.ts";
import type { World } from "./world.ts";

export type ClassTax = { mode: "pct" | "fixed"; v: number }; // pct: fração da renda tributável; fixed: dinheiro por pessoa por semana
export type TaxKind = {
  id: string; name: string; desc: string; tech?: string;
  classes?: number[];            // paga quem é destas classes (sobre a renda tributável)
  goods?: string[];              // sobre o consumo das casas destes bens (paga quem consome; essencial pesa mais na classe baixa)
  buildings?: string[];          // sobre a receita destas construções (sai do lucro delas; firms.ts)
  payers?: number[];             // peso por classe de quem arca com o tributo sobre consumo
  adminCost: number; adminWeek: number; maxRate: number; temporary?: number; // temporary: semanas até vencer
};
export const TAX_KINDS: TaxKind[] = [
  { id: "propriedade", name: "Tributo sobre propriedades", desc: "Sobre a renda dos donos de terras e imóveis.", tech: "Direito escrito", classes: [2], adminCost: 20, adminWeek: 0.5, maxRate: 0.3 },
  { id: "riqueza", name: "Tributo sobre riqueza", desc: "Sobre os mais ricos; reduz o que eles investem.", tech: "Contabilidade de partidas dobradas", classes: [2], adminCost: 40, adminWeek: 1, maxRate: 0.2 },
  { id: "heranca", name: "Tributo sobre herança", desc: "Sobre a riqueza passada entre gerações.", tech: "Bancos", classes: [2], adminCost: 30, adminWeek: 0.5, maxRate: 0.15 },
  { id: "salarios", name: "Tributo sobre salários", desc: "Sobre quem vive de salário.", tech: "Economia política", classes: [0, 1], adminCost: 40, adminWeek: 1, maxRate: 0.2 },
  { id: "alimentos", name: "Tributo sobre alimentos", desc: "Sobre o que as casas comem: pesa muito nos pobres.", tech: "Moeda", goods: ["Grãos", "Frutas e vegetais", "Carne e caça", "Produtos alimentícios"], payers: [0.7, 0.2, 0.1], adminCost: 15, adminWeek: 0.5, maxRate: 0.3 },
  { id: "luxo", name: "Tributo sobre luxo", desc: "Sobre joias e bebidas: pesa nos ricos.", tech: "Moeda", goods: ["Bens de luxo", "Bebidas"], payers: [0.1, 0.3, 0.6], adminCost: 15, adminWeek: 0.3, maxRate: 0.5 },
  { id: "combustivel", name: "Tributo sobre combustíveis", desc: "Sobre combustível e energia das casas.", tech: "Motor a combustão", goods: ["Combustível", "Energia elétrica"], payers: [0.4, 0.4, 0.2], adminCost: 30, adminWeek: 0.5, maxRate: 0.4 },
  { id: "agricultura", name: "Tributo sobre a produção agrícola", desc: "Sobre a receita de fazendas e pastos.", tech: "Escrita", buildings: ["Fazenda", "Pasto"], adminCost: 20, adminWeek: 0.5, maxRate: 0.25 },
  { id: "mineracao", name: "Tributo sobre extração mineral", desc: "Sobre a receita das minas e poços.", tech: "Escrita", buildings: ["Mina", "Poço"], adminCost: 20, adminWeek: 0.5, maxRate: 0.3 },
  { id: "industria", name: "Tributo sobre a indústria", desc: "Sobre a receita das fábricas.", tech: "Máquina a vapor", buildings: [], adminCost: 40, adminWeek: 1, maxRate: 0.25 }, // [] = todas as indústrias
  { id: "guerra", name: "Contribuição extraordinária de guerra", desc: "Todas as classes, por 52 semanas.", tech: "Conscrição", classes: [0, 1, 2], adminCost: 25, adminWeek: 0.5, maxRate: 0.15, temporary: 52 },
];
export type ActiveTax = { id: string; rate: number; since: number; suspended?: boolean };

/** Alíquota de cada classe: a escolhida pelo jogador ou a da lei de Impostos (média do país). */
export const classTaxOf = (c: Country, k: number): ClassTax => c.classTax?.[k] ?? { mode: "pct", v: c.tax };
export const canTax = (c: Country, t: TaxKind) => !t.tech || c.research.known.has(t.tech);

/** Muda o imposto de uma classe. */
export function setClassTax(c: Country, k: number, tax: ClassTax): string | null {
  if (!CLASSES[k]) return "Classe inválida";
  if (tax.mode === "pct" ? !(tax.v >= 0 && tax.v <= 0.6) : !(tax.v >= 0 && tax.v <= 100)) return "Valor fora do limite (até 60% ou 100 por pessoa)";
  (c.classTax ??= [])[k] = tax;
  return null;
}
/** Cria (paga os pontos administrativos), muda a alíquota ou suspende um tributo específico. */
export function setSpecificTax(e: Economy, c: Country, id: string, rate: number): string | null {
  const t = TAX_KINDS.find((x) => x.id === id);
  if (!t) return "Tributo desconhecido";
  if (!canTax(c, t)) return `Precisa pesquisar ${t.tech}`;
  if (!(rate >= 0 && rate <= t.maxRate)) return `Alíquota entre 0 e ${Math.round(t.maxRate * 100)}%`;
  const list = (c.taxes ??= []), cur = list.find((x) => x.id === id);
  if (!rate) { c.taxes = list.filter((x) => x.id !== id); return null; } // 0 = revoga
  if (cur) { cur.rate = rate; cur.suspended = false; return null; }
  if ((c.admin ?? 0) < t.adminCost) return `Faltam ${Math.ceil(t.adminCost - (c.admin ?? 0))} pontos administrativos para criar o tributo`;
  c.admin! -= t.adminCost;
  list.push({ id, rate, since: e.week });
  return null;
}

/**
 * Uma vez por semana, logo depois de dividir a renda (pops.ts distributeIncome): cobra os impostos por classe e os
 * tributos específicos sobre as casas, tira da renda de quem paga e devolve quanto o Estado recebe (entra no tesouro
 * na semana seguinte). `eff` = fração do devido que se consegue cobrar (0..1).
 */
export function collectTaxes(e: Economy, c: Country, country: number, eff: number, prices: Float64Array): number {
  const p = c.pops, taxable = p.taxable ?? new Float64Array(p.count.length);
  const byClass = CLASSES.map((_, k) => POP_TYPES.reduce((s, t, i) => s + (t.cls === k ? taxable[i] : 0), 0));
  const people = CLASSES.map((_, k) => POP_TYPES.reduce((s, t, i) => s + (t.cls === k ? p.count[i] : 0), 0));
  const due = CLASSES.map((_, k) => { const t = classTaxOf(c, k); return Math.min(byClass[k], t.mode === "pct" ? byClass[k] * t.v : t.v * people[k]); });
  c.taxByClass = due.map((d) => d * eff);
  let specific = 0;
  // tributos específicos: manutenção em pontos administrativos; sem pontos, ficam suspensos
  c.taxes = (c.taxes ?? []).filter((x) => { const t = TAX_KINDS.find((k) => k.id === x.id); return t && !(t.temporary && e.week - x.since >= t.temporary); });
  for (const x of c.taxes) {
    const t = TAX_KINDS.find((k) => k.id === x.id)!;
    x.suspended = (c.admin ?? 0) < t.adminWeek;
    if (x.suspended) continue;
    c.admin! -= t.adminWeek;
    if (t.classes) for (const k of t.classes) { const add = Math.min(byClass[k] - due[k], byClass[k] * x.rate); due[k] += add; c.taxByClass[k] += add * eff; specific += add * eff; }
    if (t.goods) { // consumo das casas: valor consumido × alíquota, pago pelas classes conforme o peso
      let base = 0;
      for (const n of t.goods) { const gi = GOODS.indexOf(n); base += c.pop * popDemandOf(gi) * BASE_PRICE[gi] * prices[gi]; }
      const tot = base * x.rate, w = t.payers ?? [1, 1, 1], sw = w.reduce((a, b) => a + b, 0);
      for (let k = 0; k < CLASSES.length; k++) { const add = Math.min(byClass[k] - due[k], (tot * w[k]) / sw); due[k] += add; c.taxByClass[k] += add * eff; specific += add * eff; }
    }
    if (t.buildings) specific += c.sectorTaxWeek?.[x.id] ?? 0; // cobrado na fonte em firms.ts, sobre a receita (sai do lucro)
  }
  c.specificTaxWeek = specific;
  // quem paga: cada tipo de POP perde a parte dele no que a classe pagou de fato
  POP_TYPES.forEach((t, i) => { if (byClass[t.cls] > 0) p.income[i] -= (taxable[i] / byClass[t.cls]) * (due[t.cls] * eff); });
  return due.reduce((s, d) => s + d, 0) * eff + Object.values(c.sectorTaxWeek ?? {}).reduce((s, v) => s + v, 0);
}
/** Consumo semanal por pessoa (economy.ts POP_DEMAND), lido sem import circular de valor. */
let popDemandOf: (gi: number) => number = () => 0;
export const setPopDemand = (f: (gi: number) => number) => { popDemandOf = f; };

/** Tributo setorial sobre a receita de uma construção (firms.ts chama por edifício; devolve a fração da receita cobrada). */
export function sectorRate(c: Country, b: number): { rate: number; id?: string } {
  for (const x of c.taxes ?? []) {
    const t = TAX_KINDS.find((k) => k.id === x.id);
    if (!t?.buildings || x.suspended) continue;
    const name = BUILDINGS[b].name, hit = t.buildings.length ? t.buildings.includes(name) : !!BUILDINGS[b].industry?.outputs.length;
    if (hit) return { rate: x.rate, id: x.id };
  }
  return { rate: 0 };
}

/** Livro da semana: receitas e despesas por categoria (o orçamento mostra; tick zera). */
export const BUDGET_IN = ["Impostos por classe", "Tributos específicos", "Tarifas", "Tributo de súditos", "Lucro de estatais"] as const;
export const BUDGET_OUT = ["Manutenção de construções", "Obras públicas", "Exército", "Frotas e aviação", "Estaleiros", "Subsídios", "Juros"] as const;
export const record = (c: Country, cat: string, v: number) => { const b = (c.book ??= {}); b[cat] = (b[cat] ?? 0) + v; };
export const resetBook = (c: Country) => { c.bookLast = c.book; c.book = {}; };
export type { World };
