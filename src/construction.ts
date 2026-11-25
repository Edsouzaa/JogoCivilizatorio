// Construção por etapas (estilo Victoria 3): obras entram numa fila e andam com pontos de construção (PC) semanais.
//   PC = base da comunidade (todo país tem) + Setores de construção (indústria urbana que gasta materiais da era).
//   A capacidade se divide entre a fila pública (paga pelo tesouro) e a privada (paga pelo fundo de investimento),
//   na proporção da lei de Economia; o que uma fila não usar vai para a outra.
//   O dinheiro da obra sai aos poucos, junto com o progresso. Sem dinheiro, a obra privada espera; a pública vira dívida
//   (como antes). Cada obra é 1 nível de 1 construção num hex; ao terminar, o nível passa a existir (economy.build).
import { BUILDINGS, RULES, build, canBuild, type Economy } from "./economy.ts";
import { GOODS } from "./economy.ts";
import { lawOf } from "./politics.ts";
import { addPrivateLevel } from "./firms.ts";
import { WAR_ECON } from "./wareconomy.ts";
import type { World } from "./world.ts";

export type Project = {
  id: number; country: number; hex: number; b: number;
  cp: number; done: number;   // pontos de construção necessários e já feitos
  cost: number; paid: number; // dinheiro total e já pago
  priv: boolean;              // fila privada (fundo de investimento) ou pública (tesouro)
  week: number;               // semana em que entrou na fila
  paused?: boolean;           // pausada pelo jogador
  waiting?: string;           // por que não andou na última semana (sem capacidade, sem dinheiro)
};

export const CONSTRUCT = {
  baseCp: 2,          // PC por semana que qualquer país tem (a comunidade erguendo as coisas)...
  cpPerCity: 1,       // ...mais isto por cidade
  maxPerProject: 4,   // PC por semana que uma obra aguenta receber (× 1 + era/2): obra grande leva tempo
  cpPerWorker: 0.5,   // PC de 1 nível = trabalhadores da construção × isto (Fazenda 20 → 10 PC)
  maxQueue: 200,      // obras na fila por país
};

/** Métodos do Setor de construção por era: materiais por nível por semana e PC gerados. Só bens que existem no jogo. */
export const CONSTRUCTION_METHODS: { name: string; era: number; inputs: [string, number][]; cp: number }[] = [
  { name: "Construção rudimentar", era: 0, inputs: [["Madeira", 1], ["Pedra", 1]], cp: 3 },
  { name: "Alvenaria", era: 1, inputs: [["Madeira", 1], ["Pedra", 1], ["Argila", 0.5], ["Ferramentas", 0.5]], cp: 5 },
  { name: "Alvenaria especializada", era: 2, inputs: [["Madeira", 1], ["Pedra", 1.5], ["Ferramentas", 0.5], ["Ferro", 0.5]], cp: 7 },
  { name: "Alvenaria com vidro", era: 3, inputs: [["Madeira", 1], ["Pedra", 1], ["Ferro", 0.5], ["Vidro", 0.3], ["Ferramentas", 0.5]], cp: 8 },
  { name: "Estruturas de ferro", era: 5, inputs: [["Madeira", 1], ["Ferro", 1], ["Aço", 0.3], ["Ferramentas", 1], ["Máquinas", 0.2]], cp: 10 },
  { name: "Construção industrial", era: 6, inputs: [["Aço", 1.5], ["Máquinas", 0.5], ["Vidro", 0.5], ["Cimento", 1], ["Combustível", 0.3]], cp: 14 },
  { name: "Concreto armado", era: 7, inputs: [["Aço", 1.5], ["Cimento", 1.5], ["Máquinas", 0.5], ["Combustível", 0.5]], cp: 18 },
  { name: "Construção modular", era: 8, inputs: [["Aço", 1], ["Cimento", 1], ["Máquinas", 0.5], ["Alumínio", 0.3], ["Combustível", 0.5]], cp: 22 },
  { name: "Construção automatizada", era: 9, inputs: [["Aço", 1], ["Cimento", 1], ["Máquinas", 0.5], ["Eletrônicos", 0.2], ["Combustível", 0.3]], cp: 26 },
];
const idx = (n: string) => { const k = GOODS.indexOf(n); if (k < 0) throw new Error(`bem desconhecido: ${n}`); return k; };
let METHOD_INPUTS: [number, number][][] | null = null; // calculado no 1º uso (import circular com economy.ts)
/** Melhor método liberado pela era. */
export const constructionMethod = (era: number) => { let k = 0; CONSTRUCTION_METHODS.forEach((m, i) => { if (m.era <= era) k = i; }); return k; };
const inputsOf = (k: number) => (METHOD_INPUTS ??= CONSTRUCTION_METHODS.map((m) => m.inputs.map(([n, q]) => [idx(n), q] as [number, number])))[k];
/** Método em uso pelo país: o que stepConstruction escolheu na semana passada (o mais avançado cujos materiais o país produz). */
export const sectorMethod = (e: Economy, country: number) => { const c = e.countries[country - 1]; return Math.min(c.sectorMethod ?? constructionMethod(c.research.era), constructionMethod(c.research.era)); };
export const methodInputs = (e: Economy, country: number) => inputsOf(sectorMethod(e, country));

