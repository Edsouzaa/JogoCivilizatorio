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
  personality?: string;  // comportamento duradouro (PERSONALITIES); traços são características e experiências
  command?: Command; spec?: string; // comando (terrestre, naval, aéreo) e especialização do comandante
  fights?: number; wins?: number;   // batalhas comandadas e vitórias (traços de experiência vêm daqui)
  record?: BattleRec[];             // batalhas que comandou (cópia: a batalha some da lista depois de 26 semanas)
  offices?: Office[];               // cargos ocupados (um personagem pode acumular: governante e general)
  laws?: { name: string; week: number; result: "proposta" | "aprovada" | "retirada" }[]; // participação real em leis
  founded?: string[]; taken?: string[]; // cidades fundadas no governo; cidades tomadas em cerco
  coup?: boolean;                   // chegou ao poder por golpe
};
export type Office = { title: string; country: number; from: number; to?: number; why: string; end?: string };
export type Command = "army" | "fleet" | "air";
/** Uma batalha na vida do comandante. Baixas: o jogo não separa mortos, feridos e capturados (não inventamos). */
export type BattleRec = { week: number; day: number; place: string; enemy: number; side: "atacante" | "defensor"; won: boolean; own: number; foe: number; ownLost: number; foeLost: number; weeks: number };

export const TRAITS = ["Ambicioso", "Cauteloso", "Corrupto", "Honesto", "Carismático", "Cruel", "Devoto", "Erudito", "Guerreiro", "Pacifista",
  "Gênio", "Paciente", "Temperamental", "Paranoico", "Orador", "Negociador", "Popular", "Conspirador", "Reformador", "Poliglota", "Filantropo", "Cético",
  "Robusto", "Frágil", "Calvo", "Barba longa", "Cicatrizado"];
