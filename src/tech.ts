// Eras e tecnologias. Uma tecnologia libera construções e/ou dá bônus de produção a construções.
// O país passa para a próxima era quando conhece todas as tecnologias da era atual.

export const ERAS = ["Tribal", "Clássica", "Medieval", "Colonial", "Revoluções", "Imperialismo", "Guerras", "Multipolar", "Atual"];
export const REVOLUTIONS = ERAS.indexOf("Revoluções");

/** Semanas de jogo por segundo real na velocidade média (docs/escopo.md). Das Revoluções em diante: 1 fase do dia = 0,2 s. */
export const ERA_WEEKS_PER_SECOND = ERAS.map((_, k) => (k >= REVOLUTIONS ? 1 / (7 * 4 * 0.2) : [1, 0.5, 0.35, 0.25][k]));

export type Tech = {
  name: string; era: number; cost: number; requires: string[];
  unlocks?: string[];          // nomes de construções que só podem ser feitas com esta tecnologia
  bonus?: [string, number][];  // [construção, +fração de produção]
  research?: number;           // +fração de velocidade de pesquisa
};

// shortcut: só Tribal e Clássica têm tecnologias; a partir da Medieval o país para na Clássica até as próximas existirem.
export const TECHS: Tech[] = [
  { name: "Agricultura", era: 0, cost: 60, requires: [], bonus: [["Fazenda", 0.25]] },
  { name: "Domesticação", era: 0, cost: 60, requires: [], unlocks: ["Estábulo"], bonus: [["Pasto", 0.25]] },
  { name: "Tecelagem", era: 0, cost: 80, requires: ["Agricultura"], unlocks: ["Tecelagem"] },
  { name: "Mineração", era: 0, cost: 80, requires: [], unlocks: ["Galerias escoradas"], bonus: [["Mina", 0.25]] },
  { name: "Metalurgia do bronze", era: 0, cost: 150, requires: ["Mineração"], unlocks: ["Fundição de bronze"] },
  { name: "Irrigação", era: 1, cost: 200, requires: ["Agricultura"], unlocks: ["Irrigação"] },
  { name: "Armas de bronze", era: 1, cost: 200, requires: ["Metalurgia do bronze"], unlocks: ["Armeiro"] },
  { name: "Trabalho do ferro", era: 1, cost: 250, requires: ["Metalurgia do bronze"], unlocks: ["Ferraria"], bonus: [["Mina", 0.25]] },
  { name: "Estradas", era: 1, cost: 250, requires: [], unlocks: ["Trilhas de transporte"], bonus: [["Serraria", 0.25]] },
  { name: "Escrita", era: 1, cost: 300, requires: [], research: 0.25 },
];

/** Tecnologia exigida por cada construção (só as que alguma tecnologia libera). */
export const TECH_FOR_BUILDING = new Map(TECHS.flatMap((t) => (t.unlocks ?? []).map((b) => [b, t.name] as const)));

export type Research = { era: number; known: Set<string>; researching: string | null; progress: Map<string, number> };

export const newResearch = (): Research => ({ era: 0, known: new Set(), researching: null, progress: new Map() });

/** Tecnologias que o país pode pesquisar agora. */
export const available = (r: Research) =>
  TECHS.filter((t) => !r.known.has(t.name) && t.era <= r.era && t.requires.every((q) => r.known.has(q)));

export const researchMult = (r: Research) => 1 + TECHS.reduce((s, t) => s + (r.known.has(t.name) ? t.research ?? 0 : 0), 0);

/** Aplica `points` de pesquisa. Escolhe sozinho a mais barata se nada estiver selecionado. Retorna a tecnologia concluída. */
export function research(r: Research, points: number): Tech | null {
  if (!r.researching || r.known.has(r.researching)) {
    const opts = available(r).sort((a, b) => a.cost - b.cost);
    r.researching = opts[0]?.name ?? null;
  }
  if (!r.researching) return null;
  const tech = TECHS.find((t) => t.name === r.researching)!;
  const done = (r.progress.get(tech.name) ?? 0) + points * researchMult(r);
  if (done < tech.cost) { r.progress.set(tech.name, done); return null; }
  r.known.add(tech.name); r.progress.delete(tech.name); r.researching = null;
  // nova era quando todas as tecnologias da era atual são conhecidas (e a próxima tem alguma)
  while (TECHS.some((t) => t.era === r.era + 1) && TECHS.every((t) => t.era !== r.era || r.known.has(t.name))) r.era++;
  return tech;
}