/** PC de 1 nível da construção b. */
export const cpCost = (b: number) => Math.max(1, Math.round(BUILDINGS[b].workers * CONSTRUCT.cpPerWorker));
/** Fração da capacidade que vai para a fila privada (lei de Economia). */
export const privateShare = (e: Economy, country: number) => (lawOf(e.countries[country - 1].politics, "Economia").privateCp ?? 0) * WAR_ECON.privateCut[e.countries[country - 1].warEconomy ?? 0]; // guerra: o Estado requisita a capacidade
/** PC por semana de base (sem setores). */
export const baseCp = (e: Economy, country: number) => CONSTRUCT.baseCp + CONSTRUCT.cpPerCity * e.cities.filter((k) => k.country === country).length;
export const queueOf = (e: Economy, country: number) => (e.construction ?? []).filter((p) => p.country === country);
/** Níveis da construção b no hex que já estão na fila. */
export const queuedLevels = (e: Economy, hex: number, b: number) => (e.construction ?? []).filter((p) => p.hex === hex && p.b === b).length;

/** Põe 1 nível na fila. Valida como a construção normal, contando o que já está na fila. */
export function queueBuild(w: World, e: Economy, hex: number, b: number, priv = false): string | null {
  const country = w.owner[hex];
  if (!country) return "Hex sem dono";
  const err = canBuild(w, e, hex, b, queuedLevels(e, hex, b));
  if (err) return err;
  if (queueOf(e, country).length >= CONSTRUCT.maxQueue) return "Fila de construção cheia";
  const lv = e.levels[b][hex] + queuedLevels(e, hex, b);
  e.construction ??= [];
  e.construction.push({ id: (e.nextProject = (e.nextProject ?? 0) + 1), country, hex, b, cp: cpCost(b), done: 0, cost: RULES.buildCost * (lv + 1), paid: 0, priv, week: e.week });
  return null;
}

/** Tira da fila; o que já foi pago fica gasto (material e trabalho usados). */
export function cancelProject(e: Economy, country: number, id: number): string | null {
  const p = e.construction?.find((x) => x.id === id);
  if (!p || p.country !== country) return "Obra não é sua";
  e.construction = e.construction!.filter((x) => x !== p);
  return null;
}
export function pauseProject(e: Economy, country: number, id: number): string | null {
  const p = e.construction?.find((x) => x.id === id);
  if (!p || p.country !== country) return "Obra não é sua";
  p.paused = !p.paused;
  return null;
}

/**
 * Uma vez por semana, depois da produção (e.countries[].cpWeek já tem o que os setores fizeram):
 * divide a capacidade entre as filas, anda as obras na ordem, paga e termina as que completaram.
 */
export function stepConstruction(w: World, e: Economy) {
  // método dos setores para a semana que vem: o mais avançado da era cujos materiais existem em algum mercado do país
  const made = e.countries.map(() => new Set<number>());
  for (const k of e.cities) k.market.supply.forEach((v, gi) => { if (v > 0) made[k.country - 1].add(gi); });
  e.countries.forEach((c, ci) => {
    let k = constructionMethod(c.research.era);
    while (k > 0 && !inputsOf(k).every(([gi]) => made[ci].has(gi))) k--;
    c.sectorMethod = k;
  });
  const done: Project[] = [];
  e.countries.forEach((c, ci) => {
    const country = ci + 1, list = queueOf(e, country).filter((p) => !p.paused);
    c.cpWeek = (c.cpWeek ?? 0) + baseCp(e, country);
    c.cpUsed = 0;
    if (!list.length) return;
    const share = privateShare(e, country), hasPriv = list.some((p) => p.priv), hasPub = list.some((p) => !p.priv);
    const pool = { true: c.cpWeek * (hasPub ? share : 1), false: c.cpWeek * (hasPriv ? 1 - share : 1) } as Record<string, number>;
    const perProject = CONSTRUCT.maxPerProject * (1 + c.research.era / 2);
    for (const p of list) {
      const key = String(p.priv);
      let give = Math.min(p.cp - p.done, perProject, pool[key]);
      if (give <= 0) { p.waiting = "sem capacidade"; continue; }
      let pay = (p.cost * give) / p.cp;
      if (p.priv && (c.investPool ?? 0) < pay) { // fundo sem dinheiro: anda só o que dá para pagar
        give *= Math.max(0, c.investPool ?? 0) / pay; pay = Math.max(0, c.investPool ?? 0);
        p.waiting = "fundo sem dinheiro";
        if (give <= 1e-9) continue;
      } else p.waiting = undefined;
      if (p.priv) c.investPool! -= pay;
      else { c.treasury -= pay; if (c.treasury < 0) { c.debt += -c.treasury; c.treasury = 0; } }
      p.paid += pay; p.done += give; pool[key] -= give; c.cpUsed += give;
      if (p.done >= p.cp - 1e-9) done.push(p);
    }
  });
  for (const p of done) {
    e.construction = e.construction!.filter((x) => x !== p);
    if (w.owner[p.hex] === p.country && !build(w, e, p.hex, p.b, true) && p.priv) addPrivateLevel(e, p.hex, p.b); // perdeu o hex durante a obra: obra perdida
  }
}

/** Semanas previstas para a obra terminar com a capacidade da última semana (Infinity se parada). */
export function etaWeeks(e: Economy, p: Project) {
  const c = e.countries[p.country - 1];
  const rate = Math.min(CONSTRUCT.maxPerProject * (1 + c.research.era / 2), c.cpWeek ?? 0);
  return rate > 0 ? Math.ceil((p.cp - p.done) / rate) : Infinity;
}
