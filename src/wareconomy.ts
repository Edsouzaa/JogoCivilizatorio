// Economia de guerra (Etapa 7): paz → guerra → guerra total, escolhida pelo governo.
//   Guerra: indústria militar produz mais (subsídio do tesouro), bens estratégicos não são exportados,
//     a fila privada perde metade da capacidade de construção e a indústria pode ser convertida (máquinas → armas...).
//   Guerra total: tudo da guerra mais forte; bens civis caem, a fila privada para (o Estado requisita a capacidade),
//     o lucro livre das empresas vai ao tesouro, preços estratégicos ficam tabelados e a legitimidade cai toda semana.
// Fora de guerra declarada, manter a economia mobilizada custa legitimidade (o povo não vê motivo).
import { BUILDINGS, GOODS, type Economy } from "./economy.ts";

export const WAR_ECONOMY = ["Economia de paz", "Economia de guerra", "Economia de guerra total"] as const;
export const WAR_ECON = {
  military: [0, 0.25, 0.5],      // + produção das indústrias militares
  civilian: [0, 0, -0.3],        // + produção das indústrias de bens civis (negativo: restrição)
  subsidy: [0, 0.1, 0.2],        // fração da receita das indústrias militares paga pelo tesouro (subsídio)
  privateCut: [1, 0.5, 0],       // × parte da capacidade de construção que vai para a fila privada
  legitimacyWeek: [0, 0.0005, 0.002], // legitimidade perdida por semana (o dobro fora de guerra)
  priceCap: 1,                   // guerra total: preço tabelado dos bens estratégicos (fator máximo)
};
/** Indústrias militares (prioridade e subsídio). */
export const MILITARY = new Set(["Armeiro", "Arsenal", "Fábrica de pólvora", "Doca", "Estaleiro", "Arsenal naval", "Aciaria"]);
/** Indústrias de bens civis (as primeiras a perder trabalhadores e insumos na guerra total). */
export const CIVILIAN = new Set(["Olaria", "Curtume", "Oficina de bebidas", "Oficina de joias", "Tipografia", "Fábrica de plásticos", "Fábrica de eletrônicos", "Fábrica de telecomunicações", "Moinho"]);
/** Bens estratégicos: não saem do país na guerra; tabelados na guerra total. */
export const STRATEGIC_NAMES = ["Armas", "Pólvora", "Ferro", "Aço", "Carvão mineral", "Combustível", "Petróleo", "Enxofre", "Salitre", "Máquinas", "Cavalos"];
let STRATEGIC: Set<number> | null = null; // índices calculados no 1º uso (import circular com economy.ts)
const strategic = () => (STRATEGIC ??= new Set(STRATEGIC_NAMES.map((n) => GOODS.indexOf(n))));
/** Conversão industrial: o que a fábrica produz quando o país converte a indústria para a guerra (mesmos insumos). */
export const CONVERSIONS: Record<string, [string, number][]> = {
  "Fábrica de máquinas": [["Armas", 2]],
  "Oficina de máquinas simples": [["Armas", 1]],
  "Fábrica química": [["Pólvora", 2]],
  "Fábrica têxtil": [["Tecidos", 4], ["Armas", 0.5]], // uniformes e equipamento
  "Fábrica de plásticos": [["Armas", 1]],
};
let CONV: Record<string, [number, number][]> | null = null;
const conv = () => (CONV ??= Object.fromEntries(Object.entries(CONVERSIONS).map(([b, outs]) => [b, outs.map(([n, q]) => [GOODS.indexOf(n), q] as [number, number])])));

export const warLevel = (e: Economy, country: number) => e.countries[country - 1].warEconomy ?? 0;
/** Multiplicador da produção da indústria b pela economia de guerra do país. */
export function warMult(e: Economy, country: number, b: number) {
  const lv = warLevel(e, country), name = BUILDINGS[b].name;
  return 1 + (MILITARY.has(name) ? WAR_ECON.military[lv] : CIVILIAN.has(name) ? WAR_ECON.civilian[lv] : 0);
}
/** Produtos da indústria b com a conversão (se o país converteu e está mobilizado). */
export function convertedOutputs(e: Economy, country: number, b: number): [number, number][] | null {
  const c = e.countries[country - 1];
  return (c.warEconomy ?? 0) > 0 && c.conversion ? conv()[BUILDINGS[b].name] ?? null : null;
}
/** Exportação proibida deste bem pelo país? */
export const exportBlocked = (e: Economy, country: number, good: number) => warLevel(e, country) > 0 && strategic().has(good);

/** Muda a economia do país. Guerra total exige estar em guerra. */
export function setWarEconomy(e: Economy, country: number, level: number, atWar: boolean): string | null {
  if (!Number.isInteger(level) || level < 0 || level > 2) return "Nível inválido";
  if (level === 2 && !atWar) return "Guerra total só durante uma guerra";
  const c = e.countries[country - 1];
  c.warEconomy = level;
  if (!level) c.conversion = false;
  return null;
}
export function setConversion(e: Economy, country: number, on: boolean): string | null {
  const c = e.countries[country - 1];
  if (on && !(c.warEconomy ?? 0)) return "Converta a indústria só com a economia de guerra";
  c.conversion = on;
  return null;
}

/** Uma vez por semana, depois dos preços: tabela de preços e o custo político. */
export function stepWarEconomy(e: Economy, atWar: (country: number) => boolean) {
  for (const k of e.cities) if (warLevel(e, k.country) === 2) for (const gi of strategic()) k.market.price[gi] = Math.min(k.market.price[gi], WAR_ECON.priceCap);
  e.countries.forEach((c, ci) => {
    const lv = c.warEconomy ?? 0;
    if (!lv) return;
    c.politics.legitimacy = Math.max(0, c.politics.legitimacy - WAR_ECON.legitimacyWeek[lv] * (atWar(ci + 1) ? 1 : 2));
    if (lv === 2 && !atWar(ci + 1)) c.warEconomy = 1; // a guerra acabou: desmobiliza um degrau
  });
}