/** Traços que só vêm de acontecimentos (batalhas, ferimentos), nunca no nascimento. */
export const ACQUIRED = ["Veterano", "Herói de guerra", "Sobrevivente de derrota", "Ferido em combate", "Caolho", "Mestre da logística"];
export const TRAIT_CAT: Record<string, string> = {
  "Robusto": "físico", "Frágil": "físico", "Calvo": "físico", "Barba longa": "físico", "Cicatrizado": "físico", "Caolho": "físico", "Ferido em combate": "físico",
  "Gênio": "mental", "Paciente": "mental", "Temperamental": "mental", "Paranoico": "mental", "Erudito": "mental", "Cauteloso": "mental",
  "Veterano": "militar", "Herói de guerra": "militar", "Sobrevivente de derrota": "militar", "Mestre da logística": "militar", "Guerreiro": "militar",
  "Orador": "político", "Negociador": "político", "Popular": "político", "Conspirador": "político", "Reformador": "político", "Corrupto": "político", "Honesto": "político", "Ambicioso": "político",
  "Poliglota": "social", "Filantropo": "social", "Cético": "social", "Devoto": "social", "Carismático": "social", "Cruel": "social", "Pacifista": "social",
};
/** Personalidade: comportamento geral (uma por personagem), com peso nos atributos. */
export const PERSONALITIES: Record<string, { adm?: number; dip?: number; mil?: number; desc: string }> = {
  "Inspirador": { dip: 8, desc: "arrasta multidões" }, "Autoritário": { adm: 5, dip: -5, desc: "manda e cobra" }, "Humilde": { dip: 4, desc: "ouve antes de decidir" },
  "Arrogante": { dip: -8, mil: 3, desc: "acha que sabe tudo" }, "Conciliador": { dip: 7, mil: -3, desc: "busca acordo" }, "Manipulador": { dip: 4, adm: -3, desc: "usa as pessoas" },
  "Impulsivo": { mil: 4, adm: -4, desc: "age antes de pensar" }, "Prudente": { adm: 3, mil: -2, desc: "mede cada passo" }, "Determinado": { adm: 3, mil: 3, desc: "não desiste" },
  "Disciplinado": { adm: 4, mil: 4, desc: "ordem acima de tudo" }, "Reformista": { adm: 5, desc: "quer mudar as instituições" }, "Conservador": { adm: 2, dip: 2, desc: "prefere o que já funciona" },
  "Expansionista": { mil: 5, dip: -5, desc: "olha para as terras vizinhas" }, "Isolacionista": { dip: -4, adm: 3, desc: "cuida de casa" }, "Pragmático": { adm: 3, dip: 3, desc: "faz o que dá certo" },
  "Idealista": { dip: 3, adm: -2, desc: "segue princípios" }, "Populista": { dip: 5, adm: -3, desc: "fala ao povo" }, "Centralizador": { adm: 5, dip: -2, desc: "tudo passa por ele" },
  "Agressivo": { mil: 6, dip: -3, desc: "ataca primeiro" }, "Metódico": { adm: 4, mil: 2, desc: "planeja tudo" }, "Audacioso": { mil: 5, adm: -2, desc: "arrisca alto" },
  "Curioso": { adm: 4, desc: "quer entender o mundo" }, "Visionário": { adm: 4, dip: 2, desc: "pensa no futuro" }, "Generoso": { dip: 5, adm: -2, desc: "divide o que tem" },
  "Implacável": { mil: 4, dip: -8, desc: "não perdoa" }, "Desconfiado": { dip: -4, adm: 2, desc: "vê traição em tudo" }, "Sociável": { dip: 5, desc: "faz amigos fácil" },
};
/** Especializações por comando (era mínima para não haver anacronismo). Terrestre: estilo de comando; naval: dado; aéreo: prontidão. */
export const SPECS: Record<Command, [string, number][]> = {
  army: [["Infantaria", 0], ["Cavalaria", 0], ["Cerco", 0], ["Reconhecimento", 0], ["Engenharia", 1], ["Logística", 0], ["Estratégia defensiva", 0], ["Estratégia ofensiva", 0], ["Artilharia", 4]],
  fleet: [["Combate naval", 0], ["Bloqueio", 0], ["Escolta", 0], ["Transporte", 0], ["Logística naval", 0], ["Operações anfíbias", 1], ["Guerra submarina", 7]],
  air: [["Superioridade aérea", 7], ["Interceptação", 7], ["Bombardeio", 7], ["Apoio terrestre", 7], ["Reconhecimento aéreo", 7], ["Transporte aéreo", 7], ["Logística aérea", 7]],
};
const SPEC_STYLE: Record<string, string> = { "Estratégia ofensiva": "Agressivo", "Artilharia": "Agressivo", "Cerco": "Agressivo", "Estratégia defensiva": "Defensivo", "Engenharia": "Defensivo",
  "Logística": "Logístico", "Cavalaria": "Flanqueador", "Reconhecimento": "Cauteloso", "Infantaria": "Inspirador" };
