// Grupos políticos e leis (docs/politica.md).
// Poder Político = peso político dos POPs que apoiam o grupo (decide leis e governo).
// Poder Popular = fração de pessoas que apoiam o grupo (dá legitimidade).
import { ERAS } from "./tech.ts";
import { POP_TYPES, type Pops } from "./pops.ts";

const era = (name: string) => ERAS.indexOf(name);

export const GROUPS = [
  { name: "Anciãos e Clãs", era: 0 },
  { name: "Forças Armadas", era: 0 },
  { name: "Devotos", era: 0 },
  { name: "Latifundiários", era: era("Clássica") },
  { name: "Povo do Campo", era: era("Clássica") },
  { name: "Mercadores", era: era("Clássica") },
  { name: "Intelectuais", era: era("Clássica") },
  { name: "Pequena Burguesia", era: era("Medieval") },
  { name: "Industriais", era: era("Revoluções") },
  { name: "Sindicatos", era: era("Revoluções") },
  { name: "Ambientalistas", era: era("Multipolar") },
  { name: "Sem alinhamento", era: 0 },
];
export const NGROUPS = GROUPS.length;
const G = Object.fromEntries(GROUPS.map((g, k) => [g.name, k])) as Record<string, number>;
const UNALIGNED = G["Sem alinhamento"];

/** Que grupos cada tipo de POP apoia, e quanto. Grupo que ainda não existe na era → Sem alinhamento. */
const SUPPORT: Record<string, [string, number][]> = {
  "Escravos": [["Sem alinhamento", 1]],
  "Caçadores-coletores": [["Anciãos e Clãs", 0.7], ["Devotos", 0.3]],
  "Camponeses": [["Povo do Campo", 0.4], ["Anciãos e Clãs", 0.2], ["Devotos", 0.4]],
  "Trabalhadores": [["Sindicatos", 0.5], ["Povo do Campo", 0.2], ["Devotos", 0.3]],
  "Fazendeiros": [["Povo do Campo", 0.7], ["Devotos", 0.3]],
  "Marinheiros": [["Mercadores", 0.6], ["Sindicatos", 0.4]],
  "Soldados": [["Forças Armadas", 0.8], ["Devotos", 0.2]],
  "Operários especializados": [["Sindicatos", 0.8], ["Intelectuais", 0.2]],
  "Escriturários": [["Pequena Burguesia", 0.7], ["Intelectuais", 0.3]],
  "Comerciantes": [["Mercadores", 0.6], ["Pequena Burguesia", 0.4]],
  "Clérigos": [["Devotos", 1]],
  "Acadêmicos": [["Intelectuais", 0.8], ["Ambientalistas", 0.2]],
  "Engenheiros": [["Industriais", 0.5], ["Intelectuais", 0.5]],
  "Oficiais": [["Forças Armadas", 1]],
  "Burocratas": [["Pequena Burguesia", 0.6], ["Latifundiários", 0.4]],
  "Chefes e anciãos": [["Anciãos e Clãs", 1]],
  "Aristocratas": [["Latifundiários", 1]],
  "Capitalistas": [["Industriais", 1]],
};
for (const t of POP_TYPES) if (!SUPPORT[t.name]) throw new Error(`POP sem apoio político: ${t.name}`);
for (const s of Object.values(SUPPORT)) for (const [g] of s) if (G[g] === undefined) throw new Error(`grupo inexistente: ${g}`);

