// Variáveis de tecnologia (docs/variaveis.md e docs/tecnologias.md): cada uma tem UM lugar no código onde age.
// Tecnologias guardam os efeitos em `fx` (TECHS em tech.ts); `tv(pesquisa, chave)` soma as conhecidas, com cache.
// Algumas entram nos fatores da era (eramods.ts econ) em vez de ter leitura própria: ECON_ALIAS.
import type { Research } from "./tech.ts";

export const AREAS = ["Produção", "Militar", "Social"] as const;
export type Area = (typeof AREAS)[number];
export const SUBS: Record<Area, string[]> = {
  "Produção": ["Agricultura", "Indústria", "Comércio", "Infraestrutura"],
  "Militar": ["Exército", "Marinha", "Aeronáutica", "Logística", "Doutrina"],
  "Social": ["Ciência", "Sociedade", "Governo", "Administração", "Educação", "Saúde", "Cultura", "Religião", "Instituições"],
};
export const areaOfSub = (sub: string): Area => (AREAS.find((a) => SUBS[a].includes(sub)) ?? "Social");

/** Chave → [área, o que faz, onde age]. Unidade: fração (0,1 = +10%), salvo onde diz "pontos" ou "hexes" ou "anos". */
export const TECH_VARS = {
  // Produção e economia
  agriculture: ["Produção", "produção de fazendas e lavouras", "economy.ts produção das extratoras (fazendas)"],
  livestock: ["Produção", "produção de pastos e estábulos", "economy.ts produção das extratoras (pecuária)"],
  extraction: ["Produção", "produção de minas, serrarias, caça e poços", "economy.ts produção das extratoras (não agrícolas)"],
  manufacturing: ["Produção", "produtividade industrial", "eramods.ts econ(industry)"],
  resourceEfficiency: ["Produção", "− matéria-prima por unidade produzida nas indústrias", "economy.ts insumos que são recursos naturais"],
  inputEfficiency: ["Produção", "− insumos manufaturados nas indústrias", "economy.ts insumos que são bens manufaturados"],
  laborProductivity: ["Produção", "produção por trabalhador (menos gente para operar o hex)", "economy.ts lotação das extratoras"],
  productionCapacity: ["Produção", "fração da gente do hex que pode trabalhar nas construções", "economy.ts hexLaborShare"],
  productionSpeed: ["Produção", "pontos navais dos estaleiros", "economy.ts navalWeek"],
  constructionEfficiency: ["Produção", "− custo em dinheiro das obras", "construction.ts queueBuild"],
  constructionSpeed: ["Produção", "pontos de construção", "eramods.ts econ(construction)"],
  transportCapacity: ["Produção", "comércio entre cidades por terra", "economy.ts trade()"],
  railCapacity: ["Produção", "comércio entre cidades (com Ferrovias)", "economy.ts trade()"],
  shippingCapacity: ["Produção", "quanto do excedente sai para parceiros", "economy.ts foreignTrade()"],
  storageCapacity: ["Produção", "capacidade de estoque das cidades", "markets.ts storeSurplus"],
  marketAccess: ["Produção", "acesso das cidades ao mercado nacional (pontos de 0–1)", "markets.ts updateAccess"],
  marketIntegration: ["Produção", "comércio entre cidades e exterior", "eramods.ts econ(trade)"],
  priceEfficiency: ["Produção", "monetização (menos perdas de intermediação)", "eramods.ts econ(monetization)"],
  exportCapacity: ["Produção", "oferta exportada", "economy.ts foreignTrade()"],
  importCapacity: ["Produção", "demanda importada atendida", "economy.ts foreignTrade()"],
  privateCapital: ["Produção", "investimento privado", "eramods.ts econ(privateInvest)"],
  capitalAccumulation: ["Produção", "capacidade de crédito", "eramods.ts econ(credit)"],
  industrialComplexity: ["Produção", "− custo a mais da Complexidade da Economia", "markets.ts complexityCost"],
  mechanization: ["Produção", "− trabalhadores das fazendas", "economy.ts lotação das extratoras agrícolas"],
  automation: ["Produção", "− trabalhadores das indústrias", "economy.ts empregos industriais"],
  energyEfficiency: ["Produção", "− energia elétrica gasta pelas indústrias", "economy.ts insumos"],
  fuelEfficiency: ["Produção", "− combustível gasto (indústria, exército, aviação)", "economy.ts, logistics.ts, airwar.ts"],
  resourceDiscovery: ["Produção", "produção de jazidas secundárias do hex", "economy.ts produção das extratoras"],
  resourceDepletion: ["Produção", "− desgaste das jazidas", "economy.ts reserva"],
  foodPreservation: ["Produção", "− perda de comida (subsistência e estoque)", "eramods.ts econ(foodLoss), markets.ts"],
  // Militar
  armyOrganization: ["Militar", "− organização perdida em combate", "battle.ts dano de organização"],
  armyDiscipline: ["Militar", "− moral perdida em combate", "battle.ts moral"],
  armyTraining: ["Militar", "pontos no dado das batalhas terrestres", "battle.ts modificadores"],
  armyProfessionalism: ["Militar", "− baixas próprias", "battle.ts baixas"],
  armyRecovery: ["Militar", "recuperação de organização fora de combate", "war.ts orgRecovery"],
  armyMobilization: ["Militar", "recuperação de recrutas", "economy.ts manpowerRegen"],
  armyReinforcement: ["Militar", "reposição de soldados", "war.ts reinforce"],
  armyReconnaissance: ["Militar", "− chance de cair em emboscada", "battle.ts emboscada"],
  armyInitiative: ["Militar", "pontos no dado atacando", "battle.ts modificadores"],
  armyCoordination: ["Militar", "largura extra por direção de ataque", "battle.ts frente"],
  armyEntrenchment: ["Militar", "teto de entrincheiramento (pontos)", "battle.ts entrench"],
  armySiege: ["Militar", "velocidade de cerco", "war.ts cerco"],
  armyBreakthrough: ["Militar", "pontos no dado atacando na fase de choque", "battle.ts modificadores"],
  armySuppression: ["Militar", "controle sobe mais rápido (territórios novos e rebeldes)", "control.ts risePerMonth"],
  armyMaintenance: ["Militar", "− manutenção das divisões", "economy.ts manutenção do exército"],
  armyEquipment: ["Militar", "− armas gastas por divisão", "economy.ts demanda de armas"],
  artilleryEfficiency: ["Militar", "força de artilharia e cerco", "battle.ts poder por categoria"],
  cavalryEfficiency: ["Militar", "força de montaria", "battle.ts poder por categoria"],
  armorEfficiency: ["Militar", "força de blindados", "battle.ts poder por categoria"],
  navalOrganization: ["Militar", "− organização perdida no mar", "seawar.ts"],
  navalDoctrine: ["Militar", "pontos no dado das batalhas navais", "seawar.ts modificadores"],
  navalReconnaissance: ["Militar", "anula emboscada submarina inimiga", "seawar.ts modificadores"],
  navalRange: ["Militar", "alcance das escoltas e da interceptação de comboios (hexes)", "seawar.ts convoyFactor"],
  navalFirepower: ["Militar", "baixas causadas no mar", "seawar.ts"],
  navalProtection: ["Militar", "− baixas sofridas no mar", "seawar.ts"],
  navalLogistics: ["Militar", "suprimento além-mar (comboio)", "seawar.ts convoyFactor"],
  airOrganization: ["Militar", "prontidão mínima dos esquadrões", "airwar.ts"],
  airTraining: ["Militar", "força dos esquadrões", "war.ts airPower"],
  airReconnaissance: ["Militar", "prontidão com tempo ruim", "airwar.ts"],
  airRange: ["Militar", "alcance dos esquadrões (hexes)", "war.ts AIR.range"],
  airSuperiority: ["Militar", "disputa do céu", "war.ts airSuperiority"],
  airSupport: ["Militar", "apoio aéreo na batalha (pontos)", "war.ts BATTLE_HOOKS"],
  airInterception: ["Militar", "− dano de bombardeio sofrido", "airwar.ts bombardeio"],
  airBombing: ["Militar", "dano de bombardeio causado", "airwar.ts bombardeio"],
  airLogistics: ["Militar", "abastecimento aéreo", "airwar.ts airlift"],
  logisticsCapacity: ["Militar", "capacidade de abastecimento do país", "logistics.ts"],
  supplyEfficiency: ["Militar", "− perda de entrega com a distância", "logistics.ts rangeLoss"],
  supplyRange: ["Militar", "alcance do abastecimento (hexes)", "war.ts supplyRange"],
  attritionReduction: ["Militar", "− atrito", "logistics.ts attrition"],
  fortificationEfficiency: ["Militar", "defesa de cidade (pontos)", "battle.ts urbanDefense"],
  commandCapacity: ["Militar", "bônus do general", "battle.ts general"],
  // Social, ciência e administração
  literacy: ["Social", "alvo de letrados (pontos de fração)", "economy.ts litTarget"],
  educationAccess: ["Social", "velocidade com que os letrados sobem", "economy.ts literacyYear"],
  educationQuality: ["Social", "pesquisa ganha por letrado", "economy.ts literacyResearch"],
  researchCapacity: ["Social", "pesquisa por acadêmico", "economy.ts researchPerAcademic"],
  scientificMethod: ["Social", "pesquisa base", "economy.ts researchBase"],
  knowledgeDiffusion: ["Social", "progresso recebido por difusão", "economy.ts difusão"],
  technologySpread: ["Social", "teto da difusão (fração do custo)", "economy.ts difusão"],
  innovation: ["Social", "pesquisa em tecnologias que ninguém em contato conhece", "economy.ts pesquisa"],
  administrativeEfficiency: ["Social", "pontos administrativos", "eramods.ts econ(admin)"],
  bureaucraticCapacity: ["Social", "teto de pontos administrativos", "admin.ts adminCap"],
  bureaucraticCost: ["Social", "− manutenção dos incentivos", "admin.ts"],
  stateCapacity: ["Social", "alcance do controle a partir da sede (hexes)", "control.ts"],
  governanceEfficiency: ["Social", "velocidade de aprovação das leis", "economy.ts advanceLaw"],
  taxCollection: ["Social", "eficiência de arrecadação", "eramods.ts econ(tax)"],
  censusAccuracy: ["Social", "arrecadação em regiões de pouco controle", "economy.ts imposto"],
  recordKeeping: ["Social", "− custo de ativar incentivos", "admin.ts"],
  lawEnforcement: ["Social", "− produção perdida para radicais", "economy.ts radicalPenalty"],
  judicialEfficiency: ["Social", "− legitimidade perdida para radicais", "economy.ts radicalLegitimacy"],
  publicOrder: ["Social", "pontos no alvo de lealdade", "economy.ts lealdade"],
  legitimacy: ["Social", "legitimidade ganha por semana", "economy.ts"],
  politicalParticipation: ["Social", "apoio popular a leis", "economy.ts advanceLaw"],
  politicalOrganization: ["Social", "apoio dos grupos no parlamento a leis", "politics.ts advanceLaw"],
  socialMobility: ["Social", "migração do campo para a cidade", "economy.ts migrationWeek"],
  socialStability: ["Social", "radicais necessários para revolução (pontos de fração)", "characters.ts AGITATION"],
  socialCohesion: ["Social", "− lealdade perdida por minorias", "economy.ts culturePenalty"],
  culturalIntegration: ["Social", "assimilação cultural", "culture.ts"],
  religiousTolerance: ["Social", "− legitimidade perdida com governante de outra fé", "characters.ts"],
  assimilation: ["Social", "aprendizado da língua oficial", "culture.ts"],
  migrationAttraction: ["Social", "atração de imigrantes", "economy.ts migrate"],
  migrationControl: ["Social", "− emigração", "economy.ts migrate"],
  healthcare: ["Social", "− mortes por fome", "events.ts"],
  publicHealth: ["Social", "− chance de peste", "events.ts"],
  diseaseResistance: ["Social", "− atrito por doença (chuva, selva)", "logistics.ts"],
  lifeExpectancy: ["Social", "anos de vida a mais dos personagens", "characters.ts"],
  urbanPlanning: ["Social", "alcance do mercado da cidade (hexes)", "economy.ts cityReach"],
  infrastructureMaintenance: ["Social", "− manutenção das construções", "eramods.ts econ(upkeep)"],
  disasterResponse: ["Social", "fome acaba mais cedo", "events.ts"],
  socialAdministration: ["Social", "incentivos chegam ao efeito cheio mais rápido", "admin.ts progressOf"],
  propagandaEfficiency: ["Social", "apoio à guerra dura mais", "war.ts supportWeeks"],
} as const satisfies Record<string, readonly [Area, string, string]>;
export type TechVar = keyof typeof TECH_VARS;