export const COMMAND_NAME: Record<Command, string> = { army: "terrestre", fleet: "naval", air: "aéreo" };
export const WEEKDAYS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"];
/** Dia (0–6) de um acontecimento dentro da semana: regra fixa pelo que aconteceu (sem fingir precisão). */
export const dayOf = (week: number, salt: number) => (((Math.imul(week + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0) % 7);
/** Efeito de cada traço nos atributos (que mexem em impostos, relações e combate) e, para generais, no estilo de comando. */
export const TRAIT_FX: Record<string, { adm?: number; dip?: number; mil?: number }> = {
  "Ambicioso": { mil: 5, dip: -5 }, "Cauteloso": { mil: -5 }, "Corrupto": { adm: -15 }, "Honesto": { adm: 10 },
  "Carismático": { dip: 10 }, "Cruel": { mil: 5, dip: -10 }, "Devoto": { dip: 5, adm: -5 }, "Erudito": { adm: 10 },
  "Guerreiro": { mil: 10 }, "Pacifista": { mil: -10, dip: 10 },
  "Gênio": { adm: 10, dip: 5 }, "Paciente": { adm: 5, mil: 3 }, "Temperamental": { dip: -6, mil: 4 }, "Paranoico": { dip: -8, adm: 3 },
  "Orador": { dip: 10 }, "Negociador": { dip: 8 }, "Popular": { dip: 6 }, "Conspirador": { dip: 3, adm: -4 }, "Reformador": { adm: 8 },
  "Poliglota": { dip: 7 }, "Filantropo": { dip: 4, adm: -2 }, "Cético": { adm: 3, dip: -2 }, "Robusto": { mil: 4 }, "Frágil": { mil: -5 },
  "Veterano": { mil: 8 }, "Herói de guerra": { mil: 6, dip: 6 }, "Sobrevivente de derrota": { mil: 3 }, "Ferido em combate": { mil: -4 }, "Caolho": { mil: -2 }, "Mestre da logística": { mil: 3, adm: 4 },
};
/** Atributo efetivo: o sorteado mais os traços (0–100). */
export const skill = (c: Character, k: "adm" | "dip" | "mil") => Math.max(0, Math.min(100, c[k] + (PERSONALITIES[c.personality ?? ""]?.[k] ?? 0) + c.traits.reduce((s, t) => s + (TRAIT_FX[t]?.[k] ?? 0), 0)));
/** Estilo de comando do general (battle.ts, logistics.ts): vem do traço quando combina; senão, fixo pelo id. */
export const STYLES = {
  "Defensivo": "+1 no dado defendendo; entrincheira mais",
  "Agressivo": "+1 no dado atacando; perde 10% a mais de soldados",
  "Cauteloso": "−20% de baixas próprias; −0,5 no dado atacando",
  "Flanqueador": "o bônus de flanco vale o dobro",
  "Logístico": "+15% de suprimento entregue ao exército",
  "Inspirador": "moral cai 30% mais devagar",
} as const;
export type Style = keyof typeof STYLES;
export function styleOf(ch: Character): Style {
  if (ch.spec && SPEC_STYLE[ch.spec]) return SPEC_STYLE[ch.spec] as Style; // especialização manda no estilo
  if (ch.traits.includes("Mestre da logística")) return "Logístico";
  if (ch.traits.includes("Cauteloso")) return "Cauteloso";
  if (ch.traits.includes("Guerreiro") || ch.traits.includes("Cruel")) return "Agressivo";
  if (ch.traits.includes("Carismático")) return "Inspirador";
  if (ch.traits.includes("Erudito")) return "Logístico";
  return (["Defensivo", "Flanqueador", "Agressivo", "Defensivo", "Logístico", "Inspirador"] as Style[])[ch.id % 6];
}
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
  const traits = [...TRAITS].sort(() => r() - 0.5).slice(0, 2), names = Object.keys(PERSONALITIES), personality = names[Math.floor(r() * names.length)];
  const c: Character = {
    id: (e.nextCharacter = (e.nextCharacter ?? 0) + 1), country, female,
    name: `${makeName(lang, seed * 3 + country)} ${makeName(lang, w.seed + country * 7)}`,
    born: e.week - age * 52, dies: e.week + (life - age) * 52,
    adm: attr(), dip: attr(), mil: attr(), traits, personality,
    looks: { skin: Math.floor(r() * 5), hair: Math.floor(r() * 5), hairStyle: traits.includes("Calvo") ? 2 : Math.floor(r() * 4), beard: female ? 0 : traits.includes("Barba longa") ? 3 : Math.floor(r() * 4), face: Math.floor(r() * 3), body: Math.floor(r() * 3), eyes: Math.floor(r() * 3), scar: traits.includes("Cicatrizado") || r() < 0.08 },
    life: [],
  };
  return c;
}

const year = (week: number) => { const y = START_YEAR + Math.floor(week / 52); return y < 0 ? `${-y} a.C.` : `${y + 1} d.C.`; };
/** Anota um acontecimento na vida do personagem. "§k§" no texto = nome do país k (resolvido ao mostrar). */
export const note = (c: Character, week: number, text: string) => c.life.push(`${year(week)}: ${text}`);

/** Lei na vida do governante: o que ele de fato fez (propôs, retirou, aprovou no seu governo). */
export function lawNote(e: Economy, country: number, name: string, result: "proposta" | "aprovada" | "retirada") {
  const r = rulerOf(e, country); if (!r) return;
  (r.laws ??= []).push({ name, week: e.week, result });
  note(r, e.week, `${WEEKDAYS[dayOf(e.week, name.length)]}: ${result === "proposta" ? "propôs" : result === "aprovada" ? "viu aprovada" : "retirou"} a lei ${name}`);
}
/** Anota na vida do governante do país, se houver. */
export const noteRuler = (e: Economy, country: number, text: string) => { const r = rulerOf(e, country); if (r) note(r, e.week, text); };
/** Troca §k§ pelo nome do país. */
export const lifeText = (w: World, line: string) => line.replace(/§(\d+)§/g, (_, k) => w.countries[+k - 1]?.name ?? "?");

export const rulerOf = (e: Economy, country: number) => e.characters?.find((c) => c.id === e.countries[country - 1].ruler);

/** Abre e fecha cargos no histórico do personagem. */
export function openOffice(c: Character, title: string, country: number, week: number, why: string) { (c.offices ??= []).push({ title, country, from: week, why }); }
export function closeOffice(c: Character, title: string, week: number, end: string) { const o = [...(c.offices ?? [])].reverse().find((x) => x.title === title && x.to === undefined); if (o) { o.to = week; o.end = end; } }
/** Põe o personagem no governo do país (herdeiro, eleito, general que assume ou golpe). */
function enthrone(w: World, e: Economy, country: number, c: Character, how: string) {
  note(c, e.week, `${WEEKDAYS[dayOf(e.week, c.id)]}: ${how} de ${w.countries[country - 1].name}`);
  openOffice(c, "Governante", country, e.week, how);
  e.countries[country - 1].ruler = c.id;
}
/** Coroa (ou elege) um governante novo para o país. */
function crown(w: World, e: Economy, country: number, how: string) {
  const c = newCharacter(w, e, country, e.week + country);
  note(c, c.born, `nasceu em ${w.countries[country - 1].name}`);
  (e.characters ??= []).push(c);
  enthrone(w, e, country, c, how);
  return c;
}
/** General famoso do país que pode assumir o governo (mais vitórias primeiro). */
const AMBITIOUS = ["Expansionista", "Autoritário", "Audacioso", "Centralizador", "Arrogante"];
function strongman(e: Economy, country: number) {
  return (e.characters ?? []).filter((g) => g.role === "General" && !g.dead && g.country === country && (g.wins ?? 0) >= 3).sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0))[0];
}
const ambitious = (g: Character) => g.traits.includes("Ambicioso") || g.traits.includes("Conspirador") || AMBITIOUS.includes(g.personality ?? "");
/** Classificações históricas tiradas só do que foi registrado (podem ser várias). */
export function titlesOf(c: Character, week: number): string[] {
  const t: string[] = [], r = c.record ?? [], wins = r.filter((b) => b.won).length;
  const ruled = (c.offices ?? []).filter((o) => o.title === "Governante").reduce((s, o) => s + ((o.to ?? week) - o.from), 0) / 52;
  if ((c.taken?.length ?? 0) >= 3) t.push("Grande conquistador");
  if (r.length >= 3 && wins === r.length) t.push("General invicto"); else if (wins >= 5) t.push("Estrategista");
  if (c.traits.includes("Herói de guerra")) t.push("Herói nacional");
  if ((c.laws?.filter((l) => l.result === "aprovada").length ?? 0) >= 2) t.push("Reformador");
  if ((c.founded?.length ?? 0) >= 3) t.push("Fundador");
  if (c.coup) t.push(PERSONALITIES[c.personality ?? ""] && ["Implacável", "Autoritário"].includes(c.personality!) ? "Tirano" : "Usurpador");
  if (ruled >= 20) t.push("Estadista");
  if (r.length >= 3 && wins === 0) t.push("Comandante derrotado");
  return t;
}
/** Título da capa do livro: o feito mais marcante. */
export function epithet(c: Character, week: number) {
  const t = titlesOf(c, week)[0];
  return t ? `O ${t.replace("Grande conquistador", "Conquistador").replace("Comandante derrotado", "General Vencido")}` : c.role === "General" ? "Um comandante" : "Um governante";
}