export type Law = {
  name: string; era: number; likes: string[]; dislikes: string[];
  desc?: string;        // o que a lei faz, em uma frase
  tax?: number;         // Impostos: taxa sobre o PIB
  tradeShare?: number;  // Economia: fração da sobra que circula entre as cidades do país
  fundShare?: number;   // Economia: fração dos dividendos privados que os donos põem no fundo de investimento (firms.ts)
  privateCp?: number;   // Economia: fração dos pontos de construção para a fila privada (construction.ts)
  invest?: number;      // fração do PIB por semana que os donos (capitalistas, aristocratas) põem no fundo de investimento
  singleParty?: boolean; // Governo: só o partido tem Poder Político
  federal?: boolean;     // Estados: cada estado tem lei de impostos própria
};
export const LAWS: Record<string, Law[]> = {
  "Governo": [
    { name: "Chefia tribal", desc: "Os chefes e anciãos decidem. Simples, mas só os clãs apoiam.", era: 0, likes: ["Anciãos e Clãs"], dislikes: [] },
    { name: "Monarquia", desc: "Um rei governa apoiado pela nobreza, pelo exército e pelo clero.", era: era("Clássica"), likes: ["Latifundiários", "Forças Armadas", "Devotos"], dislikes: ["Intelectuais"] },
    { name: "Teocracia", desc: "O clero governa em nome da religião.", era: era("Clássica"), likes: ["Devotos"], dislikes: ["Intelectuais", "Mercadores"] },
    { name: "República", desc: "Cidadãos escolhem quem governa; agrada comerciantes, intelectuais e camponeses.", era: era("Clássica"), likes: ["Mercadores", "Intelectuais", "Povo do Campo"], dislikes: ["Latifundiários", "Anciãos e Clãs"] },
    { name: "Partido único", desc: "Só o partido governa: grupos de fora perdem todo o Poder Político, mas não o apoio popular (risco de rival).", era: era("Grandes Guerras"), likes: ["Forças Armadas"], dislikes: ["Intelectuais", "Mercadores"], singleParty: true },
  ],
  "Impostos": [
    { name: "Tributo em espécie", desc: "Cada família entrega parte da colheita. Pouco, mas fácil de cobrar.", era: 0, likes: ["Anciãos e Clãs", "Povo do Campo"], dislikes: [], tax: 0.1 },
    { name: "Dízimo", desc: "Um décimo da produção vai para o governo e o templo.", era: era("Clássica"), likes: ["Devotos"], dislikes: ["Mercadores"], tax: 0.12 },
    { name: "Imposto por cabeça", desc: "Valor fixo por pessoa: arrecada mais, pesa sobre os pobres.", era: era("Clássica"), likes: ["Latifundiários"], dislikes: ["Povo do Campo", "Mercadores"], tax: 0.18 },
    { name: "Imposto proporcional", desc: "Cada um paga conforme a renda.", era: era("Descobertas"), likes: ["Intelectuais", "Pequena Burguesia"], dislikes: ["Latifundiários"], tax: 0.2 },
  ],
  "Estados": [
    { name: "Centralizado", desc: "Os estados só administram: cada estado dá +2% de arrecadação (até +10%).", era: 0, likes: ["Latifundiários", "Pequena Burguesia"], dislikes: [] },
    { name: "Federação", desc: "Cada estado escolhe a própria lei de impostos, como nos Estados Unidos.", era: era("Revoluções"), likes: ["Povo do Campo", "Mercadores", "Intelectuais"], dislikes: ["Latifundiários"], federal: true },
  ],
  "Economia": [
    { name: "Subsistência", desc: "Cada comunidade vive do que produz; quase não há troca entre cidades.", era: 0, likes: ["Anciãos e Clãs"], dislikes: [], tradeShare: 0.4, invest: 0, privateCp: 0, fundShare: 0 },
    { name: "Tradicionalismo", desc: "Comércio pelas rotas e costumes de sempre.", era: era("Clássica"), likes: ["Latifundiários", "Devotos"], dislikes: ["Mercadores"], tradeShare: 0.5, invest: 0.01, privateCp: 0.2, fundShare: 0.15 },
    { name: "Mercantilismo", desc: "O Estado incentiva comércio e acumula riqueza.", era: era("Descobertas"), likes: ["Mercadores"], dislikes: ["Povo do Campo"], tradeShare: 0.7, invest: 0.02, privateCp: 0.35, fundShare: 0.3 },
    { name: "Livre comércio", desc: "Mercadorias circulam livremente entre as cidades.", era: era("Revoluções"), likes: ["Industriais", "Mercadores"], dislikes: ["Latifundiários"], tradeShare: 0.9, invest: 0.04, privateCp: 0.6, fundShare: 0.5 },
  ],
};
for (const laws of Object.values(LAWS)) for (const l of laws) for (const g of [...l.likes, ...l.dislikes]) if (G[g] === undefined) throw new Error(`lei ${l.name}: grupo ${g}`);

