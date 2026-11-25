import { sectorRate, record } from "./budget.ts";
import { econ, spend } from "./eramods.ts";
// Finanças e propriedade de cada edifício (estilo Victoria 3). Cada "hex:b" (construção b no hex) tem uma conta:
//   receita = o que produziu × preço do mercado da cidade (venda real da semana)
//   − insumos comprados − salários (trabalhadores × salário médio do país) − manutenção − impostos = lucro
// O lucro enche a reserva (meta: RESERVE_WEEKS semanas de custos). Passando da meta, o que sobra se divide:
//   parte estatal (níveis construídos pela fila pública) → tesouro (o Estado reinveste pela fila pública);
//   parte privada (níveis da fila privada ou privatizados) → reinvestimento no fundo de investimento + dividendos dos donos,
//   dos quais a fração da lei (fundShare) também volta ao fundo. A organização (método) diz quanto vira dividendo.
// Prejuízo: gasta a reserva; depois o Estado cobre a parte estatal (subsídio) e a parte privada vira dívida.
// Dívida privada grande demais = insolvência: um nível privado fecha.
// Os salários e dividendos já chegam às POPs pela renda do país (pops.ts distributeIncome): aqui é a conta de cada um.
import { BUILDINGS, BASE_PRICE, RULES, type Economy } from "./economy.ts";
import { POP_TYPES, POP_RULES } from "./pops.ts";
import { lawOf } from "./politics.ts";
import type { combine } from "./methods.ts";
import { MILITARY, WAR_ECON } from "./wareconomy.ts";
import type { World } from "./world.ts";

/** O que o edifício fez na semana (economy.ts tick monta, stepFirms lê). */
export type FirmRun = {
  key: string; hex: number; b: number; city: number; country: number; lv: number;
  workers: number;               // empregados de fato (com a ocupação do hex)
  outs: [number, number][];      // bens produzidos e quantidades
  ins: [number, number][];       // bens consumidos
  fx: ReturnType<typeof combine>; q: number;
  bonus?: [number, number][]; need?: [number, number][]; // extratoras: bônus e insumos dos métodos (economy.ts)
};
export type Ledger = {
  priv: number;          // níveis de dono privado (o resto é estatal/comunitário)
  reserve: number; debt: number;
  rev: number; inputs: number; wages: number; upkeep: number; tax: number; profit: number; // última semana
  div: number; reinvest: number; toState: number; // para onde foi o lucro livre na última semana
  workers: number; produced: number; // empregados e quantidade produzida
  hist: number[];        // lucro das últimas semanas (gráfico da ficha)
  built: number;         // semana em que surgiu
  log?: string[];        // mudanças: propriedade, insolvência
};

export const FIRM = {
  reserveWeeks: 6,     // meta de reserva: semanas de custos (insumos + salários + manutenção)
  insolventWeeks: 26,  // dívida acima de tantas semanas de receita (parte privada): fecha um nível
  histWeeks: 26,
  privatizeValue: 0.6, // privatizar: o fundo paga isto × o custo de construção de cada nível
  nationalizeComp: 1,  // nacionalizar: o tesouro indeniza isto × o valor
  nationalizeLegitimacy: 0.01, // legitimidade perdida por nível nacionalizado (investidores reagem)
};

export const ledgerOf = (e: Economy, key: string) => e.ledgers?.get(key);
function ensure(e: Economy, key: string): Ledger {
  let l = e.ledgers?.get(key);
  if (!l) {
    l = { priv: 0, reserve: 0, debt: 0, rev: 0, inputs: 0, wages: 0, upkeep: 0, tax: 0, profit: 0, div: 0, reinvest: 0, toState: 0, workers: 0, produced: 0, hist: [], built: e.week };
    (e.ledgers ??= new Map()).set(key, l);
  }
  return l;
}
const note = (l: Ledger, week: number, text: string) => { (l.log ??= []).push(`sem. ${week}: ${text}`); if (l.log.length > 8) l.log.shift(); };