/** Fatores da era que recebem uma variável de tecnologia (um lugar só: econ() já tem os limites). */
export const ECON_ALIAS = { tax: "taxCollection", admin: "administrativeEfficiency", construction: "constructionSpeed", industry: "manufacturing",
  upkeep: "infrastructureMaintenance", foodLoss: "foodPreservation", credit: "capitalAccumulation", privateInvest: "privateCapital",
  trade: "marketIntegration", monetization: "priceEfficiency" } as const;

type HasFx = { name: string; fx?: Partial<Record<TechVar, number>> };
let techsRef: () => readonly HasFx[] = () => [];
/** tech.ts registra a lista (evita import circular). */
export const setTechs = (f: () => readonly HasFx[]) => { techsRef = f; };
const cache = new WeakMap<Research, { n: number; v: Map<string, number> }>();
/** Soma da variável nas tecnologias conhecidas (cache até o país aprender outra). */
export function tv(r: Research, key: TechVar): number {
  let c = cache.get(r);
  if (!c || c.n !== r.known.size) {
    const v = new Map<string, number>();
    for (const t of techsRef()) if (t.fx && r.known.has(t.name)) for (const [k, x] of Object.entries(t.fx)) v.set(k, (v.get(k) ?? 0) + (x ?? 0));
    cache.set(r, (c = { n: r.known.size, v }));
  }
  return c.v.get(key) ?? 0;
}
/** Multiplicador limitado: 1 + soma, nunca abaixo de `min` (bônus negativos não zeram nada). */
export const tvMul = (r: Research, key: TechVar, min = 0.2) => Math.max(min, 1 + tv(r, key));
/** Redutor limitado: 1 − soma, entre `floor` e 1,5. */
export const tvCut = (r: Research, key: TechVar, floor = 0.3) => Math.max(floor, Math.min(1.5, 1 - tv(r, key)));