const commandOf = (kind: string): Command | null => (kind === "army" ? "army" : kind === "fleet" ? "fleet" : kind === "air" ? "air" : null);
/** Três candidatos a comandante para a unidade (mesma semana e unidade = os mesmos três): especializações e personalidades diferentes. */
export function generalCandidates(w: World, e: Economy, id: number): Character[] {
  const d = e.divisions.find((x) => x.id === id), cmd = d && commandOf(d.kind);
  if (!d || !cmd) return [];
  const era = e.countries[d.country - 1].research.era, r = mulberry32(w.seed * 31 + e.week * 977 + id * 13);
  const specs = SPECS[cmd].filter(([, min]) => era >= min).map(([n]) => n).sort(() => r() - 0.5);
  const used = new Set<string>(), next = e.nextCharacter ?? 0;
  return [0, 1, 2].map((k) => {
    const g = newCharacter(w, e, d.country, e.week * 7 + id * 3 + k);
    e.nextCharacter = next; g.id = next + 1 + k; // ainda não contratados: não gastam ids
    while (used.has(g.personality!)) g.personality = Object.keys(PERSONALITIES)[Math.floor(r() * Object.keys(PERSONALITIES).length)];
    used.add(g.personality!);
    g.command = cmd; g.spec = specs[k % specs.length]; g.role = "General"; g.mil = Math.min(100, g.mil + 10 + k * 3); // quem chega a comandante já sabe lutar
    if (k === 2 && r() < 0.5) g.traits = [...g.traits.slice(0, 1), "Veterano"]; // um deles costuma ter mais estrada
    return g;
  });
}
/** Contrata o candidato `pick` (0–2) para comandar a unidade (exército, frota ou esquadrão). */
export function hireGeneral(w: World, e: Economy, id: number, pick = 0): string | null {
  const d = e.divisions.find((x) => x.id === id);
  if (!d || !commandOf(d.kind)) return "Só exércitos, frotas e esquadrões têm comandante";
  if (d.general) return "A unidade já tem comandante";
  const c = e.countries[d.country - 1];
  if (c.treasury < CHAR.generalCost) return `Precisa de ${CHAR.generalCost} no tesouro`;
  const g = generalCandidates(w, e, id)[Math.max(0, Math.min(2, pick | 0))];
  c.treasury -= CHAR.generalCost;
  e.nextCharacter = g.id;
  g.division = id;
  note(g, g.born, `nasceu em §${d.country}§`);
  note(g, e.week, `${WEEKDAYS[dayOf(e.week, id)]}: nomeado comandante ${COMMAND_NAME[g.command!]} (${g.spec}) da unidade ${id}`);
  openOffice(g, `Comandante ${COMMAND_NAME[g.command!]}`, d.country, e.week, `contratado entre três candidatos (${g.spec})`);
  (e.characters ??= []).push(g);
  d.general = g.id;
  return null;
}

