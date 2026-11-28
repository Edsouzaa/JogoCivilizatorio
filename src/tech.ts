// Eras e tecnologias. Uma tecnologia libera construções e/ou dá bônus de produção a construções.
// O país passa para a próxima era quando conhece todas as tecnologias da era atual.

import { setTechs, areaOfSub, type TechVar, type Area } from "./techvars.ts";

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
  sub?: string;                // subcategoria (techvars.ts SUBS); sem = derivada pelos efeitos (subOf)
  desc?: string;               // descrição histórica curta
  fx?: Partial<Record<TechVar, number>>; // variáveis novas (techvars.ts TECH_VARS), somadas por tv()
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

// ---- Expansão (docs/tecnologias.md): três áreas, pré-requisitos cruzados e efeitos em variáveis (techvars.ts)
const N = (name: string, era: number, sub: string, requires: string[], fx: Partial<Record<TechVar, number>>, desc: string, extra: Partial<Tech> = {}): Tech => ({ name, era, cost: 0, requires, sub, fx, desc, ...extra });
TECHS.push(
  // Tribal
  N("Conservação de alimentos", 0, "Agricultura", ["Cerâmica"], { foodPreservation: 0.03 }, "Secar, salgar e defumar: menos comida estraga."),
  N("Agricultura itinerante", 0, "Agricultura", ["Agricultura"], { agriculture: 0.05 }, "Queimar e plantar em clareiras novas.", { subsistence: 0.05 }),
  N("Técnicas de construção em madeira", 0, "Infraestrutura", ["Ferramentas de pedra polida"], { constructionEfficiency: 0.05, storageCapacity: 0.1 }, "Paliçadas, celeiros e casas de troncos."),
  N("Organização tribal de guerreiros", 0, "Exército", ["Caça em grupo"], { armyOrganization: 0.05, armyMobilization: 0.1 }, "Guerreiros por clã, com chefes de bando."),
  N("Táticas de emboscada", 0, "Doutrina", ["Caça em grupo"], { armyReconnaissance: 0.15, armyInitiative: 0.2 }, "Atacar de surpresa, como na caça."),
  N("Tradições de parentesco", 0, "Sociedade", [], { socialCohesion: 0.05, legitimacy: 0.0005 }, "Linhagens e deveres entre famílias."),
  N("Conselho de líderes", 0, "Governo", ["Conselho de anciãos"], { governanceEfficiency: 0.1, legitimacy: 0.0005 }, "Os chefes de clã decidem juntos."),
  N("Contagem de recursos", 0, "Administração", ["Tradição oral"], { recordKeeping: 0.05, administrativeEfficiency: 0.03 }, "Entalhes e nós para contar rebanhos e grãos."),
  // Clássica
  N("Padronização de medidas", 1, "Comércio", ["Matemática"], { laborProductivity: 0.03, marketIntegration: 0.03 }, "Pesos e medidas iguais em todo o reino."),
  N("Engenharia hidráulica", 1, "Infraestrutura", ["Arquitetura", "Irrigação"], { agriculture: 0.05, constructionEfficiency: 0.05 }, "Canais, represas e aquedutos."),
  N("Metalurgia avançada do ferro", 1, "Indústria", ["Trabalho do ferro"], { resourceEfficiency: 0.05, armyEquipment: 0.05 }, "Forjas melhores, ferramentas e armas mais duras."),
  N("Legiões profissionais", 1, "Exército", ["Cavalaria", "Direito escrito"], { armyOrganization: 0.05, armyTraining: 0.25, armyProfessionalism: 0.05 }, "Soldados pagos, treinados e organizados em unidades fixas."),
  N("Engenharia de cerco", 1, "Doutrina", ["Arquitetura", "Trabalho do ferro"], { armySiege: 0.15, fortificationEfficiency: 0.25 }, "Torres, aríetes e muralhas melhores."),
  N("Logística de campanha", 1, "Logística", ["Estradas", "Matemática"], { logisticsCapacity: 0.1, supplyEfficiency: 0.05, supplyRange: 1 }, "Depósitos e comboios de carroças."),
  N("Administração provincial", 1, "Administração", ["Direito escrito", "Escrita"], { stateCapacity: 1, administrativeEfficiency: 0.03 }, "Governadores e províncias.", { control: 0.02 }),
  N("Censo populacional", 1, "Administração", ["Matemática", "Direito escrito"], { censusAccuracy: 0.1, taxCollection: 0.02, bureaucraticCapacity: 0.05 }, "Contar a gente e as terras para cobrar."),
  N("Educação clássica", 1, "Educação", ["Filosofia"], { literacy: 0.02, educationAccess: 0.1, researchCapacity: 0.05 }, "Escolas de retórica e filosofia."),
  // Medieval
  N("Agricultura de pousio aprimorada", 2, "Agricultura", ["Rotação trienal"], { agriculture: 0.05 }, "Descanso planejado do solo."),
  N("Contabilidade mercantil", 2, "Comércio", ["Letras de câmbio"], { priceEfficiency: 0.03, privateCapital: 0.05 }, "Livros de contas das casas de comércio."),
  N("Técnicas de construção gótica", 2, "Infraestrutura", ["Arquitetura", "Moinhos"], { constructionEfficiency: 0.05, urbanPlanning: 1 }, "Arcos, abóbadas e cidades maiores.", { urbanCap: 0.05 }),
  N("Cavalaria pesada", 2, "Exército", ["Arreio de coleira", "Trabalho do ferro"], { cavalryEfficiency: 0.15, armyBreakthrough: 0.25 }, "Cavaleiros com armadura em carga."),
  N("Doutrina de fortificações", 2, "Doutrina", ["Castelos"], { fortificationEfficiency: 0.25, armyEntrenchment: 0.25 }, "Defender castelos e passagens."),
  N("Organização de exércitos permanentes", 2, "Exército", ["Feudalismo", "Bestas"], { armyOrganization: 0.05, armyRecovery: 0.1 }, "Tropas mantidas em tempo de paz."),
  N("Administração feudal formalizada", 2, "Governo", ["Feudalismo"], { taxCollection: 0.02, governanceEfficiency: 0.05 }, "Feudos, deveres e tributos escritos."),
  N("Escolástica", 2, "Ciência", ["Universidades", "Filosofia"], { scientificMethod: 0.05, educationQuality: 0.1 }, "Debate e lógica nas universidades."),
  N("Hospitais e enfermarias", 2, "Saúde", ["Medicina antiga", "Catedrais"], { healthcare: 0.1, publicHealth: 0.05 }, "Casas de cuidado mantidas por ordens religiosas."),
  // Renascença
  N("Cartografia comercial", 3, "Comércio", ["Cartografia", "Contabilidade de partidas dobradas"], { shippingCapacity: 0.05, exportCapacity: 0.05 }, "Cartas de rotas para mercadores."),
  N("Instrumentos de precisão", 3, "Indústria", ["Perspectiva", "Matemática"], { researchCapacity: 0.05, inputEfficiency: 0.03 }, "Relógios, lentes e réguas."),
  N("Mineração metalúrgica especializada", 3, "Indústria", ["Mineração profunda", "Alto-forno"], { extraction: 0.05, resourceDepletion: 0.1 }, "Galerias e fornos dedicados ao minério."),
  N("Exércitos profissionais", 3, "Exército", ["Fortificações em estrela", "Trabalho do ferro"], { armyProfessionalism: 0.05, armyTraining: 0.25 }, "Soldados de carreira com oficiais formados."),
  N("Artilharia de cerco", 3, "Exército", ["Fortificações em estrela", "Alto-forno"], { armySiege: 0.2, artilleryEfficiency: 0.1 }, "Canhões grandes contra muralhas."),
  N("Táticas de infantaria combinada", 3, "Doutrina", ["Armas de bronze", "Fortificações em estrela"], { armyCoordination: 0.1, armyDiscipline: 0.05 }, "Piqueiros e atiradores juntos."),
  N("Administração centralizada", 3, "Administração", ["Diplomacia permanente", "Direito escrito"], { stateCapacity: 1, bureaucraticCapacity: 0.1 }, "Secretarias do rei para todo o reino."),
  N("Educação humanista", 3, "Educação", ["Humanismo"], { literacy: 0.02, socialMobility: 0.1 }, "Escolas de letras para burgueses."),
  N("Direito comercial", 3, "Instituições", ["Contabilidade de partidas dobradas", "Direito escrito"], { judicialEfficiency: 0.05, priceEfficiency: 0.03 }, "Contratos e tribunais de comércio."),
  // Descobertas
  N("Contabilidade industrial primitiva", 4, "Indústria", ["Bancos", "Contabilidade de partidas dobradas"], { privateCapital: 0.05, inputEfficiency: 0.03 }, "Custos de oficinas calculados."),
  N("Agricultura colonial especializada", 4, "Agricultura", ["Plantation"], { agriculture: 0.05 }, "Monoculturas para exportar."),
  N("Construção naval oceânica", 4, "Infraestrutura", ["Galeões", "Navegação"], { shippingCapacity: 0.05, productionSpeed: 0.1 }, "Estaleiros para navios de alto-mar."),
  N("Infantaria de fogo coordenado", 4, "Exército", ["Mosquete"], { armyDiscipline: 0.05, armyTraining: 0.25 }, "Salvas em fileiras."),
  N("Logística ultramarina", 4, "Logística", ["Galeões", "Companhias comerciais"], { navalLogistics: 0.1, navalRange: 1 }, "Abastecer tropas do outro lado do mar."),
  N("Artilharia de campanha aprimorada", 4, "Exército", ["Pólvora", "Mosquete"], { artilleryEfficiency: 0.1 }, "Canhões leves que acompanham a infantaria."),
  N("Administração colonial", 4, "Administração", ["Correios", "Diplomacia permanente"], { stateCapacity: 1, censusAccuracy: 0.05 }, "Vice-reis e registros das colônias."),
  N("Academias científicas", 4, "Ciência", ["Método científico", "Universidades"], { researchCapacity: 0.1, scientificMethod: 0.05, knowledgeDiffusion: 0.1 }, "Sociedades de sábios que publicam e trocam cartas."),
  N("Sistema de ensino estatal", 4, "Educação", ["Imprensa", "Educação humanista"], { literacy: 0.03, educationAccess: 0.1 }, "Escolas mantidas pelo Estado."),
  // Revoluções
  N("Mecanização agrícola", 5, "Agricultura", ["Agricultura científica", "Máquina a vapor"], { agriculture: 0.05, mechanization: 0.15, laborProductivity: 0.03 }, "Debulhadoras e semeadeiras."),
  N("Engenharia industrial", 5, "Indústria", ["Máquina a vapor", "Matemática"], { constructionEfficiency: 0.05, manufacturing: 0.03 }, "Projetar fábricas e máquinas."),
  N("Padronização industrial", 5, "Indústria", ["Máquina a vapor", "Contabilidade de partidas dobradas"], { laborProductivity: 0.03, inputEfficiency: 0.05 }, "Peças intercambiáveis."),
  N("Estado-maior profissional", 5, "Doutrina", ["Conscrição", "Administração centralizada"], { commandCapacity: 0.15, armyCoordination: 0.1, armyOrganization: 0.05 }, "Oficiais que planejam campanhas."),
  N("Logística ferroviária militar", 5, "Logística", ["Ferrovias", "Logística de campanha"], { railCapacity: 0.05, supplyEfficiency: 0.1, supplyRange: 2 }, "Trens levam tropas e munição à frente."),
  N("Doutrina de guerra de massa", 5, "Doutrina", ["Conscrição", "Estado-maior profissional"], { armyMobilization: 0.2, armyReinforcement: 0.2 }, "Nação em armas."),
  N("Serviço público profissional", 5, "Administração", ["Administração centralizada", "Iluminismo"], { administrativeEfficiency: 0.05, bureaucraticCost: 0.1 }, "Concursos e carreiras no Estado."),
  N("Estatística estatal", 5, "Administração", ["Matemática", "Administração centralizada"], { censusAccuracy: 0.1, recordKeeping: 0.1, taxCollection: 0.02 }, "Números do país para governar."),
  N("Ensino obrigatório", 5, "Educação", ["Sistema de ensino estatal", "Serviço público profissional"], { literacy: 0.05, educationAccess: 0.15 }, "Toda criança na escola."),
  // Industrialização
  N("Linha de montagem", 6, "Indústria", ["Eletricidade", "Padronização industrial"], { manufacturing: 0.05, productionSpeed: 0.1, inputEfficiency: 0.03 }, "Esteiras e tarefas repetidas."),
  N("Engenharia química avançada", 6, "Indústria", ["Química industrial", "Medicina moderna"], { resourceEfficiency: 0.05, energyEfficiency: 0.05 }, "Processos químicos contínuos."),
  N("Rede elétrica nacional", 6, "Infraestrutura", ["Eletricidade"], { energyEfficiency: 0.1, productionCapacity: 0.05 }, "Usinas ligadas por linhas de transmissão."),
  N("Logística ferroviária integrada", 6, "Infraestrutura", ["Ferrovias", "Telégrafo"], { railCapacity: 0.1, marketAccess: 0.05 }, "Horários e cargas coordenados pelo telégrafo."),
  N("Guerra de trincheiras", 6, "Doutrina", ["Metralhadora", "Artilharia de campanha"], { armyEntrenchment: 0.5, fortificationEfficiency: 0.25 }, "Linhas cavadas e arame farpado."),
  N("Estado-maior moderno", 6, "Doutrina", ["Telégrafo", "Estado-maior profissional"], { commandCapacity: 0.15, armyCoordination: 0.1 }, "Comando por telégrafo e mapas de operações."),
  N("Guerra naval industrial", 6, "Marinha", ["Couraçados", "Aço Bessemer"], { navalFirepower: 0.1, navalProtection: 0.1 }, "Canhões de torre e blindagem de aço."),
  N("Previdência trabalhista", 6, "Sociedade", ["Sindicatos", "Medicina moderna"], { socialStability: 0.05, publicOrder: 2 }, "Seguros contra acidente e velhice."),
  N("Ensino técnico", 6, "Educação", ["Educação pública", "Eletricidade"], { laborProductivity: 0.03, educationQuality: 0.1 }, "Escolas de ofícios e engenharia."),
  N("Saúde pública urbana", 6, "Saúde", ["Saneamento", "Medicina moderna"], { publicHealth: 0.15, healthcare: 0.1 }, "Esgoto, água tratada e postos de saúde."),
  // Grandes Guerras
  N("Cadeias industriais integradas", 7, "Indústria", ["Produção em massa", "Rádio"], { manufacturing: 0.05, industrialComplexity: 0.1 }, "Fornecedores coordenados."),
  N("Refino avançado de petróleo", 7, "Indústria", ["Química industrial", "Motor a combustão"], { fuelEfficiency: 0.1, energyEfficiency: 0.05 }, "Craqueamento e combustíveis melhores."),
  N("Produção industrial militar", 7, "Indústria", ["Produção em massa", "Metralhadora"], { armyEquipment: 0.1, productionSpeed: 0.1 }, "Fábricas convertidas para a guerra."),
  N("Guerra mecanizada", 7, "Exército", ["Blindados", "Logística ferroviária militar"], { armorEfficiency: 0.15, armyBreakthrough: 0.5, fuelEfficiency: 0.05 }, "Tanques e infantaria motorizada."),
  N("Guerra combinada", 7, "Doutrina", ["Aviação", "Estado-maior moderno"], { airSupport: 0.25, armyCoordination: 0.1 }, "Aviação apoiando o avanço por terra."),
  N("Guerra submarina moderna", 7, "Marinha", ["Submarinos", "Rádio"], { navalDoctrine: 0.25, navalReconnaissance: 0.1 }, "Matilhas guiadas por rádio."),
  N("Radar militar", 7, "Aeronáutica", ["Rádio", "Eletricidade"], { armyReconnaissance: 0.1, airInterception: 0.15, navalReconnaissance: 0.15 }, "Ver aviões e navios antes deles."),
  N("Logística motorizada", 7, "Logística", ["Motor a combustão", "Produção industrial militar"], { logisticsCapacity: 0.15, supplyRange: 2 }, "Caminhões no lugar das carroças."),
  N("Mobilização nacional", 7, "Governo", ["Conscrição", "Propaganda"], { armyMobilization: 0.2, stateCapacity: 1 }, "Toda a economia e a gente para a guerra.", { manpower: 0.05 }),
  N("Planejamento econômico de guerra", 7, "Governo", ["Economia planejada", "Cadeias industriais integradas"], { productionSpeed: 0.1, manufacturing: 0.03 }, "Metas de produção do Estado."),
  N("Medicina de emergência", 7, "Saúde", ["Antibióticos", "Medicina moderna"], { attritionReduction: 0.1, healthcare: 0.1 }, "Socorro no campo e hospitais de campanha."),
  // Multipolar
  N("Microeletrônica", 8, "Indústria", ["Computadores", "Eletricidade"], { automation: 0.05, researchCapacity: 0.05 }, "Transistores e circuitos integrados."),
  N("Robótica industrial", 8, "Indústria", ["Produção em massa", "Microeletrônica"], { automation: 0.1, laborProductivity: 0.03 }, "Robôs nas linhas de montagem."),
  N("Logística global", 8, "Comércio", ["Contêineres", "Computadores"], { shippingCapacity: 0.1, importCapacity: 0.1, exportCapacity: 0.1 }, "Portos e rotas controlados por computador."),
  N("Materiais avançados", 8, "Indústria", ["Química industrial", "Microeletrônica"], { resourceEfficiency: 0.05, inputEfficiency: 0.03 }, "Ligas e polímeros novos."),
  N("Guerra eletrônica", 8, "Doutrina", ["Computadores", "Radar militar"], { airInterception: 0.1, armyReconnaissance: 0.1, navalReconnaissance: 0.1 }, "Interferir nas comunicações e radares do inimigo."),
  N("Satélites militares", 8, "Aeronáutica", ["Mísseis", "Computadores"], { airReconnaissance: 0.15, commandCapacity: 0.1, airRange: 2 }, "Ver e comunicar do espaço."),
  N("Doutrina de armas combinadas", 8, "Doutrina", ["Guerra combinada", "Computadores"], { armyCoordination: 0.15, armyTraining: 0.25 }, "Forças treinadas juntas."),
  N("Logística militar informatizada", 8, "Logística", ["Logística global", "Computadores"], { supplyEfficiency: 0.1, logisticsCapacity: 0.1 }, "Estoques e entregas no computador."),
  N("Administração pública informatizada", 8, "Administração", ["Computadores"], { recordKeeping: 0.1, administrativeEfficiency: 0.05 }, "Cadastros e processos em computador."),
  N("Sistemas universais de saúde", 8, "Saúde", ["Previdência social", "Medicina moderna"], { healthcare: 0.15, publicHealth: 0.1, lifeExpectancy: 5 }, "Atendimento para toda a população."),
  N("Comunicação de massa", 8, "Cultura", ["Rádio", "Computadores"], { propagandaEfficiency: 0.15, knowledgeDiffusion: 0.1 }, "Televisão e redes de notícias."),
  // Moderna
  N("Inteligência artificial industrial", 9, "Indústria", ["Automação", "Internet"], { automation: 0.1, laborProductivity: 0.05, inputEfficiency: 0.05 }, "Fábricas que aprendem e se ajustam."),
  N("Manufatura aditiva", 9, "Indústria", ["Robótica industrial", "Materiais avançados"], { resourceEfficiency: 0.05 }, "Imprimir peças sob medida, com pouco desperdício."),
  N("Redes inteligentes de energia", 9, "Infraestrutura", ["Energias renováveis", "Microeletrônica"], { energyEfficiency: 0.1 }, "Consumo e geração ajustados em tempo real."),
  N("Biologia sintética", 9, "Agricultura", ["Biotecnologia", "Inteligência artificial industrial"], { agriculture: 0.05, livestock: 0.05 }, "Organismos projetados."),
  N("Gestão ambiental", 9, "Sociedade", ["Energias renováveis"], { disasterResponse: 0.15, resourceDepletion: 0.1 }, "Preservar recursos e responder a desastres."),
  N("Sistemas militares autônomos", 9, "Exército", ["Drones", "Inteligência artificial industrial"], { armyReconnaissance: 0.1, airReconnaissance: 0.1, commandCapacity: 0.1 }, "Veículos e sensores que operam sozinhos."),
  N("Defesa cibernética", 9, "Doutrina", ["Internet", "Guerra eletrônica"], { commandCapacity: 0.1, recordKeeping: 0.05 }, "Proteger comando e comunicações."),
  N("Guerra em rede", 9, "Doutrina", ["Satélites militares", "Sistemas militares autônomos"], { armyCoordination: 0.15, airSupport: 0.25 }, "Terra, mar e ar no mesmo quadro."),
  N("Logística preditiva", 9, "Logística", ["Inteligência artificial industrial", "Logística militar informatizada"], { supplyEfficiency: 0.1, armyMaintenance: 0.1 }, "Prever o que a tropa vai precisar."),
  N("Administração algorítmica", 9, "Administração", ["Governo digital", "Inteligência artificial industrial"], { administrativeEfficiency: 0.05, bureaucraticCapacity: 0.1, censusAccuracy: 0.05 }, "Planejamento público com dados."),
  N("Medicina personalizada", 9, "Saúde", ["Medicina genômica", "Biologia sintética"], { healthcare: 0.1, lifeExpectancy: 5 }, "Tratamento pelo genoma de cada um."),
  N("Educação digital", 9, "Educação", ["Internet", "Administração pública informatizada"], { educationAccess: 0.15, educationQuality: 0.1 }, "Aulas e livros para todos pela rede."),
  N("Governança de dados", 9, "Governo", ["Governo digital", "Defesa cibernética"], { censusAccuracy: 0.05, governanceEfficiency: 0.1 }, "Registros públicos integrados e protegidos."),
);
// Efeitos mistos das tecnologias antigas (os campos antigos continuam): uma tecnologia age em várias áreas
for (const [name, fx] of [
  ["Máquina a vapor", { manufacturing: 0.03, productionSpeed: 0.1 }], ["Ferrovias", { transportCapacity: 0.1, supplyRange: 1, railCapacity: 0.05 }],
  ["Educação pública", { literacy: 0.05, educationAccess: 0.1, bureaucraticCapacity: 0.05 }], ["Estradas", { transportCapacity: 0.05, supplyRange: 1 }],
  ["Escrita", { recordKeeping: 0.05 }], ["Imprensa", { knowledgeDiffusion: 0.1, propagandaEfficiency: 0.05 }], ["Universidades", { researchCapacity: 0.1 }],
  ["Método científico", { scientificMethod: 0.1, innovation: 0.1 }], ["Iluminismo", { innovation: 0.1, politicalParticipation: 0.05 }],
  ["Telégrafo", { commandCapacity: 0.05, knowledgeDiffusion: 0.1 }], ["Saneamento", { publicHealth: 0.1 }], ["Refrigeração", { foodPreservation: 0.03 }],
  ["Motor a combustão", { logisticsCapacity: 0.05 }], ["Aviação", { airTraining: 0.1 }], ["Caças a jato", { airSuperiority: 0.15 }],
  ["Computadores", { recordKeeping: 0.05, innovation: 0.1 }], ["Internet", { knowledgeDiffusion: 0.15, technologySpread: 0.1 }], ["Governo digital", { administrativeEfficiency: 0.03, taxCollection: 0.02 }],
  ["Catedrais", { legitimacy: 0.0005 }], ["Diplomacia permanente", { migrationAttraction: 0.05 }], ["Humanismo", { religiousTolerance: 0.2 }],
  ["Economia política", { politicalOrganization: 0.05 }], ["Sindicatos", { politicalOrganization: 0.05 }], ["Propaganda", { propagandaEfficiency: 0.15 }],
  ["Conscrição", { armyMobilization: 0.1 }], ["Castelos", { fortificationEfficiency: 0.25 }], ["Fortificações em estrela", { fortificationEfficiency: 0.25 }],
  ["Mineração profunda", { resourceDiscovery: 0.1 }], ["Domesticação", { livestock: 0.05 }], ["Galeões", { navalRange: 1 }], ["Navio a vapor", { navalLogistics: 0.1 }],
  ["Couraçados", { navalProtection: 0.05 }], ["Submarinos", { navalDoctrine: 0.25 }], ["Porta-aviões", { navalReconnaissance: 0.1 }], ["Antibióticos", { diseaseResistance: 0.2 }],
  ["Medicina moderna", { lifeExpectancy: 3 }], ["Previdência social", { socialStability: 0.05 }], ["Contêineres", { shippingCapacity: 0.1 }],
  ["Bancos", { capitalAccumulation: 0.03 }], ["Economia planejada", { socialAdministration: 0.1 }], ["Direito escrito", { lawEnforcement: 0.05 }],
  ["Diplomacia permanente", { technologySpread: 0.05 }], ["Correios", { knowledgeDiffusion: 0.05 }], ["Vacinação variólica", { publicHealth: 0.05 }],
  ["Concreto armado", { constructionSpeed: 0.05, infrastructureMaintenance: 0.05 }], ["Feudalismo", { armySuppression: 0.1 }], ["Navegação", { navalOrganization: 0.05 }],
  ["Caças a jato", { airOrganization: 0.1 }], ["Mísseis", { airBombing: 0.15 }], ["Aviação", { airLogistics: 0.1 }], ["Catedrais", { culturalIntegration: 0.1 }],
  ["Escrita", { assimilation: 0.1 }], ["Correios", { migrationControl: 0.1 }], ["Construção modular", { constructionSpeed: 0.05 }],
] as const) { const t = TECHS.find((x) => x.name === name)!; t.fx = { ...(t.fx ?? {}), ...fx }; }