export const POLITICS_RULES = {
  enactWeeks: 26,          // semanas para aprovar uma lei com legitimidade 0,5 e apoio
  unstableLegitimacy: 0.2, // perda de legitimidade quando um grupo de fora tem mais apoio popular que o governo
  protestSupport: -0.2,    // apoio popular abaixo disto: protestos (a lei anda pela metade)...
  revoltSupport: -0.4,     // ...e abaixo disto: revolta na fase de disputa (legitimidade cai por semana)
  revoltLegitimacy: 0.01,
};

/** As 3 fases de uma lei: cada uma é 1/3 do progresso; na passagem de fase pode acontecer um evento. */
export const LAW_PHASES = ["Proposta", "Disputa", "Aprovação"];
export const LAW_EVENTS: { text: string; progress: number; legitimacy?: number }[] = [
  { text: "Um discurso apaixonado convence os indecisos", progress: 0.1 },
  { text: "Escândalo: um aliado da lei é pego em corrupção", progress: -0.15, legitimacy: -0.03 },
  { text: "O governo faz concessões a um grupo contrário", progress: 0.05, legitimacy: -0.02 },
  { text: "Jornais e pregadores atacam a lei", progress: -0.1 },
  { text: "Manifestação a favor enche as ruas", progress: 0.08, legitimacy: 0.02 },
];
export const lawPhase = (progress: number) => Math.min(2, Math.floor(progress * 3));

export type Politics = {
  laws: Record<string, string>; // categoria → lei em vigor
  enacting: { category: string; law: string; progress: number } | null;
  political: Float64Array; popular: Float64Array; // fração 0..1 por grupo
  government: number[];  // índices dos grupos no governo
  legitimacy: number;    // 0..1
  rival: number;         // grupo de fora com mais apoio popular que o governo, ou -1
  support: number;       // apoio (−1..1) à lei em votação, do Poder Político
  popularSupport?: number; // o mesmo, do Poder Popular (povo nas ruas)
  lawEvent?: string;     // último evento da votação (para mostrar e avisar)
};

export const newPolitics = (): Politics => ({
  laws: Object.fromEntries(Object.entries(LAWS).map(([cat, laws]) => [cat, laws[0].name])),
  enacting: null, political: new Float64Array(NGROUPS), popular: new Float64Array(NGROUPS),
  government: [], legitimacy: 0.5, rival: -1, support: 0,
});

export const lawOf = (p: Politics, category: string) => LAWS[category].find((l) => l.name === p.laws[category])!;

/** Recalcula poder dos grupos, governo e legitimidade a partir da população por tipo. */
export function updatePolitics(p: Politics, pops: Pops, countryEra: number) {
  p.political.fill(0); p.popular.fill(0);
  POP_TYPES.forEach((t, k) => {
    const n = pops.count[k];
    if (!n) return;
    for (const [name, share] of SUPPORT[t.name]) {
      const g = GROUPS[G[name]].era <= countryEra ? G[name] : UNALIGNED;
      p.political[g] += n * t.weight * share;
      p.popular[g] += n * share;
    }
  });
  p.political[UNALIGNED] = 0; // sem alinhamento não governa nem vota
  const norm = (a: Float64Array) => { const s = a.reduce((x, y) => x + y, 0) || 1; for (let g = 0; g < a.length; g++) a[g] /= s; };
  norm(p.political); norm(p.popular);

  // governo: os grupos mais fortes até passar de metade do Poder Político
  const order = GROUPS.map((_, g) => g).filter((g) => g !== UNALIGNED).sort((a, b) => p.political[b] - p.political[a]);
  const single = LAWS["Governo"].find((l) => l.name === p.laws["Governo"])?.singleParty;
  p.government = [];
  let sum = 0;
  for (const g of order) { if (sum > 0.5 || (single && p.government.length)) break; p.government.push(g); sum += p.political[g]; }
  if (single) { // partido único: quem está fora perde o Poder Político, mas não o Popular
    for (let g = 0; g < NGROUPS; g++) if (!p.government.includes(g)) p.political[g] = 0;
    norm(p.political);
  }
  const govPolitical = p.government.reduce((s, g) => s + p.political[g], 0);
  const govPopular = p.government.reduce((s, g) => s + p.popular[g], 0);
  p.legitimacy = (govPolitical + govPopular) / 2;
  p.rival = -1;
  // rival só existe no partido único: lá quem está fora não tem voz, então apoio popular maior vira instabilidade
  if (single) for (let g = 0; g < NGROUPS; g++) if (g !== UNALIGNED && !p.government.includes(g) && p.popular[g] > govPopular && (p.rival < 0 || p.popular[g] > p.popular[p.rival])) p.rival = g;
  if (p.rival >= 0) p.legitimacy = Math.max(0, p.legitimacy - POLITICS_RULES.unstableLegitimacy);
}

