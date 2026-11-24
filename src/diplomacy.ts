// Diplomacia: relação entre cada par de países (−100 a +100) e prestígio de cada país.
// Relação melhora com acordo comercial e com diplomatas (pontos administrativos); piora com guerra,
// fronteira disputada e infâmia do outro. Relação ruim trava acordos; a IA só ataca quem ela não gosta.
// Prestígio = peso no mundo (economia, tecnologia, gente) + glória de guerras, que se apaga devagar.
import type { Economy } from "./economy.ts";

export const DIPLO = {
  pactMonth: 2, warMonth: -8, borderMonth: -0.5, infamyMonth: -0.05, // por mês (infâmia: × infâmia do outro)
  drift: 0.03,        // fração que volta para 0 por mês
  improve: 15, improveCost: 10, // "Melhorar relações": +15 por 10 pontos administrativos
  pactMin: -25,       // abaixo disto ninguém assina acordo
  warMax: 10,         // IA só declara guerra a quem ela gosta menos que isto
  warWin: 50,         // prestígio por vencer uma guerra (o perdedor perde o mesmo)
  gloryDecay: 0.01,   // fração da glória que some por mês
};

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
export const relation = (e: Economy, a: number, b: number) => (a === b ? 100 : e.relations?.[key(a, b)] ?? 0);
export function addRelation(e: Economy, a: number, b: number, v: number) {
  if (a === b) return;
  const r = (e.relations ??= {}), k = key(a, b);
  r[k] = Math.max(-100, Math.min(100, (r[k] ?? 0) + v));
}

/** Prestígio: parcela do país no PIB, tecnologia e população do mundo (até 1000) + glória de guerra. */
export function prestige(e: Economy, k: number) {
  let gdp = 0, tech = 0, pop = 0;
  for (const c of e.countries) { gdp += c.gdpWeek; tech += c.research.known.size; pop += c.pop; }
  const c = e.countries[k - 1], n = e.countries.length;
  const share = (x: number, t: number) => (t ? (x / t) * n : 1); // 1 = média do mundo
  return Math.round(100 * (0.5 * share(c.gdpWeek, gdp) + 0.3 * share(c.research.known.size, tech) + 0.2 * share(c.pop, pop)) + (c.glory ?? 0));
}

/** "Melhorar relações": manda diplomatas (pontos administrativos). */
export function improveRelations(e: Economy, a: number, b: number): string | null {
  if (a === b || !e.countries[b - 1]) return "Escolha outro país";
  const c = e.countries[a - 1];
  if ((c.admin ?? 0) < DIPLO.improveCost) return `Precisa de ${DIPLO.improveCost} pontos administrativos`;
  c.admin! -= DIPLO.improveCost;
  addRelation(e, a, b, DIPLO.improve);
  return null;
}

/** Uma vez por mês: relações andam com os fatos; glória se apaga. `borders` = pares que se encostam (e.contacts). */
export function stepDiplomacy(e: Economy) {
  const n = e.countries.length;
  const r = (e.relations ??= {});
  for (const k of Object.keys(r)) r[k] *= 1 - DIPLO.drift;
  for (const k of e.pacts) { const [a, b] = k.split("-").map(Number); addRelation(e, a, b, DIPLO.pactMonth); }
  for (const k of e.wars) { const [a, b] = k.split("-").map(Number); addRelation(e, a, b, DIPLO.warMonth); }
  (e.contacts ?? []).forEach((list, i) => { for (const b of list) if (i + 1 < b) addRelation(e, i + 1, b, DIPLO.borderMonth); });
  for (let a = 1; a <= n; a++) for (const b of e.contacts?.[a - 1] ?? []) addRelation(e, a, b, DIPLO.infamyMonth * e.countries[b - 1].infamy);
  for (const c of e.countries) c.glory = (c.glory ?? 0) * (1 - DIPLO.gloryDecay);
  for (const k of Object.keys(r)) if (Math.abs(r[k]) < 0.5) delete r[k]; // não guarda o que voltou a zero
}
