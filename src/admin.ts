// Pontos administrativos e incentivos regionais (decretos do Vic3 + focos do Vic2; docs/incentivos.md).
// Centros administrativos queimam Papel e geram pontos; o país guarda até um teto que sobe com a era.
// Incentivo = política numa cidade ou num estado inteiro: custa pontos para ativar e por semana, conforme a
// Complexidade Social da região. O efeito cresce aos poucos (progresso) e alguns deixam marcas permanentes.
import { BUILDINGS, type Economy, type City } from "./economy.ts";
import { TECHS, areaOf } from "./tech.ts";
import { tv, tvMul, tvCut } from "./techvars.ts";

export const ADMIN = {
  perLevel: 2,      // pontos por semana por nível de centro administrativo com papel
  capBase: 100,     // estoque máximo: capBase × (era + 1)
  stateMult: 1.25,  // incentivo no estado inteiro: +25% (não multiplica pelo número de cidades)
  suspendedUpkeep: 0.5, // requisito perdido: efeito parado, manutenção pela metade
};

/** Chaves de efeito ligadas a mecânicas reais (onde cada uma é lida está em docs/incentivos.md). */
export type FxKey = "farm" | "extract" | "industry" | "tax" | "control" | "growth" | "urban" | "access" | "unrest" | "legitimacy" | "research" | "manpower"
  | "construction" | "literacy" | "culture" | "skill" | "defense" | "readiness" | "famine" | "exempt";
type Def = {
  cost: number; upkeep: number; cat: "Administração e estabilidade" | "Economia e desenvolvimento" | "Sociedade, educação e população" | "Militar e segurança";
  desc: string; fx: [FxKey, number][]; ramp: number; max: number; // semanas até o efeito cheio; duração máxima
  group?: string; perm?: boolean; // grupo de exclusão; efeito permanente (acumula e fica)
  req?: (e: Economy, cities: number[]) => string | null; glyph: string;
};
/** Alguma construção da região passa no teste? (BUILDINGS só é lido em tempo de execução: import circular com economy.ts) */
function has(e: Economy, cities: number[], f: (d: (typeof BUILDINGS)[number]) => boolean) {
  const ks = new Set(cities.map((k) => k + 1));
  for (const i of e.producers) if (ks.has(e.market[i])) for (let b = 0; b < BUILDINGS.length; b++) if (e.levels[b][i] && f(BUILDINGS[b])) return true;
  return false;
}
const popOf = (e: Economy, cities: number[]) => cities.reduce((s, k) => s + (e.cities[k]?.market.pop ?? 0), 0);

