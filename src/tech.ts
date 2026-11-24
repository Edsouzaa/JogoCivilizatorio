// Eras e tecnologias. Uma tecnologia libera construções e/ou dá bônus de produção a construções.
// O país passa para a próxima era quando conhece todas as tecnologias da era atual.

export const ERAS = ["Tribal", "Clássica", "Medieval", "Renascença", "Descobertas", "Revoluções", "Industrialização", "Grandes Guerras", "Multipolar", "Moderna"];
export const REVOLUTIONS = ERAS.indexOf("Revoluções");
/** Da Industrialização em diante o dia tem 3 fases (noite, manhã, tarde). */
export const DAY_PHASES_ERA = ERAS.indexOf("Industrialização");
/** Ano em que cada era começa (a última vai até ERA_YEARS[ERAS.length]). Negativo = a.C. */
export const ERA_YEARS = [-600, -400, 400, 1300, 1500, 1750, 1830, 1910, 1950, 2000, 2050];
export const START_YEAR = ERA_YEARS[0];

/** Velocidade máxima do jogo (main.ts SPEEDS) — o ritmo da era é dado nela. */
export const MAX_SPEED = 30;
/** Segundos reais por semana na velocidade máxima: 0,1 s (Tribal), 0,2 s, e depois 7 dias × 3 fases de 0,2 s / 0,3 s. */
const SECONDS_PER_WEEK = [0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 21 * 0.2, 21 * 0.3, 21 * 0.3, 21 * 0.3];
/** Semanas de jogo por segundo real na velocidade 1×. */
export const ERA_WEEKS_PER_SECOND = SECONDS_PER_WEEK.map((s) => 1 / (s * MAX_SPEED));
/** Pontos de pesquisa por semana esperados no meio de cada era (docs/escopo.md, "Custos de pesquisa"). */
export const ERA_RESEARCH = [3.5, 11, 27, 65, 150, 315, 725, 1600, 3400, 6750];

export type Tech = {
  name: string; era: number; cost: number; requires: string[];
  unlocks?: string[];          // nomes de construções que só podem ser feitas com esta tecnologia
  bonus?: [string, number][];  // [construção, +fração de produção]
  research?: number;           // +fração de velocidade de pesquisa
  trade?: number;              // +fração do que circula entre cidades e com parceiros
  army?: number;               // +fração de força de combate das divisões
  infamy?: number;             // infâmia ganha ao descobrir (armas que assustam os vizinhos)
  fleet?: number;              // +fração de força das frotas
  air?: number;                // +fração de força dos esquadrões aéreos
  manpower?: number;           // +fração da população mobilizável
  unrest?: number;             // pontos a menos (+) ou a mais (−) no alvo de lealdade: ideias novas agitam o povo
};

const FACTORIES = ["Siderúrgica", "Fábrica têxtil", "Arsenal"];
const INDUSTRY = (v: number): [string, number][] => [...FACTORIES, "Fundição de bronze", "Tecelagem", "Ferraria", "Armeiro"].map((b) => [b, v]);