/** Fração privada dos níveis do edifício (0 = todo estatal). */
export const privateShareOf = (e: Economy, key: string, lv: number) => (lv ? Math.min(1, (e.ledgers?.get(key)?.priv ?? 0) / lv) : 0);
/** Salário médio por trabalhador no país: a parte dos salários na renda de mercado ÷ quem vive de salário. */
export function wageOf(e: Economy, country: number) { // média do país (a conta de cada edifício usa a parte do trabalho no valor agregado)
  const c = e.countries[country - 1];
  let earners = 0;
  POP_TYPES.forEach((t, k) => { if (!t.owner && t.wage) earners += c.pops.count[k]; });
  return earners ? (Math.max(0, c.gdpWeek - c.subsistence) * (1 - POP_RULES.ownerShare)) / earners : 0;
}
/** Fração dos dividendos privados que os donos põem no fundo de investimento (lei de Economia). */
export const fundShare = (e: Economy, country: number) => lawOf(e.countries[country - 1].politics, "Economia").fundShare ?? 0;

/** Novo nível privado (obra da fila privada terminou). */
export function addPrivateLevel(e: Economy, hex: number, b: number) { const l = ensure(e, `${hex}:${b}`); l.priv++; }

/** Uma vez por semana, depois da produção e dos preços. */
export function stepFirms(w: World, e: Economy, runs: FirmRun[]) {
  for (const c of e.countries) { c.ownersTake = 0; c.warSubsidy = 0; c.sectorTaxWeek = {}; }
  for (const r of runs) {
    const l = ensure(e, r.key), c = e.countries[r.country - 1], m = e.cities[r.city].market;
    l.priv = Math.min(l.priv, r.lv); // níveis perdidos (jazida, insolvência) saem primeiro da parte privada
    const value = (list: [number, number][]) => list.reduce((s, [g, q]) => s + q * BASE_PRICE[g] * m.price[g], 0);
    l.rev = value(r.outs); l.inputs = value(r.ins); l.workers = r.workers; l.produced = r.outs.reduce((s, [, q]) => s + q, 0);
    const added = Math.max(0, l.rev - l.inputs); // valor agregado: dividido entre salários e donos como na renda das POPs
    l.wages = added * (1 - POP_RULES.ownerShare);
    l.upkeep = r.lv * RULES.upkeepPerLevel * r.fx.upkeep * econ(c, "upkeep") * econ(c, "monetization"); // a mesma conta do tesouro (eramods.ts)
    const before = l.rev - l.inputs - l.wages - l.upkeep;
    const st = sectorRate(c, r.b); // tributo setorial (budget.ts): sobre a receita, pago na fonte ao Estado
    l.tax = Math.max(0, before) * c.tax + l.rev * st.rate;
    if (st.id) (c.sectorTaxWeek ??= {})[st.id] = (c.sectorTaxWeek[st.id] ?? 0) + l.rev * st.rate;
    l.profit = before - l.tax;
    l.div = l.reinvest = l.toState = 0;
    l.hist.push(l.profit); if (l.hist.length > FIRM.histWeeks) l.hist.shift();
    const def = BUILDINGS[r.b];
    if ((def.industry && !def.industry.outputs.length) || def.boosts !== undefined) continue; // serviço do Estado (administração, construção, estaleiro) ou melhoria (o ganho dela já entra na receita da extratora): só custo
    const ps = l.priv / r.lv, wl = c.warEconomy ?? 0;
    if (wl && MILITARY.has(def.name)) { // subsídio militar: o tesouro paga uma fração da receita
      const sub = l.rev * WAR_ECON.subsidy[wl];
      spend(c, sub, "Subsídios");
      c.warSubsidy = (c.warSubsidy ?? 0) + sub; l.profit += sub;
    }
    l.reserve += l.profit;
    if (l.debt > 0 && l.reserve > 0) { const pay = Math.min(l.debt, l.reserve); l.debt -= pay; l.reserve -= pay; } // paga dívida antes de distribuir
    const target = FIRM.reserveWeeks * (l.inputs + l.wages + l.upkeep);
    if (l.reserve > target) {
      const free = l.reserve - target;
      l.reserve = target;
      if (r.fx.state || wl === 2) { l.toState = free; c.treasury += free; c.ownersTake! += free; record(c, "Lucro de estatais", free); } // estatal ou requisitado na guerra total: tudo ao tesouro
      else { // dividendos aos donos; a parte privada reinveste no fundo e os donos põem lá a fração da lei
        l.div = free * r.fx.divShare; l.reinvest = (free - l.div) * ps;
        const toFund = l.reinvest + l.div * ps * fundShare(e, r.country);
        c.investPool = (c.investPool ?? 0) + toFund; c.ownersTake! += toFund;
      }
    } else if (l.reserve < 0) {
      const gap = -l.reserve;
      l.reserve = 0;
      if (r.fx.state) { l.toState = -gap * spend(c, gap, "Subsídios"); } // o Estado cobre (até o crédito)
      else {
        l.debt += gap;
        if (e.week - l.built > FIRM.insolventWeeks && l.debt > FIRM.insolventWeeks * Math.max(l.rev, l.upkeep, 1)) { // insolvência (depois da carência): fecha um nível (privado primeiro)
          e.levels[r.b][r.hex]--; if (l.priv > 0) l.priv--; l.debt *= (r.lv - 1) / r.lv;
          note(l, e.week, "insolvência: um nível fechou");
          c.insolvencies = (c.insolvencies ?? 0) + 1;
        }
      }
    }
  }
  if (e.week % 52 === 0 && e.ledgers) for (const [key, l] of e.ledgers) { // limpa contas de edifícios que não existem mais
    const [hex, b] = key.split(":").map(Number);
    if (!e.levels[b]?.[hex] && l.reserve <= 0 && l.debt <= 0) e.ledgers.delete(key);
  }
}

