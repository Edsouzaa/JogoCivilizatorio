// Séries históricas por país (1 ponto por mês) para a aba Gráficos.
import type { Economy, Country } from "./economy.ts";
import { prestige } from "./diplomacy.ts";

/** Nome da série → valor atual do país. */
export const SERIES: Record<string, (c: Country, k: number, e?: Economy) => number> = {
  "PIB": (c) => c.gdpWeek * 52,
  "População": (c) => c.pop,
  "Tesouro": (c) => c.treasury,
  "Dívida": (c) => c.debt,
  "Legitimidade": (c) => c.politics.legitimacy * 100,
  "Letrados": (c) => (c.literacy ?? 0) * 100,
  "Pesquisa": (c) => c.researchWeek,
  "Controle": (c) => (c.control ?? 1) * 100,
  "Tecnologias": (c) => c.research.known.size,
  "Recrutas": (c) => c.manpower,
  "Cidades": (_c, k, e) => (e ? e.cities.filter((x) => x.country === k).length : 0),
  "Prestígio": (_c, k, e) => (e ? prestige(e, k) : 0),
};
const KEEP = 600; // 50 anos de meses (o save leva tudo isto)
/** A cada tantos anos, apaga a história dos países menos importantes (metade de baixo do prestígio, sem jogador). */
export const PRUNE = { years: 30, keepShare: 0.5 };

/** Uma vez por mês: guarda um ponto de cada série. */
export function recordHistory(e: Economy) {
  if (e.week % 4 !== 0) return;
  if (e.week > 0 && e.week % (52 * PRUNE.years) === 0) pruneHistory(e);
  e.countries.forEach((c, i) => {
    const h = (c.history ??= {});
    for (const [name, f] of Object.entries(SERIES)) {
      (h[name] ??= []).push(+f(c, i + 1, e).toPrecision(3)); // 3 algarismos bastam para o gráfico e encolhem o save
      if (h[name].length > KEEP) h[name].shift();
    }
  });
}

/** Libera espaço no save: países de baixo no ranking de prestígio e sem jogador perdem o histórico (recomeça do zero). */
export function pruneHistory(e: Economy) {
  const ranked = e.countries.map((_, i) => i + 1).sort((a, b) => prestige(e, b) - prestige(e, a));
  for (const k of ranked.slice(Math.ceil(ranked.length * PRUNE.keepShare))) if (!e.humans.includes(k)) delete e.countries[k - 1].history;
}