/** Batalha decidida: entra no registro de cada comandante, com números; experiência vira traço. Não inventa o que o combate não mede. */
export function recordBattle(e: Economy, b: { id: number; hex: number; start: number; attacker: number; defender: number; startAtt: number; startDef: number; deadAtt: number; deadDef: number }, winner: "att" | "def", att: { general?: number }[], def: { general?: number }[], place: string) {
  const day = dayOf(e.week, b.id);
  const sides: [typeof att, "atacante" | "defensor"][] = [[att, "atacante"], [def, "defensor"]];
  for (const [ds, side] of sides) for (const d of ds) {
    const g = d.general ? e.characters?.find((x) => x.id === d.general) : undefined;
    if (!g || g.record?.some((x) => x.week === e.week && x.place === place)) continue;
    const isAtt = side === "atacante", won = (winner === "att") === isAtt;
    const rec: BattleRec = { week: e.week, day, place, enemy: isAtt ? b.defender : b.attacker, side, won, own: Math.round(isAtt ? b.startAtt : b.startDef), foe: Math.round(isAtt ? b.startDef : b.startAtt),
      ownLost: Math.round(isAtt ? b.deadAtt : b.deadDef), foeLost: Math.round(isAtt ? b.deadDef : b.deadAtt), weeks: e.week - b.start + 1 };
    (g.record ??= []).push(rec);
    g.fights = (g.fights ?? 0) + 1; if (won) g.wins = (g.wins ?? 0) + 1;
    note(g, e.week, `${WEEKDAYS[day]}: ${won ? "venceu" : "perdeu"} a batalha ${place} contra §${rec.enemy}§ como ${side} — ${rec.own} × ${rec.foe} soldados; baixas ${rec.ownLost} suas, ${rec.foeLost} do inimigo`);
    const gain = (t: string, why: string) => { if (!g.traits.includes(t)) { g.traits.push(t); note(g, e.week, `ganhou o traço ${t} (${why})`); } };
    if (g.fights >= 3) gain("Veterano", `${g.fights} batalhas`);
    if ((g.wins ?? 0) >= 3) gain("Herói de guerra", `${g.wins} vitórias`);
    if (!won && rec.ownLost > rec.own * 0.4) gain("Sobrevivente de derrota", `perdeu ${rec.ownLost} de ${rec.own} soldados`);
    const hurt = dayOf(e.week * 3 + g.id, b.id) === 0 && rec.ownLost > 0; // 1 em 7: ferido no combate
    if (hurt) { gain("Ferido em combate", "ferido na batalha"); if (dayOf(g.id, e.week) < 2) { gain("Caolho", "perdeu um olho"); } else g.looks.scar = true; }
  }
}