export const INCENTIVES: Record<string, Def> = {
  // A. Administração e estabilidade
  "Isenção fiscal": { cost: 20, upkeep: 1, cat: "Administração e estabilidade", desc: "A região não paga imposto, mas produz 15% a mais (atrai investimento).", fx: [["exempt", 1], ["farm", 0.15], ["extract", 0.15]], ramp: 1, max: 104, glyph: "treasury" },
  "Alívio emergencial": { cost: 15, upkeep: 1.5, cat: "Administração e estabilidade", desc: "Comida e abrigo do governo: ninguém morre de fome; menos agitação.", fx: [["famine", 1], ["unrest", -0.03]], ramp: 1, max: 26, glyph: "bread" },
  "Integração": { cost: 25, upkeep: 1, cat: "Administração e estabilidade", desc: "Burocratas e estradas: controle máximo da região +25%.", fx: [["control", 1]], ramp: 13, max: 104, glyph: "map" },
  "Impor ideias": { cost: 30, upkeep: 2, cat: "Administração e estabilidade", desc: "Propaganda pela lei em votação: +10% de apoio (até +30%); minorias resistem (+agitação).", fx: [["unrest", 0.02]], ramp: 4, max: 104, glyph: "news" },
  "Reforma administrativa": { cost: 25, upkeep: 1.5, cat: "Administração e estabilidade", desc: "Menos desvios: arrecadação efetiva da região +10%.", fx: [["tax", 0.1]], ramp: 26, max: 104, glyph: "admin" },
  "Pacificação regional": { cost: 25, upkeep: 2, cat: "Administração e estabilidade", desc: "Acordos locais: menos agitação e separatismo.", fx: [["unrest", -0.08]], ramp: 13, max: 104, glyph: "peace" },
  "Combate à corrupção": { cost: 30, upkeep: 1.5, cat: "Administração e estabilidade", desc: "Fiscalização: arrecadação efetiva +8% e um pouco mais de legitimidade.", fx: [["tax", 0.08], ["legitimacy", 0.001]], ramp: 26, max: 104, glyph: "pick" },
  "Campanha de ordem pública": { cost: 20, upkeep: 1.5, cat: "Administração e estabilidade", desc: "Guardas e patrulhas: menos banditismo e agitação; controle +10%.", fx: [["unrest", -0.05], ["control", 0.4]], ramp: 8, max: 52, glyph: "fort" },
  // B. Economia e desenvolvimento
  "Incentivar agricultura": { cost: 20, upkeep: 1, cat: "Economia e desenvolvimento", desc: "Fazendas e pastos da região produzem até 20% a mais.", fx: [["farm", 0.2]], ramp: 26, max: 260, group: "foco econômico", glyph: "bread" },
  "Incentivar extração": { cost: 20, upkeep: 1, cat: "Economia e desenvolvimento", desc: "Minas, serrarias e caça produzem até 20% a mais.", fx: [["extract", 0.2]], ramp: 26, max: 260, group: "foco econômico", glyph: "pick",
    req: (e, cs) => has(e, cs, (d) => !d.industry && d.for.length > 0) ? null : "Precisa de uma extratora na região" },
  "Incentivar indústria": { cost: 25, upkeep: 1.5, cat: "Economia e desenvolvimento", desc: "Indústrias e oficinas da região produzem até 15% a mais.", fx: [["industry", 0.15]], ramp: 26, max: 260, group: "foco econômico", glyph: "build",
    req: (e, cs) => has(e, cs, (d) => !!d.industry) ? null : "Precisa de uma indústria na região" },
  "Desenvolvimento comercial": { cost: 25, upkeep: 1, cat: "Economia e desenvolvimento", desc: "Mercados e comerciantes: acesso ao mercado nacional +10%.", fx: [["access", 0.1]], ramp: 13, max: 156, glyph: "trade" },
  "Obras públicas": { cost: 30, upkeep: 2, cat: "Economia e desenvolvimento", desc: "Mais pontos de construção no país (pelo peso da região).", fx: [["construction", 0.3]], ramp: 4, max: 104, glyph: "build" },
  "Modernização regional": { cost: 35, upkeep: 2, cat: "Economia e desenvolvimento", desc: "Novos métodos e técnicas: pesquisa do país +10% (pelo peso da região).", fx: [["research", 0.1]], ramp: 26, max: 260, glyph: "tech" },
  "Incentivar urbanização": { cost: 30, upkeep: 1.5, cat: "Economia e desenvolvimento", desc: "A cidade ganha hexes com 40% menos crescimento de gente.", fx: [["urban", 0.4]], ramp: 13, max: 156, glyph: "city" },
  "Desenvolvimento de infraestrutura": { cost: 25, upkeep: 1.5, cat: "Economia e desenvolvimento", desc: "Estradas e portos: acesso +8% e mais pontos de construção.", fx: [["access", 0.08], ["construction", 0.1]], ramp: 13, max: 156, glyph: "road",
    req: (e, cs) => (e.countries[(e.cities[cs[0]]?.country ?? 1) - 1].cpWeek ?? 0) > 0 ? null : "Precisa de capacidade de construção" },
  // C. Sociedade, educação e população
  "Mobilidade social": { cost: 25, upkeep: 1, cat: "Sociedade, educação e população", desc: "Mais gente muda de profissão: pesquisa +3% e menos agitação.", fx: [["research", 0.03], ["unrest", -0.02]], ramp: 26, max: 156, glyph: "people" },
  "Campanha de alfabetização": { cost: 25, upkeep: 1.5, cat: "Sociedade, educação e população", desc: "Escolas e cartilhas: letrados sobem (fica depois que acabar).", fx: [["literacy", 0.05]], ramp: 26, max: 260, perm: true, glyph: "book",
    req: (e, cs) => e.countries[(e.cities[cs[0]]?.country ?? 1) - 1].research.known.has("Escrita") ? null : "Precisa de Escrita" },
  "Formação profissional": { cost: 30, upkeep: 1.5, cat: "Sociedade, educação e população", desc: "Oficinas-escola: indústrias rendem mais (qualificação fica).", fx: [["skill", 0.05]], ramp: 26, max: 260, perm: true, glyph: "worker",
    req: (e, cs) => has(e, cs, (d) => !!d.industry) ? null : "Precisa de uma oficina ou indústria na região" },
  "Atrair imigrantes": { cost: 25, upkeep: 1.5, cat: "Sociedade, educação e população", desc: "Terra e trabalho prometidos: a região cresce 30% mais rápido.", fx: [["growth", 0.3]], ramp: 13, max: 156, glyph: "people" },
  "Incentivar natalidade": { cost: 20, upkeep: 1, cat: "Sociedade, educação e população", desc: "Apoio às famílias: crescimento natural +40%.", fx: [["growth", 0.4]], ramp: 26, max: 260, glyph: "heart" },
  "Integração cultural": { cost: 25, upkeep: 1.5, cat: "Sociedade, educação e população", desc: "Convivência: minorias pesam menos na lealdade (progresso fica).", fx: [["culture", 0.05]], ramp: 26, max: 260, perm: true, glyph: "people" },
  "Promoção da língua oficial": { cost: 25, upkeep: 1.5, cat: "Sociedade, educação e população", desc: "Língua oficial ensinada: minorias pesam menos (progresso fica).", fx: [["culture", 0.04]], ramp: 26, max: 260, perm: true, glyph: "book" },
  "Incentivar instituições religiosas": { cost: 20, upkeep: 1, cat: "Sociedade, educação e população", desc: "Templos e clero: legitimidade sobe aos poucos.", fx: [["legitimacy", 0.002]], ramp: 13, max: 156, glyph: "church" },
  "Assistência social": { cost: 25, upkeep: 2, cat: "Sociedade, educação e população", desc: "Ajuda aos mais pobres: menos agitação e ninguém morre de fome.", fx: [["unrest", -0.06], ["famine", 1]], ramp: 8, max: 156, glyph: "heart" },
  // D. Militar e segurança
  "Recrutamento regional": { cost: 25, upkeep: 1.5, cat: "Militar e segurança", desc: "Mais recrutas no país (pelo peso da região).", fx: [["manpower", 0.05]], ramp: 8, max: 104, glyph: "soldier",
    req: (e, cs) => popOf(e, cs) >= 500 ? null : "Precisa de 500 pessoas na região" },
  "Preparação militar": { cost: 30, upkeep: 2, cat: "Militar e segurança", desc: "Treino: suas tropas na região +0,5 no dado.", fx: [["readiness", 0.5]], ramp: 13, max: 104, glyph: "military" },
  "Fortificação regional": { cost: 30, upkeep: 1.5, cat: "Militar e segurança", desc: "Muralhas e torres: +1 no dado defendendo na região.", fx: [["defense", 1]], ramp: 26, max: 260, glyph: "fort",
    req: (e, cs) => (e.countries[(e.cities[cs[0]]?.country ?? 1) - 1].cpWeek ?? 0) > 0 ? null : "Precisa de capacidade de construção" },
  "Patriotismo regional": { cost: 25, upkeep: 1.5, cat: "Militar e segurança", desc: "Bandeiras e desfiles: menos agitação e mais recrutas.", fx: [["unrest", -0.04], ["manpower", 0.02]], ramp: 13, max: 104, glyph: "flag" },
  "Segurança de fronteira": { cost: 25, upkeep: 1.5, cat: "Militar e segurança", desc: "Postos e patrulhas: controle +10% e +0,5 no dado defendendo.", fx: [["control", 0.4], ["defense", 0.5]], ramp: 8, max: 104, glyph: "fort" },
};
export type IncentiveKind = string;
/** Incentivo ativo: numa cidade (city) ou num estado inteiro (state). */
export type Incentive = { city: number; kind: IncentiveKind; state?: number; start?: number; until?: number; suspended?: string };

