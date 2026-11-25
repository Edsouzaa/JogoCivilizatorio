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
  growth?: number;             // +fração do crescimento natural da população (economy.ts growPopulation)
  popCap?: number;             // +fração do teto de população de todo hex
  urbanCap?: number;           // +fração do teto de população dos centros urbanos
  plague?: number;             // −fração das mortes por peste (events.ts)
  subsistence?: number;        // +fração da comida de subsistência
  control?: number;            // + controle máximo (control.ts)
};

const FACTORIES = ["Siderúrgica", "Fábrica têxtil", "Arsenal"];
const INDUSTRY = (v: number): [string, number][] => [...FACTORIES, "Fundição de bronze", "Tecelagem", "Ferraria", "Armeiro"].map((b) => [b, v]);

export const TECHS: Tech[] = [
  // Tribal (docs/tecnologias.md): a ordem dentro da era é a ordem de custo
  { name: "Coleta organizada", era: 0, cost: 0, requires: [], subsistence: 0.1 },
  { name: "Fogo controlado", era: 0, cost: 0, requires: [], popCap: 0.05 },
  { name: "Ferramentas de pedra polida", era: 0, cost: 0, requires: [], unlocks: ["Oficina de ferramentas"], bonus: [["Serraria", 0.1]] },
  { name: "Caça em grupo", era: 0, cost: 0, requires: [], bonus: [["Acampamento de caça", 0.15]] },
  { name: "Domesticação", era: 0, cost: 0, requires: [], unlocks: ["Estábulo"], bonus: [["Pasto", 0.25]] },
  { name: "Agricultura", era: 0, cost: 0, requires: ["Coleta organizada"], bonus: [["Fazenda", 0.25]], growth: 0.25 },
  { name: "Cerâmica", era: 0, cost: 0, requires: ["Fogo controlado"], unlocks: ["Olaria"], subsistence: 0.05 },
  { name: "Mineração", era: 0, cost: 0, requires: ["Ferramentas de pedra polida"], unlocks: ["Galerias escoradas"], bonus: [["Mina", 0.25]] },
  { name: "Tecelagem", era: 0, cost: 0, requires: ["Agricultura"], unlocks: ["Tecelagem"] },
  { name: "Tradição oral", era: 0, cost: 0, requires: ["Fogo controlado"], research: 0.1 },
  { name: "Conselho de anciãos", era: 0, cost: 0, requires: ["Tradição oral"], control: 0.05, unrest: -2 },
  { name: "Canoas", era: 0, cost: 0, requires: ["Ferramentas de pedra polida"], trade: 0.1 },
  { name: "Metalurgia do bronze", era: 0, cost: 0, requires: ["Mineração"], unlocks: ["Fundição de bronze"] },
  { name: "Calendário lunar", era: 0, cost: 0, requires: ["Tradição oral", "Agricultura"], bonus: [["Fazenda", 0.1]], growth: 0.1 },
  // Clássica
  { name: "Estradas", era: 1, cost: 0, requires: [], unlocks: ["Trilhas de transporte"], bonus: [["Serraria", 0.25]] },
  { name: "Escrita", era: 1, cost: 0, requires: [], research: 0.25, unlocks: ["Oficina de papel", "Centro administrativo"] },
  { name: "Irrigação", era: 1, cost: 0, requires: ["Agricultura"], unlocks: ["Irrigação"], popCap: 0.1 },
  { name: "Moeda", era: 1, cost: 0, requires: ["Metalurgia do bronze"], trade: 0.1 },
  { name: "Galés", era: 1, cost: 0, requires: ["Metalurgia do bronze"], trade: 0.05 }, // libera frotas (war.ts NAVY.tech)
  { name: "Armas de bronze", era: 1, cost: 0, requires: ["Metalurgia do bronze"], unlocks: ["Armeiro"] },
  { name: "Trabalho do ferro", era: 1, cost: 0, requires: ["Metalurgia do bronze"], unlocks: ["Ferraria"], bonus: [["Mina", 0.25]] },
  { name: "Matemática", era: 1, cost: 0, requires: ["Escrita"], research: 0.1, bonus: [["Setor de construção", 0.05]] },
  { name: "Arquitetura", era: 1, cost: 0, requires: ["Matemática"], bonus: [["Setor de construção", 0.15]], popCap: 0.05 },
  { name: "Direito escrito", era: 1, cost: 0, requires: ["Escrita"], control: 0.1 },
  { name: "Aquedutos", era: 1, cost: 0, requires: ["Arquitetura", "Irrigação"], urbanCap: 0.25 },
  { name: "Filosofia", era: 1, cost: 0, requires: ["Matemática"], research: 0.15, unrest: 3 },
  { name: "Cavalaria", era: 1, cost: 0, requires: ["Domesticação", "Armas de bronze"], army: 0.05 },
  { name: "Rotas de caravana", era: 1, cost: 0, requires: ["Moeda", "Estradas"], trade: 0.15 },
  { name: "Medicina antiga", era: 1, cost: 0, requires: ["Escrita"], plague: 0.2, growth: 0.1 },
  // Medieval
  { name: "Feudalismo", era: 2, cost: 0, requires: [], bonus: [["Fazenda", 0.2]], manpower: 0.05 },
  { name: "Arado pesado", era: 2, cost: 0, requires: ["Agricultura"], bonus: [["Fazenda", 0.3]] },
  { name: "Rotação trienal", era: 2, cost: 0, requires: ["Arado pesado"], bonus: [["Fazenda", 0.15]], growth: 0.1 },
  { name: "Moinhos", era: 2, cost: 0, requires: ["Irrigação"], bonus: [["Fazenda", 0.2], ["Serraria", 0.25]] },
  { name: "Castelos", era: 2, cost: 0, requires: ["Trabalho do ferro"], army: 0.15 },
  { name: "Guildas", era: 2, cost: 0, requires: ["Moeda"], bonus: [["Tecelagem", 0.1], ["Ferraria", 0.1], ["Olaria", 0.1], ["Curtume", 0.1]] },
  { name: "Universidades", era: 2, cost: 0, requires: ["Escrita"], research: 0.25 },
  { name: "Bestas", era: 2, cost: 0, requires: ["Castelos"], army: 0.1 },
  { name: "Arreio de coleira", era: 2, cost: 0, requires: ["Domesticação", "Arado pesado"], bonus: [["Fazenda", 0.1]] },
  { name: "Catedrais", era: 2, cost: 0, requires: ["Arquitetura"], unrest: -4 },
  { name: "Letras de câmbio", era: 2, cost: 0, requires: ["Guildas"], trade: 0.15 },
  { name: "Bússola", era: 2, cost: 0, requires: ["Galés"], fleet: 0.2, trade: 0.1 },
  // Renascença
  { name: "Navegação", era: 3, cost: 0, requires: ["Galés", "Bússola"], trade: 0.25, fleet: 0.3 },
  { name: "Imprensa", era: 3, cost: 0, requires: ["Universidades"], research: 0.3, unrest: 3 },
  { name: "Mineração profunda", era: 3, cost: 0, requires: ["Mineração"], bonus: [["Mina", 0.3]] },
  { name: "Perspectiva", era: 3, cost: 0, requires: ["Imprensa"], research: 0.1, bonus: [["Oficina de vidro", 0.2]] },
  { name: "Contabilidade de partidas dobradas", era: 3, cost: 0, requires: ["Letras de câmbio"], trade: 0.1 },
  { name: "Humanismo", era: 3, cost: 0, requires: ["Imprensa"], unrest: -3, research: 0.05 },
  { name: "Alto-forno", era: 3, cost: 0, requires: ["Trabalho do ferro", "Moinhos"], bonus: [["Ferraria", 0.3]] },
  { name: "Fortificações em estrela", era: 3, cost: 0, requires: ["Castelos"], army: 0.15 },
  { name: "Cartografia", era: 3, cost: 0, requires: ["Navegação"], trade: 0.1, fleet: 0.1 },
  { name: "Diplomacia permanente", era: 3, cost: 0, requires: ["Direito escrito"], control: 0.05, unrest: -2 },
  // Descobertas
  { name: "Pólvora", era: 4, cost: 0, requires: ["Castelos"], army: 0.3, fleet: 0.2 },
  { name: "Bancos", era: 4, cost: 0, requires: ["Navegação"], trade: 0.2 },
  { name: "Companhias comerciais", era: 4, cost: 0, requires: ["Navegação"], trade: 0.2 },
  { name: "Mosquete", era: 4, cost: 0, requires: ["Pólvora"], army: 0.1 },
  { name: "Plantation", era: 4, cost: 0, requires: ["Navegação"], bonus: [["Fazenda", 0.15]] },
  { name: "Galeões", era: 4, cost: 0, requires: ["Navegação"], fleet: 0.2, trade: 0.1 },
  { name: "Método científico", era: 4, cost: 0, requires: ["Perspectiva"], research: 0.25 },
  { name: "Mercantilismo", era: 4, cost: 0, requires: ["Companhias comerciais"], trade: 0.1 },
  { name: "Correios", era: 4, cost: 0, requires: ["Estradas", "Imprensa"], control: 0.1, research: 0.05 },
  { name: "Vacinação variólica", era: 4, cost: 0, requires: ["Medicina antiga", "Método científico"], plague: 0.3, growth: 0.15 },
  // Revoluções
  { name: "Máquina a vapor", era: 5, cost: 0, requires: ["Mineração profunda"], unlocks: ["Siderúrgica", "Fábrica têxtil"], fleet: 0.3 },
  { name: "Ferrovias", era: 5, cost: 0, requires: ["Máquina a vapor"], trade: 0.3 },
  { name: "Iluminismo", era: 5, cost: 0, requires: ["Imprensa"], research: 0.3, unrest: 5 },
  { name: "Conscrição", era: 5, cost: 0, requires: ["Pólvora"], manpower: 0.1, army: 0.1, unrest: 3 },
  { name: "Agricultura científica", era: 5, cost: 0, requires: ["Arado pesado"], bonus: [["Fazenda", 0.4]] },
  { name: "Tear mecânico", era: 5, cost: 0, requires: ["Máquina a vapor"], bonus: [["Fábrica têxtil", 0.3]] },
  { name: "Economia política", era: 5, cost: 0, requires: ["Iluminismo"], trade: 0.1 },
  { name: "Navio a vapor", era: 5, cost: 0, requires: ["Máquina a vapor", "Galeões"], fleet: 0.3, trade: 0.1 },
  { name: "Artilharia de campanha", era: 5, cost: 0, requires: ["Conscrição"], army: 0.15 },
  { name: "Saneamento", era: 5, cost: 0, requires: ["Vacinação variólica"], urbanCap: 0.25, plague: 0.3 },
  { name: "Bolsa de valores", era: 5, cost: 0, requires: ["Bancos"], trade: 0.1 },
  // Industrialização
  { name: "Eletricidade", era: 6, cost: 0, requires: ["Máquina a vapor"], bonus: INDUSTRY(0.3) },
  { name: "Química industrial", era: 6, cost: 0, requires: ["Agricultura científica"], bonus: [["Fazenda", 0.3], ["Mina", 0.2]] },
  { name: "Metralhadora", era: 6, cost: 0, requires: ["Conscrição"], army: 0.4, unlocks: ["Arsenal"], infamy: 5 },
  { name: "Telégrafo", era: 6, cost: 0, requires: ["Ferrovias"], trade: 0.2, research: 0.15 },
  { name: "Medicina moderna", era: 6, cost: 0, requires: ["Iluminismo"], unrest: -5, plague: 0.3, growth: 0.2 },
  { name: "Aço Bessemer", era: 6, cost: 0, requires: ["Eletricidade"], bonus: [["Aciaria", 0.4]] },
  { name: "Fertilizantes químicos", era: 6, cost: 0, requires: ["Química industrial"], bonus: [["Fazenda", 0.3]] },
  { name: "Couraçados", era: 6, cost: 0, requires: ["Eletricidade", "Navio a vapor"], fleet: 0.2 },
  { name: "Sindicatos", era: 6, cost: 0, requires: ["Economia política"], unrest: -3 },
  { name: "Educação pública", era: 6, cost: 0, requires: ["Iluminismo"], research: 0.2 },
  { name: "Refrigeração", era: 6, cost: 0, requires: ["Eletricidade"], bonus: [["Moinho", 0.2]], subsistence: 0.1 },
  // Grandes Guerras
  { name: "Motor a combustão", era: 7, cost: 0, requires: ["Eletricidade"], trade: 0.3, bonus: [["Poço", 0.5]], fleet: 0.3 },
  { name: "Blindados", era: 7, cost: 0, requires: ["Metralhadora", "Motor a combustão"], army: 0.4, infamy: 5 },
  { name: "Produção em massa", era: 7, cost: 0, requires: ["Eletricidade"], bonus: INDUSTRY(0.3) },
  { name: "Rádio", era: 7, cost: 0, requires: ["Telégrafo"], research: 0.2, unrest: -3 },
  { name: "Aviação", era: 7, cost: 0, requires: ["Motor a combustão"], army: 0.2, infamy: 3 },
  { name: "Concreto armado", era: 7, cost: 0, requires: ["Aço Bessemer"], urbanCap: 0.3, bonus: [["Setor de construção", 0.2]] },
  { name: "Antibióticos", era: 7, cost: 0, requires: ["Medicina moderna"], plague: 0.4, growth: 0.2 },
  { name: "Submarinos", era: 7, cost: 0, requires: ["Motor a combustão"], fleet: 0.2 },
  { name: "Economia planejada", era: 7, cost: 0, requires: ["Sindicatos"], control: 0.1 },
  { name: "Propaganda", era: 7, cost: 0, requires: ["Rádio"], unrest: -4 },
  // Multipolar
  { name: "Computadores", era: 8, cost: 0, requires: ["Rádio"], research: 0.4, air: 0.2 },
  { name: "Energia nuclear", era: 8, cost: 0, requires: ["Produção em massa"], bonus: [["Siderúrgica", 0.4]], unrest: 3 },
  { name: "Revolução verde", era: 8, cost: 0, requires: ["Química industrial"], bonus: [["Fazenda", 0.5]] },
  { name: "Contêineres", era: 8, cost: 0, requires: ["Motor a combustão"], trade: 0.4 },
  { name: "Mísseis", era: 8, cost: 0, requires: ["Aviação"], army: 0.5, fleet: 0.3, air: 0.3, infamy: 8 },
  { name: "Caças a jato", era: 8, cost: 0, requires: ["Aviação"], air: 0.3 },
  { name: "Construção modular", era: 8, cost: 0, requires: ["Concreto armado"], bonus: [["Setor de construção", 0.2]] },
  { name: "Previdência social", era: 8, cost: 0, requires: ["Economia planejada"], unrest: -5 },
  { name: "Porta-aviões", era: 8, cost: 0, requires: ["Aviação", "Couraçados"], fleet: 0.3 },
  { name: "Economia mista", era: 8, cost: 0, requires: ["Previdência social"], trade: 0.1 },
  // Moderna
  { name: "Internet", era: 9, cost: 0, requires: ["Computadores"], research: 0.5, unrest: 5 },
  { name: "Automação", era: 9, cost: 0, requires: ["Computadores", "Produção em massa"], bonus: INDUSTRY(0.5), unrest: 5 },
  { name: "Energias renováveis", era: 9, cost: 0, requires: ["Energia nuclear"], bonus: [["Poço", 0.3], ["Mina", 0.2]] },
  { name: "Biotecnologia", era: 9, cost: 0, requires: ["Revolução verde"], bonus: [["Fazenda", 0.4]], unrest: -5 },
  { name: "Drones", era: 9, cost: 0, requires: ["Mísseis"], army: 0.5, air: 0.5, infamy: 5 },
  { name: "Baterias de lítio", era: 9, cost: 0, requires: ["Computadores"], bonus: [["Fábrica de baterias", 0.4]] },
  { name: "Construção automatizada", era: 9, cost: 0, requires: ["Automação", "Construção modular"], bonus: [["Setor de construção", 0.3]] },
  { name: "Medicina genômica", era: 9, cost: 0, requires: ["Biotecnologia"], plague: 0.4, growth: 0.2 },
  { name: "Comércio eletrônico", era: 9, cost: 0, requires: ["Internet"], trade: 0.3 },
  { name: "Governo digital", era: 9, cost: 0, requires: ["Internet"], control: 0.2 },
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
export const techSum = (r: Research, field: "trade" | "army" | "manpower" | "unrest" | "research" | "fleet" | "air" | "growth" | "popCap" | "urbanCap" | "plague" | "subsistence" | "control") =>
  TECHS.reduce((s, t) => s + (r.known.has(t.name) ? t[field] ?? 0 : 0), 0);

// Construções da Etapa 5 (docs/construcoes.md): que tecnologia libera cada uma (Olaria e Oficina de ferramentas são tribais e livres)
for (const [tech, building] of [
  ["Domesticação", "Curtume"], ["Agricultura", "Oficina de bebidas"], ["Trabalho do ferro", "Oficina de vidro"], ["Metalurgia do bronze", "Oficina de joias"],
  ["Escrita", "Oficina de pergaminho"], ["Moinhos", "Moinho"], ["Moinhos", "Manufatura de tecidos"], ["Pólvora", "Fábrica de pólvora"], ["Imprensa", "Tipografia"],
  ["Imprensa", "Oficina de máquinas simples"], ["Máquina a vapor", "Aciaria"], ["Máquina a vapor", "Fábrica de máquinas"], ["Química industrial", "Fábrica de cimento"],
  ["Eletricidade", "Usina termelétrica"], ["Energia nuclear", "Usina nuclear"], ["Química industrial", "Fábrica química"], ["Química industrial", "Fábrica de fertilizantes"],
  ["Medicina moderna", "Fábrica de medicamentos"], ["Química industrial", "Refinaria"], ["Eletricidade", "Fundição de alumínio"], ["Produção em massa", "Fábrica de plásticos"],
  ["Rádio", "Fábrica de eletrônicos"], ["Computadores", "Fábrica de baterias"], ["Energias renováveis", "Fábrica de equipamentos de energia"], ["Computadores", "Fábrica de telecomunicações"],
  ["Galés", "Doca"], ["Navegação", "Estaleiro"], ["Eletricidade", "Arsenal naval"],
] as const) (TECHS.find((t) => t.name === tech)!.unlocks ??= []).push(building);

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