/** Uma vez por mês: governantes envelhecem e morrem; vem o sucessor. Devolve as mortes (para avisar o jogador). */
export function stepCharacters(w: World, e: Economy) {
  const deaths: Character[] = [];
  for (const g of e.characters ?? []) { // general morre de velhice ou perde a divisão (destruída)
    if (g.role !== "General" || g.dead) continue;
    const d = e.divisions.find((x) => x.id === g.division);
    if (e.week >= g.dies || !d) { g.dead = true; note(g, e.week, d ? `morreu aos ${ageOf(g, e.week)} anos` : "caiu com a sua divisão"); closeOffice(g, `Comandante ${COMMAND_NAME[g.command ?? "army"]}`, e.week, d ? "morte" : "unidade destruída"); if (g.id === e.countries[g.country - 1].ruler) closeOffice(g, "Governante", e.week, "morte"); if (d) d.general = undefined; }
  }
  e.countries.forEach((ctry, i) => {
    const k = i + 1;
    let ruler = rulerOf(e, k);
    if (!ruler || ruler.dead) ruler = crown(w, e, k, "assumiu o governo");
    const gen = strongman(e, k);
    // golpe: general vitorioso e ambicioso, governo fraco (sorteio fixo pela semana: no máximo 1 em 13 meses)
    if (gen && gen.id !== ruler.id && ambitious(gen) && ctry.politics.legitimacy < 0.25 && dayOf(e.week, gen.id + k) === 0 && (e.week >> 2) % 13 === gen.id % 13) {
      note(ruler, e.week, `foi deposto por um golpe do general ${gen.name}`); closeOffice(ruler, "Governante", e.week, `deposto por golpe de ${gen.name}`);
      gen.coup = true; enthrone(w, e, k, gen, "tomou o poder num golpe"); ctry.politics.legitimacy = Math.max(0, ctry.politics.legitimacy - 0.1);
      return;
    }
    if (e.week < ruler.dies) return;
    ruler.dead = true;
    note(ruler, e.week, `morreu aos ${ageOf(ruler, e.week)} anos`); closeOffice(ruler, "Governante", e.week, "morte");
    deaths.push(ruler);
    const gov = lawOf(ctry.politics, "Governo").name;
    if (gen && (gov === "República" ? skill(gen, "dip") >= 50 : ambitious(gen) || gen.traits.includes("Herói de guerra"))) { // o herói das batalhas assume (e segue general)
      enthrone(w, e, k, gen, gov === "República" ? "eleito para governar, depois das vitórias" : "assumiu o governo com o apoio das tropas");
      return;
    }
    crown(w, e, k, gov === "República" ? "eleito para governar" : gov === "Teocracia" ? "escolhido pelo clero para governar" : gov === "Partido único" ? "escolhido pelo partido para comandar" : "herdou o governo");
  });
  // morto só continua guardado se o jogador guardou na história (o livro dele)
  e.characters = (e.characters ?? []).filter((c) => !c.dead || c.saved);
  return deaths;
}
