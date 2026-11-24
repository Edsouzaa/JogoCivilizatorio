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
  tax?: number;         // Impostos: taxa sobre o PIB
  tradeShare?: number;  // Economia: fração da sobra que circula entre as cidades do país
  singleParty?: boolean; // Governo: só o partido tem Poder Político
};
export const LAWS: Record<string, Law[]> = {
  "Governo": [
    { name: "Chefia tribal", era: 0, likes: ["Anciãos e Clãs"], dislikes: [] },
    { name: "Monarquia", era: era("Clássica"), likes: ["Latifundiários", "Forças Armadas", "Devotos"], dislikes: ["Intelectuais"] },
    { name: "Teocracia", era: era("Clássica"), likes: ["Devotos"], dislikes: ["Intelectuais", "Mercadores"] },
    { name: "República", era: era("Clássica"), likes: ["Mercadores", "Intelectuais", "Povo do Campo"], dislikes: ["Latifundiários", "Anciãos e Clãs"] },
    { name: "Partido único", era: era("Guerras"), likes: ["Forças Armadas"], dislikes: ["Intelectuais", "Mercadores"], singleParty: true },
  ],
  "Impostos": [
    { name: "Tributo em espécie", era: 0, likes: ["Anciãos e Clãs", "Povo do Campo"], dislikes: [], tax: 0.1 },
    { name: "Dízimo", era: era("Clássica"), likes: ["Devotos"], dislikes: ["Mercadores"], tax: 0.12 },
    { name: "Imposto por cabeça", era: era("Clássica"), likes: ["Latifundiários"], dislikes: ["Povo do Campo", "Mercadores"], tax: 0.18 },
    { name: "Imposto proporcional", era: era("Colonial"), likes: ["Intelectuais", "Pequena Burguesia"], dislikes: ["Latifundiários"], tax: 0.2 },
  ],
  "Economia": [
    { name: "Subsistência", era: 0, likes: ["Anciãos e Clãs"], dislikes: [], tradeShare: 0.4 },
    { name: "Tradicionalismo", era: era("Clássica"), likes: ["Latifundiários", "Devotos"], dislikes: ["Mercadores"], tradeShare: 0.5 },
    { name: "Mercantilismo", era: era("Colonial"), likes: ["Mercadores"], dislikes: ["Povo do Campo"], tradeShare: 0.7 },
    { name: "Livre comércio", era: era("Revoluções"), likes: ["Industriais", "Mercadores"], dislikes: ["Latifundiários"], tradeShare: 0.9 },
  ],
};
for (const laws of Object.values(LAWS)) for (const l of laws) for (const g of [...l.likes, ...l.dislikes]) if (G[g] === undefined) throw new Error(`lei ${l.name}: grupo ${g}`);

export const POLITICS_RULES = {
  enactWeeks: 26,          // semanas para aprovar uma lei com legitimidade 0,5 e apoio
  unstableLegitimacy: 0.2, // perda de legitimidade quando um grupo de fora tem mais apoio popular que o governo
};

export type Politics = {
  laws: Record<string, string>; // categoria → lei em vigor
  enacting: { category: string; law: string; progress: number } | null;
  political: Float64Array; popular: Float64Array; // fração 0..1 por grupo
  government: number[];  // índices dos grupos no governo
  legitimacy: number;    // 0..1
  rival: number;         // grupo de fora com mais apoio popular que o governo, ou -1
  support: number;       // apoio (−1..1) à lei em votação
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
  for (let g = 0; g < NGROUPS; g++) if (g !== UNALIGNED && !p.government.includes(g) && p.popular[g] > govPopular && (p.rival < 0 || p.popular[g] > p.popular[p.rival])) p.rival = g;
  if (p.rival >= 0) p.legitimacy = Math.max(0, p.legitimacy - POLITICS_RULES.unstableLegitimacy);
}

/** Apoio (−1..1) do Poder Político à lei: soma de quem gosta menos quem não gosta. */
export function lawSupport(p: Politics, law: Law) {
  let s = 0;
  for (const g of law.likes) s += p.political[G[g]];
  for (const g of law.dislikes) s -= p.political[G[g]];
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
export function advanceLaw(p: Politics): string | null {
  if (!p.enacting) return null;
  const law = LAWS[p.enacting.category].find((l) => l.name === p.enacting!.law)!;
  p.support = lawSupport(p, law);
  if (p.support <= 0) return null; // travada até o apoio mudar
  p.enacting.progress += (2 * p.legitimacy) / POLITICS_RULES.enactWeeks;
  if (p.enacting.progress < 1) return null;
  p.laws[p.enacting.category] = law.name;
  p.enacting = null;
  return law.name;
}

export const cancelLaw = (p: Politics) => { p.enacting = null; };