/** Cidades alcançadas pelo incentivo. */
export const citiesOf = (e: Economy, x: Incentive) => x.state !== undefined ? e.cities.map((k, i) => [k, i] as const).filter(([k]) => k.state === x.state).map(([, i]) => i) : [x.city];
const applies = (e: Economy, x: Incentive, k: number) => x.state !== undefined ? e.cities[k]?.state === x.state : x.city === k;
/** Progresso 0..1 do efeito (sobe até ramp semanas; parado se suspenso). */
export const progressOf = (e: Economy, x: Incentive) => x.suspended ? 0 : Math.min(1, ((e.week - (x.start ?? e.week) + 1) * tvMul(e.countries[(e.cities[x.city]?.country ?? 1) - 1].research, "socialAdministration")) / INCENTIVES[x.kind].ramp);

/** O incentivo está ativo na cidade k (nela ou no estado dela)? */
export const hasIncentive = (e: Economy, k: number, kind: IncentiveKind) => !!e.incentives?.some((x) => x.kind === kind && !x.suspended && applies(e, x, k));
/** Efeito somado na cidade k (cada tipo conta uma vez: cidade e estado não se somam). */
export function incFx(e: Economy, k: number, key: FxKey) {
  let v = 0; const seen = new Set<string>();
  for (const x of e.incentives ?? []) if (!seen.has(x.kind) && applies(e, x, k)) { const f = INCENTIVES[x.kind]?.fx.find(([fk]) => fk === key); if (f) { v += f[1] * progressOf(e, x); seen.add(x.kind); } }
  return v;
}
/** Efeito no país: média pela população das cidades alcançadas (região pequena, efeito pequeno). */
export function incCountryFx(e: Economy, country: number, key: FxKey) {
  let v = 0, tot = 0;
  e.cities.forEach((k, i) => { if (k.country !== country) return; tot += k.market.pop; const f = incFx(e, i, key); if (f) v += f * k.market.pop; });
  return tot ? v / tot : 0;
}

