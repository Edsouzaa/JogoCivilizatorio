// Eras e tecnologias. Uma tecnologia libera construções e/ou dá bônus de produção a construções.
// O país passa para a próxima era quando conhece todas as tecnologias da era atual.

export const ERAS = ["Tribal", "Clássica", "Medieval", "Colonial", "Revoluções", "Imperialismo", "Guerras", "Multipolar", "Atual"];
export const REVOLUTIONS = ERAS.indexOf("Revoluções");

/** Semanas de jogo por segundo real na velocidade média (docs/escopo.md). Das Revoluções em diante: 1 fase do dia = 0,2 s. */
export const ERA_WEEKS_PER_SECOND = ERAS.map((_, k) => (k >= REVOLUTIONS ? 1 / (7 * 4 * 0.2) : [1, 0.5, 0.35, 0.25][k]));

/** Escala dos custos: a era tribal toda leva cerca de uma hora na velocidade média. */
const COST = 25;

export type Tech = {
  name: string; era: number; cost: number; requires: string[];
  unlocks?: string[];          // nomes de construções que só podem ser feitas com esta tecnologia
  bonus?: [string, number][];  // [construção, +fração de produção]
  research?: number;           // +fração de velocidade de pesquisa
  trade?: number;              // +fração do que circula entre cidades e com parceiros
  army?: number;               // +fração de força de combate das divisões
  infamy?: number;             // infâmia ganha ao descobrir (armas que assustam os vizinhos)
  fleet?: number;              // +fração de força das frotas
  manpower?: number;           // +fração da população mobilizável
  unrest?: number;             // pontos a menos (+) ou a mais (−) no alvo de lealdade: ideias novas agitam o povo
};

const FACTORIES = ["Siderúrgica", "Fábrica têxtil", "Arsenal"];
const INDUSTRY = (v: number): [string, number][] => [...FACTORIES, "Fundição de bronze", "Tecelagem", "Ferraria", "Armeiro"].map((b) => [b, v]);