/** Apoio (−1..1) à lei: soma de quem gosta menos quem não gosta, pelo Poder Político (ou Popular). */
export function lawSupport(p: Politics, law: Law, popular = false) {
  const power = popular ? p.popular : p.political;
  let s = 0;
  for (const g of law.likes) s += power[G[g]];
  for (const g of law.dislikes) s -= power[G[g]];
  return s;
}

/** Começa a aprovar uma lei. Retorna erro ou null. */
export function proposeLaw(p: Politics, category: string, name: string, countryEra: number): string | null {
  const law = LAWS[category]?.find((l) => l.name === name);
  if (!law) return "Lei inexistente";
  if (law.era > countryEra) return `Disponível na era ${ERAS[law.era]}`;
  if (p.laws[category] === name) return "Essa lei já está em vigor";
  if (p.enacting) return `Já está votando ${p.enacting.law}`;
  p.enacting = { category, law: name, progress: 0 };
  return null;
}

/** Avança a votação uma semana. Só anda com apoio > 0; legitimidade maior aprova mais rápido. Retorna a lei aprovada. */
/**
 * Uma semana de votação. Política barra no parlamento (apoio ≤ 0 = travada); o povo barra nas ruas
 * (protesto = metade da velocidade; revolta na fase de disputa = perde legitimidade). `rand` sorteia os eventos de fase.
 */
export function advanceLaw(p: Politics, rand: () => number = Math.random, popularBonus = 0): string | null {
  if (!p.enacting) return null;
  const law = LAWS[p.enacting.category].find((l) => l.name === p.enacting!.law)!;
  p.support = lawSupport(p, law);
  p.popularSupport = lawSupport(p, law, true) + popularBonus; // incentivo "Impor ideias"
  if (p.support <= 0) return null; // travada no parlamento até o apoio mudar
  const before = lawPhase(p.enacting.progress);
  if (p.popularSupport < POLITICS_RULES.revoltSupport && before === 1) p.legitimacy = Math.max(0, p.legitimacy - POLITICS_RULES.revoltLegitimacy);
  const protest = p.popularSupport < POLITICS_RULES.protestSupport ? 0.5 : 1;
  p.enacting.progress += ((2 * p.legitimacy) / POLITICS_RULES.enactWeeks) * protest;
  if (lawPhase(p.enacting.progress) > before && rand() < 0.5) { // mudou de fase: às vezes acontece algo
    const ev = LAW_EVENTS[Math.floor(rand() * LAW_EVENTS.length)];
    p.enacting.progress = Math.max(0, p.enacting.progress + ev.progress);
    p.legitimacy = Math.min(1, Math.max(0, p.legitimacy + (ev.legitimacy ?? 0)));
    p.lawEvent = `${law.name}: ${ev.text}`;
  }
  if (p.enacting.progress < 1) return null;
  p.laws[p.enacting.category] = law.name;
  p.enacting = null;
  return law.name;
}

export const cancelLaw = (p: Politics) => { p.enacting = null; };