/** Instituições: tecnologias sociais conhecidas (governo, administração, educação, saúde...). */
const institutions = (c: Economy["countries"][number]) => { let n = 0; for (const t of c.research.known) if (SOCIAL.has(t)) n++; return n; };
const SOCIAL = new Set(TECHS.filter((t) => areaOf(t) === "Social").map((t) => t.name));
/** Complexidade Social do país inteiro (todas as cidades). */
export const countrySocialComplexity = (e: Economy, country: number) => socialComplexity(e, e.cities.map((k, i) => (k.country === country ? i : -1)).filter((i) => i >= 0));
/** Complexidade Social (0–100+) de um conjunto de cidades: diversidade de cultura, língua e religião, urbanização, tamanho, letrados e classes. */
export function socialComplexity(e: Economy, cities: number[]) {
  const ks = cities.map((k) => e.cities[k]).filter(Boolean) as City[];
  const pop = ks.reduce((s, k) => s + k.market.pop, 0);
  if (!ks.length) return 0;
  const ent = (m?: Record<number, number>) => { if (!m) return 0; const vs = Object.values(m), t = vs.reduce((a, b) => a + b, 0) || 1; return -vs.reduce((s, v) => (v > 0 ? s + (v / t) * Math.log2(v / t) : s), 0); };
  const w = (k: City) => (pop ? k.market.pop / pop : 1 / ks.length);
  const div = ks.reduce((s, k) => s + w(k) * (ent(k.identity?.culture) + ent(k.identity?.language) + ent(k.identity?.religion)), 0);
  const c = e.countries[ks[0].country - 1], urban = ks.reduce((s, k) => s + k.urban.length, 0) / Math.max(1, ks.reduce((s, k) => s + k.size, 0));
  const classes = c.pops.count.reduce((s, v) => s + (v > 1 ? 1 : 0), 0);
  return Math.round(12 * div + 15 * urban * Math.min(1, ks.length / 3 + 0.3) + 10 * Math.log10(pop / 500 + 1) + 20 * (c.literacy ?? 0) + 1.5 * classes + 2 * c.research.era + 0.25 * institutions(c));
}
/** Custo final (ativação, manutenção) do incentivo no território: base × (1 + Complexidade/100), estado +25%. */
export function incentiveCost(e: Economy, kind: IncentiveKind, cities: number[], state: boolean) {
  const d = INCENTIVES[kind], m = (1 + socialComplexity(e, cities) / 100) * (state ? ADMIN.stateMult : 1);
  const r = e.countries[(e.cities[cities[0]]?.country ?? 1) - 1].research; // registros barateiam a ativação; burocracia profissional a manutenção
  return { cost: d.cost * m * tvCut(r, "recordKeeping"), upkeep: d.upkeep * m * tvCut(r, "bureaucraticCost"), mult: m };
}

export const adminCap = (e: Economy, country: number) => ADMIN.capBase * (e.countries[country - 1].research.era + 1) * tvMul(e.countries[country - 1].research, "bureaucraticCapacity");