/** Valor de 1 nível (para privatizar/nacionalizar): custo de construção médio dos níveis existentes. */
const levelValue = (e: Economy, hex: number, b: number) => RULES.buildCost * (e.levels[b][hex] + 1) / 2;

/** O Estado vende `n` níveis estatais aos investidores (o fundo paga ao tesouro). */
export function privatize(w: World, e: Economy, country: number, hex: number, b: number, n = 1): string | null {
  const lv = e.levels[b]?.[hex] ?? 0, l = ensure(e, `${hex}:${b}`), c = e.countries[country - 1];
  if (w.owner[hex] !== country || !lv) return "Edifício não é seu";
  if (BUILDINGS[b].industry && !BUILDINGS[b].industry!.outputs.length) return "Serviço do Estado não se vende";
  if (lv - l.priv < n) return "Não há tantos níveis estatais";
  const price = n * levelValue(e, hex, b) * FIRM.privatizeValue;
  if ((c.investPool ?? 0) < price) return `Os investidores não têm ${Math.ceil(price)} no fundo`;
  c.investPool! -= price; c.treasury += price; l.priv += n;
  note(l, e.week, `privatizado: ${n} nível(is) por ${Math.round(price)}`);
  return null;
}

/** O Estado compra `n` níveis privados, indenizando os donos (o dinheiro volta ao fundo). Desagrada investidores. */
export function nationalize(w: World, e: Economy, country: number, hex: number, b: number, n = 1): string | null {
  const l = e.ledgers?.get(`${hex}:${b}`), c = e.countries[country - 1];
  if (w.owner[hex] !== country || !l) return "Edifício não é seu";
  if (l.priv < n) return "Não há tantos níveis privados";
  const comp = n * levelValue(e, hex, b) * FIRM.nationalizeComp + l.debt * (n / l.priv); // o Estado assume a dívida proporcional
  if (c.treasury < comp) return `Indenização de ${Math.ceil(comp)}: falta dinheiro no tesouro`;
  c.treasury -= comp; c.investPool = (c.investPool ?? 0) + comp - l.debt * (n / l.priv);
  l.debt -= l.debt * (n / l.priv); l.priv -= n;
  c.politics.legitimacy = Math.max(0, c.politics.legitimacy - FIRM.nationalizeLegitimacy * n);
  note(l, e.week, `nacionalizado: ${n} nível(is), indenização ${Math.round(comp)}`);
  return null;
}
