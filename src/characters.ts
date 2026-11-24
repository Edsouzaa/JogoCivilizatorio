// Personagens importantes (por enquanto: o governante de cada país). Nascem, envelhecem, morrem e são
// substituídos pela regra do governo (herdeiro na chefia tribal/monarquia, eleito na república...).
// Atributos de 0 a 100 mexem em impostos, exército e diplomacia; a vida vira uma lista de acontecimentos.
import { mulberry32, type World } from "./world.ts";
import type { Economy } from "./economy.ts";
import { makeName } from "./names.ts";
import { lawOf } from "./politics.ts";
import { START_YEAR } from "./tech.ts";

export type Looks = { skin: number; hair: number; hairStyle: number; beard: number; face: number; body: number; eyes: number; scar: boolean };
export type Character = {
  id: number; name: string; female: boolean; country: number; born: number; dies: number; // semanas do jogo
  adm: number; dip: number; mil: number; traits: string[]; looks: Looks;
  life: string[]; // acontecimentos ("ano: texto"), para o livro da história
  dead?: boolean; saved?: boolean;
  role?: "General";      // sem = governante
  division?: number;     // general: divisão que comanda
};

export const TRAITS = ["Ambicioso", "Cauteloso", "Corrupto", "Honesto", "Carismático", "Cruel", "Devoto", "Erudito", "Guerreiro", "Pacifista"];
export const CHAR = {
  admTax: 0.2,  // governante com adm 100 arrecada +10%; com 0, −10%
  milArmy: 0.2, // idem para a força do exército
  generalCost: 80,  // dinheiro para contratar um general
  generalBase: 0.05, generalArmy: 0.3, // general dá +5% e mais até ±15% pela habilidade militar
  dipRelation: 0.02, // relação mensal a mais com vizinhos por ponto acima de 50 (× 0,02)
};
export const ageOf = (c: Character, week: number) => Math.floor((week - c.born) / 52);
/** Modificador de −0,5 a +0,5 conforme o atributo (50 = neutro). */
export const attrMod = (v: number) => (v - 50) / 100;

/** Cria um personagem de 20 a 45 anos, com atributos e aparência sorteados (determinístico pela semente). */
export function newCharacter(w: World, e: Economy, country: number, seed: number): Character {
  const r = mulberry32(w.seed * 7349 + seed * 131 + country * 17);
  const lang = w.countries[country - 1].lang ?? 0, female = r() < 0.2;
  const age = 20 + Math.floor(r() * 25), life = 50 + Math.floor(r() * 30);
  const attr = () => Math.round(20 + r() * 60 + (r() < 0.15 ? 20 : 0));
  const traits = [...TRAITS].sort(() => r() - 0.5).slice(0, 2);
  const c: Character = {
    id: (e.nextCharacter = (e.nextCharacter ?? 0) + 1), country, female,
    name: `${makeName(lang, seed * 3 + country)} ${makeName(lang, w.seed + country * 7)}`,
    born: e.week - age * 52, dies: e.week + (life - age) * 52,
    adm: attr(), dip: attr(), mil: attr(), traits,
    looks: { skin: Math.floor(r() * 5), hair: Math.floor(r() * 5), hairStyle: Math.floor(r() * 4), beard: female ? 0 : Math.floor(r() * 4), face: Math.floor(r() * 3), body: Math.floor(r() * 3), eyes: Math.floor(r() * 3), scar: r() < 0.15 },
    life: [],
  };
  return c;
}

const year = (week: number) => { const y = START_YEAR + Math.floor(week / 52); return y < 0 ? `${-y} a.C.` : `${y + 1} d.C.`; };
/** Anota um acontecimento na vida do personagem. "§k§" no texto = nome do país k (resolvido ao mostrar). */
export const note = (c: Character, week: number, text: string) => c.life.push(`${year(week)}: ${text}`);

/** Anota na vida do governante do país, se houver. */
export const noteRuler = (e: Economy, country: number, text: string) => { const r = rulerOf(e, country); if (r) note(r, e.week, text); };
/** Troca §k§ pelo nome do país. */
export const lifeText = (w: World, line: string) => line.replace(/§(\d+)§/g, (_, k) => w.countries[+k - 1]?.name ?? "?");

export const rulerOf = (e: Economy, country: number) => e.characters?.find((c) => c.id === e.countries[country - 1].ruler);

/** Coroa (ou elege) um governante novo para o país. */
function crown(w: World, e: Economy, country: number, how: string) {
  const c = newCharacter(w, e, country, e.week + country);
  note(c, c.born, `nasceu em ${w.countries[country - 1].name}`);
  note(c, e.week, `${how} de ${w.countries[country - 1].name}`);
  (e.characters ??= []).push(c);
  e.countries[country - 1].ruler = c.id;
  return c;
}

/** Contrata um general (personagem novo) para comandar a divisão. */
export function hireGeneral(w: World, e: Economy, id: number): string | null {
  const d = e.divisions.find((x) => x.id === id && x.kind === "army");
  if (!d) return "Só exércitos têm general";
  if (d.general) return "A divisão já tem general";
  const c = e.countries[d.country - 1];
  if (c.treasury < CHAR.generalCost) return `Precisa de ${CHAR.generalCost} no tesouro`;
  c.treasury -= CHAR.generalCost;
  const g = newCharacter(w, e, d.country, e.week * 7 + id);
  g.role = "General"; g.division = id; g.mil = Math.min(100, g.mil + 15); // quem vira general já sabe lutar
  note(g, g.born, `nasceu em §${d.country}§`); note(g, e.week, `virou general da divisão ${id}`);
  (e.characters ??= []).push(g);
  d.general = g.id;
  return null;
}

/** Uma vez por mês: governantes envelhecem e morrem; vem o sucessor. Devolve as mortes (para avisar o jogador). */
export function stepCharacters(w: World, e: Economy) {
  const deaths: Character[] = [];
  for (const g of e.characters ?? []) { // general morre de velhice ou perde a divisão (destruída)
    if (g.role !== "General" || g.dead) continue;
    const d = e.divisions.find((x) => x.id === g.division);
    if (e.week >= g.dies || !d) { g.dead = true; note(g, e.week, d ? `morreu aos ${ageOf(g, e.week)} anos` : "caiu com a sua divisão"); if (d) d.general = undefined; }
  }
  e.countries.forEach((ctry, i) => {
    const k = i + 1;
    let ruler = rulerOf(e, k);
    if (!ruler) ruler = crown(w, e, k, "assumiu o governo");
    if (e.week < ruler.dies) return;
    ruler.dead = true;
    note(ruler, e.week, `morreu aos ${ageOf(ruler, e.week)} anos`);
    deaths.push(ruler);
    const gov = lawOf(ctry.politics, "Governo").name;
    crown(w, e, k, gov === "República" ? "eleito para governar" : gov === "Teocracia" ? "escolhido pelo clero para governar" : gov === "Partido único" ? "escolhido pelo partido para comandar" : "herdou o governo");
  });
  // morto só continua guardado se o jogador guardou na história (o livro dele)
  e.characters = (e.characters ?? []).filter((c) => !c.dead || c.saved);
  return deaths;
}