setTechs(() => TECHS);
/** Subcategoria das tecnologias antigas que não dizem a sua (as novas dizem). */
const SUB_OF: Record<string, string> = {
  "Estradas": "Infraestrutura", "Ferrovias": "Infraestrutura", "Concreto armado": "Infraestrutura", "Construção modular": "Infraestrutura", "Construção automatizada": "Infraestrutura",
  "Aquedutos": "Infraestrutura", "Arquitetura": "Infraestrutura", "Canoas": "Comércio", "Escrita": "Educação", "Educação pública": "Educação", "Universidades": "Educação",
  "Tradição oral": "Cultura", "Imprensa": "Cultura", "Humanismo": "Cultura", "Propaganda": "Cultura", "Catedrais": "Religião", "Direito escrito": "Instituições",
  "Economia política": "Instituições", "Diplomacia permanente": "Governo", "Conselho de anciãos": "Governo", "Feudalismo": "Governo", "Economia planejada": "Governo",
  "Sindicatos": "Sociedade", "Previdência social": "Sociedade", "Economia mista": "Instituições", "Iluminismo": "Ciência", "Calendário lunar": "Ciência", "Correios": "Administração",
  "Governo digital": "Administração", "Medicina antiga": "Saúde", "Vacinação variólica": "Saúde", "Saneamento": "Saúde", "Medicina moderna": "Saúde", "Antibióticos": "Saúde",
  "Medicina genômica": "Saúde", "Fogo controlado": "Sociedade", "Castelos": "Doutrina", "Fortificações em estrela": "Doutrina", "Conscrição": "Exército", "Mísseis": "Exército",
  "Drones": "Aeronáutica", "Caças a jato": "Aeronáutica", "Aviação": "Aeronáutica", "Computadores": "Ciência", "Internet": "Ciência", "Motor a combustão": "Indústria",
  "Navio a vapor": "Marinha", "Bússola": "Marinha", "Navegação": "Marinha", "Galés": "Marinha", "Galeões": "Marinha", "Cartografia": "Comércio", "Máquina a vapor": "Indústria",
  "Pólvora": "Exército", "Energia nuclear": "Indústria", "Mercantilismo": "Comércio", "Contabilidade de partidas dobradas": "Comércio", "Telégrafo": "Infraestrutura", "Rádio": "Cultura",
};
/** Subcategoria: a declarada, a da tabela ou a deduzida dos efeitos antigos. */
export function subOf(t: Tech): string {
  if (t.sub) return t.sub;
  if (SUB_OF[t.name]) return SUB_OF[t.name];
  if (t.army || t.manpower) return "Exército";
  if (t.fleet) return "Marinha";
  if (t.air) return "Aeronáutica";
  if (t.plague) return "Saúde";
  if (t.research) return "Ciência";
  if (t.control) return "Governo";
  if (t.trade) return "Comércio";
  if (t.bonus?.some(([b]) => ["Fazenda", "Pasto", "Irrigação", "Estábulo", "Moinho"].includes(b)) || t.subsistence || t.growth) return "Agricultura";
  if (t.unlocks?.length || t.bonus?.length) return "Indústria";
  return "Sociedade";
}
export const areaOf = (t: Tech): Area => areaOfSub(subOf(t));

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
  ["Moeda", "Mercado local"], ["Rotas de caravana", "Entreposto comercial"], ["Companhias comerciais", "Companhia comercial"], ["Bancos", "Centro comercial"], ["Bolsa de valores", "Bolsa de comércio"], ["Ferrovias", "Centro logístico comercial"],
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
