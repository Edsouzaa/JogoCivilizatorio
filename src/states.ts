// Estados (docs/politica.md): o jogador agrupa cidades em estados. Não dá para mexer em crise (guerra,
// falência ou radicais). Pela lei "Organização territorial": Centralizado = estados só administram (+arrecadação);
// Federação = cada estado escolhe a própria lei de impostos. Cada estado tem um interesse pelo que produz;
// estado insatisfeito tira legitimidade do governo.
import { BASE_PRICE, GOODS, type Economy } from "./economy.ts";
import { LAWS, lawOf } from "./politics.ts";
import type { Flag } from "./flags.ts";

export type State = {
  id: number; country: number; name: string;
  taxLaw: string | null;          // na Federação: lei de impostos própria (null = a nacional)
  interest: Interest; happy: boolean;
  flag?: Flag;
};
export type Interest = "Agrícola" | "Industrial" | "Mercantil";

export const STATES = {
  adminPerState: 0.02,   // Centralizado: +2% de arrecadação por estado...
  adminMax: 0.1,         // ...até +10%
  crisisRadicals: 0.3,   // acima disto de radicais o país está em crise (estados travados)
  unhappyLegitimacy: 0.05, // cada estado insatisfeito tira isto de legitimidade...
  unhappyMax: 0.2,       // ...até isto
  regionBase: 100000,    // regiões aéreas de estado começam aqui (as de cidade são o índice da cidade)
};

// calculados no primeiro uso: economy.ts e states.ts se importam, e GOODS ainda não existe quando este módulo carrega
let FARM_GOODS: Set<number>, INDUSTRIAL_GOODS: Set<number>;
const goodsSets = () => {
  FARM_GOODS ??= new Set(["Grãos", "Frutas e vegetais", "Carne e caça", "Peles", "Fibras", "Cavalos", "Gado", "Especiarias"].map((n) => GOODS.indexOf(n)));
  INDUSTRIAL_GOODS ??= new Set(["Bronze", "Tecidos", "Ferramentas", "Armas"].map((n) => GOODS.indexOf(n)));
};

export const statesOf = (e: Economy, country: number) => e.states.filter((s) => s.country === country);
export const stateOfCity = (e: Economy, city: number) => e.states.find((s) => s.id === e.cities[city]?.state);
const federal = (e: Economy, country: number) => !!lawOf(e.countries[country - 1].politics, "Estados").federal;

/** Motivo de os estados estarem travados (crise), ou null. */
export function statesLocked(e: Economy, country: number): string | null {
  const c = e.countries[country - 1];
  if ([...e.wars].some((k) => k.split("-").map(Number).includes(country))) return "Em guerra: não dá para mudar os estados";
  if (c.bankruptWeeks > 0) return "País falido: não dá para mudar os estados";
  if (c.radicals > STATES.crisisRadicals) return "Crise de radicalismo: não dá para mudar os estados";
  return null;
}

function checkCity(e: Economy, country: number, city: number) {
  const k = e.cities[city];
  if (!k || k.country !== country) return "Escolha uma cidade sua";
  return statesLocked(e, country);
}

/** Cria um estado com a cidade (que sai do estado anterior, se tinha). */
export function createState(e: Economy, country: number, city: number, name?: string): string | null {
  const err = checkCity(e, country, city);
  if (err) return err;
  if (e.countries[country - 1].research.era < 1) return "Estados existem a partir da era Clássica";
  const id = e.nextState++;
  e.states.push({ id, country, name: name ?? `Estado de ${e.cities[city].name}`, taxLaw: null, interest: "Mercantil", happy: true });
  return moveCity(e, city, id);
}

/** Põe a cidade no estado (do mesmo país). */
export function addCityToState(e: Economy, city: number, state: number): string | null {
  const s = e.states.find((x) => x.id === state);
  if (!s) return "Estado não existe";
  const err = checkCity(e, s.country, city);
  return err ?? moveCity(e, city, state);
}

/** Tira a cidade do estado; estado sem cidades deixa de existir. */
export function removeCityFromState(e: Economy, city: number): string | null {
  const k = e.cities[city];
  if (!k?.state) return "A cidade não está em nenhum estado";
  const err = statesLocked(e, k.country);
  return err ?? moveCity(e, city, undefined);
}

function moveCity(e: Economy, city: number, state: number | undefined) {
  e.cities[city].state = state;
  e.version++; // fronteiras de estado mudaram: redesenhar o mapa
  e.states = e.states.filter((s) => e.cities.some((k) => k.state === s.id)); // estado vazio some
  return null;
}

/** Na Federação, o estado escolhe a lei de impostos (null = volta para a nacional). */
export function setStateTax(e: Economy, state: number, law: string | null): string | null {
  const s = e.states.find((x) => x.id === state);
  if (!s) return "Estado não existe";
  if (!federal(e, s.country)) return "Só na Federação os estados têm leis próprias";
  const l = law ? LAWS["Impostos"].find((x) => x.name === law) : null;
  if (law && !l) return "Lei de impostos inexistente";
  if (l && l.era > e.countries[s.country - 1].research.era) return "Lei de outra era";
  s.taxLaw = law;
  return null;
}

/** Imposto que vale na cidade: o do estado na Federação, senão o nacional. */
export function cityTax(e: Economy, city: number) {
  const k = e.cities[city], c = e.countries[k.country - 1], s = stateOfCity(e, city);
  if (s?.taxLaw && federal(e, k.country)) return LAWS["Impostos"].find((l) => l.name === s.taxLaw)!.tax!;
  return lawOf(c.politics, "Impostos").tax!;
}

/** Bônus de arrecadação da administração por estados (só no Centralizado). */
export const adminBonus = (e: Economy, country: number) =>
  federal(e, country) ? 0 : Math.min(STATES.adminMax, statesOf(e, country).length * STATES.adminPerState);

/**
 * Atualiza interesse e satisfação dos estados do país. Agrícola quer imposto até 12%; Industrial e
 * Mercantil querem comércio aberto (lei de Economia com 50% ou mais de troca). Retorna a perda de legitimidade.
 */
export function updateStates(e: Economy, country: number) {
  goodsSets();
  const c = e.countries[country - 1];
  let unhappy = 0;
  for (const s of statesOf(e, country)) {
    let farm = 0, industry = 0, total = 0, tax = 0, n = 0;
    e.cities.forEach((k, idx) => {
      if (k.state !== s.id) return;
      for (let g = 1; g < GOODS.length; g++) {
        const v = k.market.supply[g] * BASE_PRICE[g];
        total += v;
        if (FARM_GOODS.has(g)) farm += v;
        if (INDUSTRIAL_GOODS.has(g)) industry += v;
      }
      tax += cityTax(e, idx); n++;
    });
    s.interest = total && industry / total > 0.25 ? "Industrial" : total && farm / total > 0.5 ? "Agrícola" : "Mercantil";
    s.happy = s.interest === "Agrícola" ? tax / (n || 1) <= 0.12 : lawOf(c.politics, "Economia").tradeShare! >= 0.5;
    if (!s.happy) unhappy++;
  }
  return Math.min(STATES.unhappyMax, unhappy * STATES.unhappyLegitimacy);
}
