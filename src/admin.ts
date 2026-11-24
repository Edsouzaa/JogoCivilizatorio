// Pontos administrativos e incentivos (estilo decretos de estado do Vic3).
// Centros administrativos queimam Papel e geram pontos; o país guarda até um teto que sobe com a era.
// Incentivo = política numa cidade (ou em todas as cidades de um estado): custa pontos para criar e por semana.
import type { Economy } from "./economy.ts";

export const ADMIN = {
  perLevel: 2,      // pontos por semana por nível de centro administrativo com papel
  capBase: 100,     // estoque máximo: capBase × (era + 1)
};

export const INCENTIVES = {
  "Isenção fiscal": { cost: 20, upkeep: 1, desc: "A cidade não paga imposto, mas produz 15% a mais (atrai investimento)." },
  "Alívio emergencial": { cost: 15, upkeep: 1.5, desc: "Comida e abrigo do governo: ninguém morre de fome na cidade." },
  "Integração": { cost: 25, upkeep: 1, desc: "Burocratas e estradas: controle máximo da região +25%." },
  "Impor ideias": { cost: 30, upkeep: 2, desc: "Propaganda pela lei em votação: +10% de apoio popular (até +30% somando cidades)." },
} as const;
export type IncentiveKind = keyof typeof INCENTIVES;
export type Incentive = { city: number; kind: IncentiveKind };

/** O incentivo está ativo na cidade k? */
export const hasIncentive = (e: Economy, k: number, kind: IncentiveKind) => !!e.incentives?.some((x) => x.city === k && x.kind === kind);

export const adminCap = (e: Economy, country: number) => ADMIN.capBase * (e.countries[country - 1].research.era + 1);

/** Cria o incentivo nas cidades dadas (todas do país). Retorna erro ou null. */
export function addIncentive(e: Economy, country: number, cities: number[], kind: IncentiveKind): string | null {
  const def = INCENTIVES[kind];
  if (!def) return "Incentivo desconhecido";
  const todo = cities.filter((k) => e.cities[k]?.country === country && !hasIncentive(e, k, kind));
  if (!todo.length) return "Já ativo aí";
  const c = e.countries[country - 1], cost = def.cost * todo.length;
  if ((c.admin ?? 0) < cost) return `Faltam ${Math.ceil(cost - (c.admin ?? 0))} pontos administrativos`;
  c.admin! -= cost;
  (e.incentives ??= []).push(...todo.map((city) => ({ city, kind })));
  return null;
}

export const removeIncentive = (e: Economy, country: number, city: number, kind: IncentiveKind) => {
  e.incentives = (e.incentives ?? []).filter((x) => !(x.city === city && x.kind === kind && e.cities[city]?.country === country));
};

/** Uma semana: soma a produção de pontos (já em adminWeek), cobra a manutenção e corta incentivos sem verba. */
export function stepAdmin(e: Economy) {
  e.countries.forEach((c, ci) => {
    const mine = (e.incentives ?? []).filter((x) => e.cities[x.city]?.country === ci + 1);
    const upkeep = mine.reduce((s, x) => s + INCENTIVES[x.kind].upkeep, 0);
    c.admin = Math.min(adminCap(e, ci + 1), (c.admin ?? 0) + (c.adminWeek ?? 0) - upkeep);
    if (c.admin < 0) { c.admin = 0; e.incentives = (e.incentives ?? []).filter((x) => e.cities[x.city]?.country !== ci + 1); } // faliu: tudo cancelado
  });
  e.incentives = (e.incentives ?? []).filter((x) => e.cities[x.city]); // cidade sumiu
}
