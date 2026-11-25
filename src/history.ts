// Séries históricas por país (1 ponto por mês) para a aba Gráficos.
import { GOODS, BASE_PRICE, type Economy, type Country } from "./economy.ts";
import { prestige } from "./diplomacy.ts";

/** Nome da série → valor atual do país. */
/** País dono do edifício "hex:b". */
const ownerOfKey = (key: string, e: Economy) => e.cities[e.market[+key.split(":")[0]] - 1]?.country ?? 0; // dono = país da cidade que atende o hex
export const SERIES: Record<string, (c: Country, k: number, e?: Economy) => number> = {
  "PIB": (c) => c.gdpWeek * 52,
  "População": (c) => c.pop,
  "Vivem da terra": (c) => c.sub?.dependants ?? 0,
  "Pressão sobre a terra (%)": (c) => (c.sub?.capacity ? (100 * c.sub.dependants) / c.sub.capacity : 0),
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
  "Capacidade de construção": (c) => c.cpWeek ?? 0,
  "Construção usada": (c) => c.cpUsed ?? 0,
  "Fundo de investimento": (c) => c.investPool ?? 0,
  "Contribuições ao fundo": (c) => (c.investWeek ?? 0) + (c.ownersTake ?? 0),
  "Lucro dos edifícios": (_c, k, e) => { let s = 0; if (e?.ledgers) for (const [key, l] of e.ledgers) if (e.levels[+key.split(":")[1]]?.[+key.split(":")[0]] && ownerOfKey(key, e) === k) s += l.profit; return s; },
  "Insolvências": (c) => c.insolvencies ?? 0,
  "Economia de guerra": (c) => c.warEconomy ?? 0,
  "Subsídio militar": (c) => c.warSubsidy ?? 0,
  "Produção militar": (_c, k, e) => { let s = 0; if (e) for (const x of e.cities) if (x.country === k) for (const n of ["Armas", "Pólvora"]) { const gi = GOODS.indexOf(n); s += x.market.supply[gi] * BASE_PRICE[gi]; } return s; },
  "Produção civil": (c, k, e) => { let s = 0; if (e) for (const x of e.cities) if (x.country === k) for (const n of ["Armas", "Pólvora"]) { const gi = GOODS.indexOf(n); s += x.market.supply[gi] * BASE_PRICE[gi]; } return Math.max(0, c.gdpWeek - s); },
};
const PRICE_KEEP = 24; // 2 anos de preço por mercadoria (tendência nos cartões de Economia)
const KEEP = 600; // 50 anos de meses (o save leva tudo isto)
/** A cada tantos anos, apaga a história dos países menos importantes (metade de baixo do prestígio, sem jogador). */
export const PRUNE = { years: 30, keepShare: 0.5 };

/** Uma vez por mês: guarda um ponto de cada série. */
export function recordHistory(e: Economy) {
  if (e.week % 4 !== 0) return;
  if (e.week > 0 && e.week % (52 * PRUNE.years) === 0) pruneHistory(e);
  const price = e.countries.map(() => new Float64Array(GOODS.length)), pop = new Float64Array(e.countries.length);
  for (const k of e.cities) { const m = k.market; pop[k.country - 1] += m.pop; for (let g = 1; g < GOODS.length; g++) price[k.country - 1][g] += m.price[g] * m.pop; }
  e.countries.forEach((c, i) => {
    const h = (c.history ??= {});
    if (pop[i]) for (let g = 1; g < GOODS.length; g++) { const a = (h["$" + GOODS[g]] ??= []); a.push(+(price[i][g] / pop[i]).toPrecision(3)); if (a.length > PRICE_KEEP) a.shift(); } // $ = preço, fora da lista de séries
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