/** Pode ativar? (dono, já ativo, grupo concorrente, requisito, pontos). */
export function canIncentive(e: Economy, country: number, kind: IncentiveKind, target: { city?: number; state?: number }): string | null {
  const d = INCENTIVES[kind];
  if (!d) return "Incentivo desconhecido";
  const st = target.state !== undefined ? e.states.find((s) => s.id === target.state) : undefined;
  if (target.state !== undefined && st?.country !== country) return "Estado não é seu";
  if (target.state === undefined && e.cities[target.city ?? -1]?.country !== country) return "Cidade não é sua";
  const cs = target.state !== undefined ? e.cities.map((k, i) => [k, i] as const).filter(([k]) => k.state === target.state).map(([, i]) => i) : [target.city!];
  if (!cs.length) return "Estado sem cidades";
  const here = (e.incentives ?? []).filter((x) => cs.some((k) => applies(e, x, k)) || (target.state !== undefined && x.state === target.state));
  if (here.some((x) => x.kind === kind)) return "Já ativo aí";
  const rival = d.group && here.find((x) => INCENTIVES[x.kind]?.group === d.group);
  if (rival) return `Não combina com ${rival.kind} (mesmo foco econômico)`;
  const r = d.req?.(e, cs); if (r) return r;
  const { cost } = incentiveCost(e, kind, cs, target.state !== undefined), c = e.countries[country - 1];
  if ((c.admin ?? 0) < cost) return `Faltam ${Math.ceil(cost - (c.admin ?? 0))} pontos administrativos`;
  return null;
}
/** Ativa o incentivo na cidade ou no estado. Retorna erro ou null. */
export function addIncentive(e: Economy, country: number, target: { city?: number; state?: number }, kind: IncentiveKind): string | null {
  const err = canIncentive(e, country, kind, target); if (err) return err;
  const cs = target.state !== undefined ? e.cities.map((k, i) => [k, i] as const).filter(([k]) => k.state === target.state).map(([, i]) => i) : [target.city!];
  e.countries[country - 1].admin! -= incentiveCost(e, kind, cs, target.state !== undefined).cost;
  (e.incentives ??= []).push({ city: cs[0], kind, state: target.state, start: e.week, until: e.week + INCENTIVES[kind].max });
  return null;
}
/** Cancela: para a manutenção na hora, não devolve a ativação; o que é permanente fica. */
export const removeIncentive = (e: Economy, country: number, city: number, kind: IncentiveKind, state?: number) => {
  e.incentives = (e.incentives ?? []).filter((x) => !(x.kind === kind && (state !== undefined ? x.state === state : x.state === undefined && x.city === city) && e.cities[x.city]?.country === country));
};

/** Uma semana: produção de pontos, manutenção (pela complexidade), requisitos, fim do prazo e marcas permanentes. */
export function stepAdmin(e: Economy) {
  e.incentives = (e.incentives ?? []).filter((x) => e.cities[x.city] && INCENTIVES[x.kind] && (x.until === undefined || e.week < x.until)); // cidade sumiu ou prazo acabou
  for (const x of e.incentives) { // requisito some: suspenso (efeito parado, meia manutenção); volta: segue de onde estava
    const r = INCENTIVES[x.kind].req?.(e, citiesOf(e, x)) ?? null;
    if (r && !x.suspended) x.suspended = r; else if (!r && x.suspended) { x.suspended = undefined; x.start = e.week - INCENTIVES[x.kind].ramp / 2; }
    x.start ??= e.week; x.until ??= e.week + INCENTIVES[x.kind].max;
  }
  e.countries.forEach((c, ci) => {
    const mine = e.incentives!.filter((x) => e.cities[x.city]?.country === ci + 1);
    const upkeep = mine.reduce((s, x) => s + incentiveCost(e, x.kind, citiesOf(e, x), x.state !== undefined).upkeep * (x.suspended ? ADMIN.suspendedUpkeep : 1), 0);
    c.admin = Math.min(adminCap(e, ci + 1), (c.admin ?? 0) + (c.adminWeek ?? 0) - upkeep);
    if (c.admin < 0) { c.admin = 0; e.incentives = e.incentives!.filter((x) => e.cities[x.city]?.country !== ci + 1); } // faliu: tudo cancelado
    // permanentes: acumulam enquanto ativos e ficam (letrados, qualificação, integração cultural)
    c.incLiteracy = Math.min(0.3, (c.incLiteracy ?? 0) + incCountryFx(e, ci + 1, "literacy") / 52);
    c.incSkill = Math.min(0.15, (c.incSkill ?? 0) + incCountryFx(e, ci + 1, "skill") / 52);
    c.incCulture = Math.min(0.8, (c.incCulture ?? 0) + incCountryFx(e, ci + 1, "culture") / 52);
  });
}