export const TECHS: Tech[] = [
  { name: "Agricultura", era: 0, cost: 60 * COST, requires: [], bonus: [["Fazenda", 0.25]] },
  { name: "Domesticação", era: 0, cost: 60 * COST, requires: [], unlocks: ["Estábulo"], bonus: [["Pasto", 0.25]] },
  { name: "Tecelagem", era: 0, cost: 80 * COST, requires: ["Agricultura"], unlocks: ["Tecelagem"] },
  { name: "Mineração", era: 0, cost: 80 * COST, requires: [], unlocks: ["Galerias escoradas"], bonus: [["Mina", 0.25]] },
  { name: "Metalurgia do bronze", era: 0, cost: 150 * COST, requires: ["Mineração"], unlocks: ["Fundição de bronze"] },
  { name: "Irrigação", era: 1, cost: 200 * COST, requires: ["Agricultura"], unlocks: ["Irrigação"] },
  { name: "Armas de bronze", era: 1, cost: 200 * COST, requires: ["Metalurgia do bronze"], unlocks: ["Armeiro"] },
  { name: "Trabalho do ferro", era: 1, cost: 250 * COST, requires: ["Metalurgia do bronze"], unlocks: ["Ferraria"], bonus: [["Mina", 0.25]] },
  { name: "Estradas", era: 1, cost: 250 * COST, requires: [], unlocks: ["Trilhas de transporte"], bonus: [["Serraria", 0.25]] },
  { name: "Escrita", era: 1, cost: 300 * COST, requires: [], research: 0.25 },
  { name: "Galés", era: 1, cost: 220 * COST, requires: ["Metalurgia do bronze"], trade: 0.05 }, // libera frotas (war.ts NAVY.tech)
  // Medieval
  { name: "Feudalismo", era: 2, cost: 400 * COST, requires: [], bonus: [["Fazenda", 0.2]], manpower: 0.05 },
  { name: "Moinhos", era: 2, cost: 400 * COST, requires: ["Irrigação"], bonus: [["Fazenda", 0.2], ["Serraria", 0.25]] },
  { name: "Arado pesado", era: 2, cost: 450 * COST, requires: ["Agricultura"], bonus: [["Fazenda", 0.3]] },
  { name: "Universidades", era: 2, cost: 500 * COST, requires: ["Escrita"], research: 0.25 },
  { name: "Castelos", era: 2, cost: 450 * COST, requires: ["Trabalho do ferro"], army: 0.15 },
  // Colonial
  { name: "Navegação", era: 3, cost: 600 * COST, requires: ["Galés"], trade: 0.25, fleet: 0.3 },
  { name: "Imprensa", era: 3, cost: 650 * COST, requires: ["Universidades"], research: 0.3, unrest: 3 },
  { name: "Pólvora", era: 3, cost: 650 * COST, requires: ["Castelos"], army: 0.3, fleet: 0.2 },
  { name: "Bancos", era: 3, cost: 700 * COST, requires: ["Navegação"], trade: 0.2 },
  { name: "Mineração profunda", era: 3, cost: 600 * COST, requires: ["Mineração"], bonus: [["Mina", 0.3]] },
  // Revoluções (Revolução Industrial)
  { name: "Máquina a vapor", era: 4, cost: 900 * COST, requires: ["Mineração profunda"], unlocks: ["Siderúrgica", "Fábrica têxtil"], fleet: 0.3 },
  { name: "Ferrovias", era: 4, cost: 1000 * COST, requires: ["Máquina a vapor"], trade: 0.3 },
  { name: "Iluminismo", era: 4, cost: 900 * COST, requires: ["Imprensa"], research: 0.3, unrest: 5 },
  { name: "Conscrição", era: 4, cost: 900 * COST, requires: ["Pólvora"], manpower: 0.1, army: 0.1, unrest: 3 },
  { name: "Agricultura científica", era: 4, cost: 950 * COST, requires: ["Arado pesado"], bonus: [["Fazenda", 0.4]] },
  // Imperialismo
  { name: "Eletricidade", era: 5, cost: 1300 * COST, requires: ["Máquina a vapor"], bonus: INDUSTRY(0.3) },
  { name: "Química industrial", era: 5, cost: 1300 * COST, requires: ["Agricultura científica"], bonus: [["Fazenda", 0.3], ["Mina", 0.2]] },
  { name: "Metralhadora", era: 5, cost: 1400 * COST, requires: ["Conscrição"], army: 0.4, unlocks: ["Arsenal"], infamy: 5 },
  { name: "Telégrafo", era: 5, cost: 1300 * COST, requires: ["Ferrovias"], trade: 0.2, research: 0.15 },
  { name: "Medicina moderna", era: 5, cost: 1400 * COST, requires: ["Iluminismo"], unrest: -5 },
  // Era das Guerras
  { name: "Motor a combustão", era: 6, cost: 1800 * COST, requires: ["Eletricidade"], trade: 0.3, bonus: [["Poço", 0.5]], fleet: 0.3 },
  { name: "Blindados", era: 6, cost: 1900 * COST, requires: ["Metralhadora", "Motor a combustão"], army: 0.4, infamy: 5 },
  { name: "Produção em massa", era: 6, cost: 1900 * COST, requires: ["Eletricidade"], bonus: INDUSTRY(0.3) },
  { name: "Rádio", era: 6, cost: 1800 * COST, requires: ["Telégrafo"], research: 0.2, unrest: -3 },
  { name: "Aviação", era: 6, cost: 1900 * COST, requires: ["Motor a combustão"], army: 0.2, infamy: 3 },
  // Multipolar
  { name: "Computadores", era: 7, cost: 2500 * COST, requires: ["Rádio"], research: 0.4 },
  { name: "Energia nuclear", era: 7, cost: 2600 * COST, requires: ["Produção em massa"], bonus: [["Siderúrgica", 0.4]], unrest: 3 },
  { name: "Revolução verde", era: 7, cost: 2500 * COST, requires: ["Química industrial"], bonus: [["Fazenda", 0.5]] },
  { name: "Contêineres", era: 7, cost: 2500 * COST, requires: ["Motor a combustão"], trade: 0.4 },
  { name: "Mísseis", era: 7, cost: 2700 * COST, requires: ["Aviação"], army: 0.5, fleet: 0.3, infamy: 8 },
  // Atual
  { name: "Internet", era: 8, cost: 3500 * COST, requires: ["Computadores"], research: 0.5, unrest: 5 },
  { name: "Automação", era: 8, cost: 3600 * COST, requires: ["Computadores", "Produção em massa"], bonus: INDUSTRY(0.5), unrest: 5 },
  { name: "Energias renováveis", era: 8, cost: 3500 * COST, requires: ["Energia nuclear"], bonus: [["Poço", 0.3], ["Mina", 0.2]] },
  { name: "Biotecnologia", era: 8, cost: 3600 * COST, requires: ["Revolução verde"], bonus: [["Fazenda", 0.4]], unrest: -5 },
  { name: "Drones", era: 8, cost: 3700 * COST, requires: ["Mísseis"], army: 0.5, infamy: 5 },
];

/** Soma de um efeito numérico de todas as tecnologias conhecidas. */
export const techSum = (r: Research, field: "trade" | "army" | "manpower" | "unrest" | "research" | "fleet") =>
  TECHS.reduce((s, t) => s + (r.known.has(t.name) ? t[field] ?? 0 : 0), 0);

/** Tecnologia exigida por cada construção (só as que alguma tecnologia libera). */
export const TECH_FOR_BUILDING = new Map(TECHS.flatMap((t) => (t.unlocks ?? []).map((b) => [b, t.name] as const)));

export type Research = { era: number; known: Set<string>; researching: string | null; progress: Map<string, number> };

export const newResearch = (): Research => ({ era: 0, known: new Set(), researching: null, progress: new Map() });

/** Tecnologias que o país pode pesquisar agora. */
export const available = (r: Research) =>
  TECHS.filter((t) => !r.known.has(t.name) && t.era <= r.era && t.requires.every((q) => r.known.has(q)));

export const researchMult = (r: Research) => 1 + techSum(r, "research");

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