export const TECHS: Tech[] = [
  { name: "Agricultura", era: 0, cost: 0, requires: [], bonus: [["Fazenda", 0.25]] },
  { name: "Domesticação", era: 0, cost: 0, requires: [], unlocks: ["Estábulo"], bonus: [["Pasto", 0.25]] },
  { name: "Tecelagem", era: 0, cost: 0, requires: ["Agricultura"], unlocks: ["Tecelagem"] },
  { name: "Mineração", era: 0, cost: 0, requires: [], unlocks: ["Galerias escoradas"], bonus: [["Mina", 0.25]] },
  { name: "Metalurgia do bronze", era: 0, cost: 0, requires: ["Mineração"], unlocks: ["Fundição de bronze"] },
  { name: "Irrigação", era: 1, cost: 0, requires: ["Agricultura"], unlocks: ["Irrigação"] },
  { name: "Armas de bronze", era: 1, cost: 0, requires: ["Metalurgia do bronze"], unlocks: ["Armeiro"] },
  { name: "Trabalho do ferro", era: 1, cost: 0, requires: ["Metalurgia do bronze"], unlocks: ["Ferraria"], bonus: [["Mina", 0.25]] },
  { name: "Estradas", era: 1, cost: 0, requires: [], unlocks: ["Trilhas de transporte"], bonus: [["Serraria", 0.25]] },
  { name: "Escrita", era: 1, cost: 0, requires: [], research: 0.25 },
  { name: "Galés", era: 1, cost: 0, requires: ["Metalurgia do bronze"], trade: 0.05 }, // libera frotas (war.ts NAVY.tech)
  // Medieval
  { name: "Feudalismo", era: 2, cost: 0, requires: [], bonus: [["Fazenda", 0.2]], manpower: 0.05 },
  { name: "Moinhos", era: 2, cost: 0, requires: ["Irrigação"], bonus: [["Fazenda", 0.2], ["Serraria", 0.25]] },
  { name: "Arado pesado", era: 2, cost: 0, requires: ["Agricultura"], bonus: [["Fazenda", 0.3]] },
  { name: "Universidades", era: 2, cost: 0, requires: ["Escrita"], research: 0.25 },
  { name: "Castelos", era: 2, cost: 0, requires: ["Trabalho do ferro"], army: 0.15 },
  // Renascença (Navegação, Imprensa, Mineração profunda) e Descobertas (Pólvora, Bancos, Companhias comerciais)
  { name: "Navegação", era: 3, cost: 0, requires: ["Galés"], trade: 0.25, fleet: 0.3 },
  { name: "Imprensa", era: 3, cost: 0, requires: ["Universidades"], research: 0.3, unrest: 3 },
  { name: "Pólvora", era: 4, cost: 0, requires: ["Castelos"], army: 0.3, fleet: 0.2 },
  { name: "Bancos", era: 4, cost: 0, requires: ["Navegação"], trade: 0.2 },
  { name: "Mineração profunda", era: 3, cost: 0, requires: ["Mineração"], bonus: [["Mina", 0.3]] },
  { name: "Companhias comerciais", era: 4, cost: 0, requires: ["Navegação"], trade: 0.2 },
  // Revoluções
  { name: "Máquina a vapor", era: 5, cost: 0, requires: ["Mineração profunda"], unlocks: ["Siderúrgica", "Fábrica têxtil"], fleet: 0.3 },
  { name: "Ferrovias", era: 5, cost: 0, requires: ["Máquina a vapor"], trade: 0.3 },
  { name: "Iluminismo", era: 5, cost: 0, requires: ["Imprensa"], research: 0.3, unrest: 5 },
  { name: "Conscrição", era: 5, cost: 0, requires: ["Pólvora"], manpower: 0.1, army: 0.1, unrest: 3 },
  { name: "Agricultura científica", era: 5, cost: 0, requires: ["Arado pesado"], bonus: [["Fazenda", 0.4]] },
  // Industrialização
  { name: "Eletricidade", era: 6, cost: 0, requires: ["Máquina a vapor"], bonus: INDUSTRY(0.3) },
  { name: "Química industrial", era: 6, cost: 0, requires: ["Agricultura científica"], bonus: [["Fazenda", 0.3], ["Mina", 0.2]] },
  { name: "Metralhadora", era: 6, cost: 0, requires: ["Conscrição"], army: 0.4, unlocks: ["Arsenal"], infamy: 5 },
  { name: "Telégrafo", era: 6, cost: 0, requires: ["Ferrovias"], trade: 0.2, research: 0.15 },
  { name: "Medicina moderna", era: 6, cost: 0, requires: ["Iluminismo"], unrest: -5 },
  // Grandes Guerras
  { name: "Motor a combustão", era: 7, cost: 0, requires: ["Eletricidade"], trade: 0.3, bonus: [["Poço", 0.5]], fleet: 0.3 },
  { name: "Blindados", era: 7, cost: 0, requires: ["Metralhadora", "Motor a combustão"], army: 0.4, infamy: 5 },
  { name: "Produção em massa", era: 7, cost: 0, requires: ["Eletricidade"], bonus: INDUSTRY(0.3) },
  { name: "Rádio", era: 7, cost: 0, requires: ["Telégrafo"], research: 0.2, unrest: -3 },
  { name: "Aviação", era: 7, cost: 0, requires: ["Motor a combustão"], army: 0.2, infamy: 3 },
  // Multipolar
  { name: "Computadores", era: 8, cost: 0, requires: ["Rádio"], research: 0.4, air: 0.2 },
  { name: "Energia nuclear", era: 8, cost: 0, requires: ["Produção em massa"], bonus: [["Siderúrgica", 0.4]], unrest: 3 },
  { name: "Revolução verde", era: 8, cost: 0, requires: ["Química industrial"], bonus: [["Fazenda", 0.5]] },
  { name: "Contêineres", era: 8, cost: 0, requires: ["Motor a combustão"], trade: 0.4 },
  { name: "Mísseis", era: 8, cost: 0, requires: ["Aviação"], army: 0.5, fleet: 0.3, air: 0.3, infamy: 8 },
  // Moderna
  { name: "Internet", era: 9, cost: 0, requires: ["Computadores"], research: 0.5, unrest: 5 },
  { name: "Automação", era: 9, cost: 0, requires: ["Computadores", "Produção em massa"], bonus: INDUSTRY(0.5), unrest: 5 },
  { name: "Energias renováveis", era: 9, cost: 0, requires: ["Energia nuclear"], bonus: [["Poço", 0.3], ["Mina", 0.2]] },
  { name: "Biotecnologia", era: 9, cost: 0, requires: ["Revolução verde"], bonus: [["Fazenda", 0.4]], unrest: -5 },
  { name: "Drones", era: 9, cost: 0, requires: ["Mísseis"], army: 0.5, air: 0.5, infamy: 5 },
];

// Custo: a era inteira dura o seu intervalo de datas ganhando ERA_RESEARCH por semana.
// Dentro da era, as primeiras custam metade da média e as últimas 1,7× (como na tabela de custos).
for (let era = 0; era < ERAS.length; era++) {
  const ts = TECHS.filter((t) => t.era === era), weeks = (ERA_YEARS[era + 1] - ERA_YEARS[era]) * 52;
  const weight = (k: number) => 0.5 + (1.2 * k) / Math.max(1, ts.length - 1);
  const unit = (ERA_RESEARCH[era] * weeks) / ts.reduce((a, _, k) => a + weight(k), 0);
  ts.forEach((t, k) => (t.cost = Math.round(weight(k) * unit)));
}

/** Soma de um efeito numérico de todas as tecnologias conhecidas. */
export const techSum = (r: Research, field: "trade" | "army" | "manpower" | "unrest" | "research" | "fleet" | "air") =>
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
