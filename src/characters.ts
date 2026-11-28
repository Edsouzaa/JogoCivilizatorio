// Personagens importantes (por enquanto: o governante de cada país). Nascem, envelhecem, morrem e são
// substituídos pela regra do governo (herdeiro na chefia tribal/monarquia, eleito na república...).
// Atributos de 0 a 100 mexem em impostos, exército e diplomacia; a vida vira uma lista de acontecimentos.
import { mulberry32, type World } from "./world.ts";
import type { Economy } from "./economy.ts";
import { makeName, LANGUAGES } from "./names.ts";
import { lawOf } from "./politics.ts";
import { START_YEAR } from "./tech.ts";
import { chronicle } from "./chronicle.ts";

export type Looks = { skin: number; hair: number; hairStyle: number; beard: number; face: number; body: number; eyes: number; scar: boolean };
export type Character = {
  id: number; name: string; female: boolean; country: number; born: number; dies: number; // semanas do jogo
  adm: number; dip: number; mil: number; traits: string[]; looks: Looks;
  life: string[]; // acontecimentos ("ano: texto"), para o livro da história
  dead?: boolean; saved?: boolean;
  role?: "General" | "Agitador" | "Diplomata"; // sem = governante
  division?: number;     // general: divisão que comanda
  personality?: string;  // comportamento duradouro (PERSONALITIES); traços são características e experiências
  command?: Command; spec?: string; // comando (terrestre, naval, aéreo) e especialização do comandante
  fights?: number; wins?: number;   // batalhas comandadas e vitórias (traços de experiência vêm daqui)
  record?: BattleRec[];             // batalhas que comandou (cópia: a batalha some da lista depois de 26 semanas)
  offices?: Office[];               // cargos ocupados (um personagem pode acumular: governante e general)
  laws?: { name: string; week: number; result: "proposta" | "aprovada" | "retirada" }[]; // participação real em leis
  founded?: string[]; taken?: string[]; // cidades fundadas no governo; cidades tomadas em cerco
  coup?: boolean;                   // chegou ao poder por golpe
  revolution?: boolean;             // chegou ao poder por revolução
  langs?: number[];                 // línguas que fala (a primeira é a materna)
  exiledTo?: number;                // país onde vive exilado
  gone?: boolean;                   // saiu da vida pública (não morreu)
  religion?: number;                // religião (culture.ts RELIGIONS); pode mudar no exílio
  spouse?: number; heirs?: number[]; parent?: number; // família do governante: cônjuge e filhos (herdeiros)
};
export type Office = { title: string; country: number; from: number; to?: number; why: string; end?: string };
export type Command = "army" | "fleet" | "air";
/** Uma batalha na vida do comandante. Baixas: o jogo não separa mortos, feridos e capturados (não inventamos). */
export type BattleRec = { week: number; day: number; place: string; enemy: number; side: "atacante" | "defensor"; won: boolean; own: number; foe: number; ownLost: number; foeLost: number; weeks: number; notes?: string[] };

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
  c.religion = e.countries[country - 1]?.stateReligion ?? 0;
  c.langs = [lang, ...(traits.includes("Poliglota") ? [(lang + 1 + Math.floor(r() * 5)) % LANGUAGES.length] : [])];
  return c;
}

const year = (week: number) => { const y = START_YEAR + Math.floor(week / 52); return y < 0 ? `${-y} a.C.` : `${y + 1} d.C.`; };
/** Anota um acontecimento na vida do personagem. "§k§" no texto = nome do país k (resolvido ao mostrar). */
export const note = (c: Character, week: number, text: string) => c.life.push(`${year(week)}: ${text}`);

/** Lei na vida do governante: o que ele de fato fez (propôs, retirou, aprovou no seu governo). */
export function lawNote(e: Economy, country: number, name: string, result: "proposta" | "aprovada" | "retirada") {
  const r = rulerOf(e, country); if (!r) return;
  (r.laws ??= []).push({ name, week: e.week, result });
  if (result === "aprovada") chronicle(e, "lei", `aprovada a lei ${name} em §${country}§`, [country], [r.id], 2);
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
function enthrone(w: World, e: Economy, country: number, c: Character, how: string, title = "Governante") {
  note(c, e.week, `${WEEKDAYS[dayOf(e.week, c.id)]}: ${how} de ${w.countries[country - 1].name}`);
  openOffice(c, title, country, e.week, how);
  chronicle(e, how.includes("golpe") ? "golpe" : how.includes("revolução") ? "revolução" : "governo", `${c.name} ${how} de §${country}§`, [country], [c.id], how.includes("golpe") || how.includes("revolução") ? 4 : 2);
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
  if (c.revolution) t.push("Revolucionário");
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
export const DIPLOMAT = { cost: 60, perPoint: 0.2 }; // bônus = (diplomacia − 50) × perPoint
export const diplomatOf = (e: Economy, k: number) => { const id = e.countries[k - 1]?.diplomat; return id ? e.characters?.find((c) => c.id === id && !c.dead) : undefined; };
/** Pontos a mais de relação por gesto e de tolerância nos acordos, pela diplomacia do diplomata (pode ser negativo). */
export const diplomatBonus = (e: Economy, k: number) => { const d = diplomatOf(e, k); return d ? Math.round((skill(d, "dip") - 50) * DIPLOMAT.perPoint) : 0; };
/** Três candidatos a diplomata (mesma semana = os mesmos três). */
export function diplomatCandidates(w: World, e: Economy, k: number): Character[] {
  const next = e.nextCharacter ?? 0;
  return [0, 1, 2].map((i) => { const c = newCharacter(w, e, k, e.week * 19 + k * 7 + i); e.nextCharacter = next; c.id = next + 1 + i; c.role = "Diplomata"; c.dip = Math.min(100, c.dip + 8 + i * 4); return c; });
}
/** Nomeia o diplomata (substitui o anterior, que deixa o cargo). */
export function hireDiplomat(w: World, e: Economy, k: number, pick = 0): string | null {
  const c = e.countries[k - 1];
  if (c.treasury < DIPLOMAT.cost) return `Precisa de ${DIPLOMAT.cost} no tesouro`;
  const d = diplomatCandidates(w, e, k)[Math.max(0, Math.min(2, pick | 0))];
  c.treasury -= DIPLOMAT.cost; e.nextCharacter = d.id;
  const old = diplomatOf(e, k);
  if (old) { closeOffice(old, "Diplomata", e.week, `substituído por ${d.name}`); old.role = undefined; old.gone = true; note(old, e.week, "deixou o cargo de diplomata"); }
  note(d, d.born, `nasceu em §${k}§`); note(d, e.week, `${WEEKDAYS[dayOf(e.week, d.id)]}: nomeado diplomata de §${k}§`);
  openOffice(d, "Diplomata", k, e.week, "escolhido entre três candidatos");
  (e.characters ??= []).push(d); c.diplomat = d.id;
  return null;
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
/** Avaliação do comando: o que pesou além do general (números, terreno, suprimento); só fatos medidos. */
export function assess(r: BattleRec, supply: number, terrain?: { name: string; defense: number }) {
  const n: string[] = [], ratio = r.foe > 0 ? r.own / r.foe : 9, trade = r.foeLost > 0 ? r.ownLost / r.foeLost : 9;
  if (r.won && ratio < 0.8) n.push("venceu em inferioridade numérica");
  else if (r.won && ratio > 1.5) n.push("venceu com superioridade numérica (mérito dividido com os números)");
  else if (!r.won && ratio > 1.2) n.push("perdeu apesar da superioridade numérica");
  else if (!r.won && ratio < 0.67) n.push("perdeu em grande inferioridade numérica");
  if (terrain && terrain.defense > 0) n.push(r.side === "defensor" ? `defendeu em ${terrain.name.toLowerCase()} (+${terrain.defense} no dado)` : `atacou em ${terrain.name.toLowerCase()} (o terreno favorecia o inimigo)`);
  if (supply < 0.5) n.push(`tropas mal abastecidas (${Math.round(supply * 100)}%)`);
  if (trade < 0.5) n.push("perdeu muito menos gente que o inimigo");
  else if (trade > 2) n.push("perdeu muito mais gente que o inimigo");
  return n;
}
export function recordBattle(e: Economy, b: { id: number; hex: number; start: number; attacker: number; defender: number; startAtt: number; startDef: number; deadAtt: number; deadDef: number }, winner: "att" | "def", att: { general?: number; supply?: { level: number } }[], def: { general?: number; supply?: { level: number } }[], place: string, terrain?: { name: string; defense: number }) {
  const day = dayOf(e.week, b.id), gens = [...att, ...def].map((d) => d.general).filter((x): x is number => !!x);
  chronicle(e, "batalha", `batalha ${place}: vitória ${winner === "att" ? `de §${b.attacker}§ (atacante)` : `de §${b.defender}§ (defensor)`} — ${Math.round(b.startAtt)} × ${Math.round(b.startDef)} soldados, baixas ${Math.round(b.deadAtt)} e ${Math.round(b.deadDef)}`, [b.attacker, b.defender], gens, 2);
  const sides: [typeof att, "atacante" | "defensor"][] = [[att, "atacante"], [def, "defensor"]];
  for (const [ds, side] of sides) for (const d of ds) {
    const g = d.general ? e.characters?.find((x) => x.id === d.general) : undefined;
    if (!g || g.record?.some((x) => x.week === e.week && x.place === place)) continue;
    const isAtt = side === "atacante", won = (winner === "att") === isAtt;
    const sup = (isAtt ? att : def).map((x) => x.supply?.level ?? 1), supply = sup.length ? sup.reduce((s, v) => s + v, 0) / sup.length : 1;
    const rec: BattleRec = { week: e.week, day, place, enemy: isAtt ? b.defender : b.attacker, side, won, own: Math.round(isAtt ? b.startAtt : b.startDef), foe: Math.round(isAtt ? b.startDef : b.startAtt),
      ownLost: Math.round(isAtt ? b.deadAtt : b.deadDef), foeLost: Math.round(isAtt ? b.deadDef : b.deadAtt), weeks: e.week - b.start + 1 };
    rec.notes = assess(rec, supply, terrain);
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
export const FAMILY = { majority: 16, marryAge: 18, childMax: 4, fertileUntil: 45, otherFaith: 0.003, devout: 0.001 };
const HEREDITARY = ["Chefia tribal", "Chefia com conselho", "Monarquia", "Monarquia absoluta", "Monarquia constitucional", "Império"];
/** Cônjuge ou filho de quem não governa mais: sai da lista (a não ser que esteja guardado). */
function kinOnly(e: Economy, c: Character, rulers: Set<number | undefined>) {
  const parent = c.parent !== undefined ? e.characters?.find((x) => x.id === c.parent) : undefined;
  const spouseOf = e.characters?.find((x) => x.spouse === c.id);
  if (parent) return !rulers.has(parent.id);
  if (spouseOf) return !rulers.has(spouseOf.id);
  return false;
}
/** Casamento e filhos do governante (mensal, sorteio fixo pela semana). Filhos são os herdeiros. */
function family(w: World, e: Economy, ruler: Character, k: number) {
  const age = ageOf(ruler, e.week), sp = ruler.spouse !== undefined ? e.characters?.find((x) => x.id === ruler.spouse) : undefined;
  if (!sp && age >= FAMILY.marryAge && dayOf(e.week, ruler.id) === 0) {
    const s = newCharacter(w, e, k, e.week * 11 + ruler.id);
    s.female = !ruler.female; if (!s.female) s.looks.beard = s.looks.beard || 1; else s.looks.beard = 0;
    s.born = ruler.born + Math.round((dayOf(e.week, s.id) - 3) * 52); s.religion = ruler.religion;
    ruler.spouse = s.id; (e.characters ??= []).push(s);
    note(ruler, e.week, `${WEEKDAYS[dayOf(e.week, s.id)]}: casou-se com ${s.name}`); note(s, e.week, `casou-se com ${ruler.name}, que governa §${k}§`);
    return;
  }
  const kids = ruler.heirs?.length ?? 0, mother = ruler.female ? ruler : sp;
  if (sp && !sp.dead && kids < FAMILY.childMax && mother && ageOf(mother, e.week) <= FAMILY.fertileUntil && dayOf(e.week, ruler.id + 3) === 0 && (e.week >> 2) % 3 === 0) {
    const ch = newCharacter(w, e, k, e.week * 13 + ruler.id + kids);
    const life = ch.dies - ch.born;
    ch.born = e.week; ch.dies = e.week + life + 20 * 52; ch.parent = ruler.id; ch.religion = ruler.religion;
    ch.name = `${ch.name.split(" ")[0]} ${ruler.name.split(" ").slice(1).join(" ") || ruler.name}`; // sobrenome da família
    ch.life = []; note(ch, e.week, `nasceu, filho de ${ruler.name} e ${sp.name}`);
    (ruler.heirs ??= []).push(ch.id); (e.characters ??= []).push(ch);
    note(ruler, e.week, `${WEEKDAYS[dayOf(e.week, ch.id)]}: nasceu ${ch.female ? "sua filha" : "seu filho"} ${ch.name}`);
  }
}
export const AGITATION = { appear: 0.3, fade: 0.12, revolt: 0.45, legitimacy: 0.2, newLegitimacy: 0.5 };
/** Governante derrubado vai para o país que melhor o recebe (melhor relação); aprende a língua de lá. */
function exile(w: World, e: Economy, c: Character, from: number) {
  const rel = (k: number) => e.relations?.[from < k ? `${from}-${k}` : `${k}-${from}`] ?? 0;
  const host = e.countries.map((_, i) => i + 1).filter((k) => k !== from && e.cities.some((x) => x.country === k)).sort((a, b) => rel(b) - rel(a))[0];
  if (!host) { c.gone = true; return; }
  c.exiledTo = host; c.gone = true;
  chronicle(e, "exílio", `${c.name} parte de §${from}§ para o exílio em §${host}§`, [from, host], [c.id], 2);
  note(c, e.week, `${WEEKDAYS[dayOf(e.week, c.id + 1)]}: partiu para o exílio em §${host}§`);
  openOffice(c, "Exilado", host, e.week, `fugiu de §${from}§`);
  const l = w.countries[host - 1].lang ?? 0;
  if (!(c.langs ??= [w.countries[from - 1].lang ?? 0]).includes(l)) { c.langs.push(l); note(c, e.week, "aprendeu a língua do país que o recebeu"); }
  const hr = e.countries[host - 1].stateReligion;
  if (hr !== undefined && hr !== c.religion && !c.traits.includes("Devoto") && dayOf(e.week, c.id) < 3) { c.religion = hr; note(c, e.week, "adotou a religião do país que o recebeu"); }
}
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
      note(ruler, e.week, `foi deposto por um golpe do general ${gen.name}`); closeOffice(ruler, "Governante", e.week, `deposto por golpe de ${gen.name}`); exile(w, e, ruler, k);
      gen.coup = true; enthrone(w, e, k, gen, "tomou o poder num golpe"); ctry.politics.legitimacy = Math.max(0, ctry.politics.legitimacy - 0.1);
      return;
    }
    // agitador: aparece quando muita gente está radical; some quando o movimento esfria
    let agit = (e.characters ?? []).find((c) => c.role === "Agitador" && c.country === k && !c.dead && !c.gone);
    if (!agit && ctry.radicals > AGITATION.appear) {
      agit = newCharacter(w, e, k, e.week * 5 + k);
      agit.role = "Agitador"; agit.personality = ["Populista", "Idealista", "Inspirador", "Implacável"][agit.id % 4];
      note(agit, agit.born, `nasceu em §${k}§`); note(agit, e.week, `${WEEKDAYS[dayOf(e.week, agit.id)]}: passou a liderar os descontentes de §${k}§`);
      openOffice(agit, "Agitador político", k, e.week, `radicais em ${Math.round(ctry.radicals * 100)}% da população`);
      (e.characters ??= []).push(agit);
    } else if (agit && ctry.radicals < AGITATION.fade) {
      agit.gone = true; agit.role = undefined; closeOffice(agit, "Agitador político", e.week, "o movimento se dispersou"); note(agit, e.week, "deixou a vida pública: o movimento esfriou");
      agit = undefined;
    }
    // revolução: radicais demais e governo sem legitimidade; o agitador toma o poder, o governante vai para o exílio
    if (agit && ctry.radicals > AGITATION.revolt && ctry.politics.legitimacy < AGITATION.legitimacy && dayOf(e.week, agit.id) === 0) {
      note(ruler, e.week, `foi derrubado pela revolução de ${agit.name}`); closeOffice(ruler, "Governante", e.week, `derrubado pela revolução de ${agit.name}`);
      exile(w, e, ruler, k);
      closeOffice(agit, "Agitador político", e.week, "a revolução venceu");
      agit.role = undefined; agit.revolution = true; enthrone(w, e, k, agit, "liderou a revolução e tomou o governo");
      ctry.politics.legitimacy = AGITATION.newLegitimacy;
      return;
    }
    if (ctry.heirWaiting !== undefined) { // regência acaba na maioridade do herdeiro (ou se ele morrer)
      const heir = e.characters?.find((x) => x.id === ctry.heirWaiting);
      if (!heir || heir.dead) ctry.heirWaiting = undefined;
      else if (ageOf(heir, e.week) >= FAMILY.majority) {
        closeOffice(ruler, "Regente", e.week, `${heir.name} atingiu a maioridade`); note(ruler, e.week, `entregou o governo a ${heir.name}`);
        ctry.heirWaiting = undefined; heir.parent = undefined;
        enthrone(w, e, k, heir, "assumiu o governo ao atingir a maioridade");
        return;
      }
    }
    family(w, e, ruler, k);
    const sr = ctry.stateReligion; // governante de outra fé perde legitimidade; devoto da fé do Estado ganha um pouco
    if (sr !== undefined && ruler.religion !== undefined) ctry.politics.legitimacy = Math.max(0, Math.min(1, ctry.politics.legitimacy + (ruler.religion !== sr ? -FAMILY.otherFaith : ruler.traits.includes("Devoto") ? FAMILY.devout : 0)));
    if (e.week < ruler.dies) return;
    ruler.dead = true;
    note(ruler, e.week, `morreu aos ${ageOf(ruler, e.week)} anos`); closeOffice(ruler, "Governante", e.week, "morte"); closeOffice(ruler, "Regente", e.week, "morte");
    chronicle(e, "morte", `morre ${ruler.name}, que governava §${k}§, aos ${ageOf(ruler, e.week)} anos`, [k], [ruler.id], 2);
    deaths.push(ruler);
    const gov = lawOf(ctry.politics, "Governo").name;
    if (gen && (gov === "República" ? skill(gen, "dip") >= 50 : ambitious(gen) || gen.traits.includes("Herói de guerra"))) { // o herói das batalhas assume (e segue general)
      enthrone(w, e, k, gen, gov === "República" ? "eleito para governar, depois das vitórias" : "assumiu o governo com o apoio das tropas");
      return;
    }
    const heir = HEREDITARY.includes(gov) ? (ruler.heirs ?? []).map((id) => e.characters?.find((x) => x.id === id)).filter((h): h is Character => !!h && !h.dead && !h.gone).sort((a, b) => a.born - b.born)[0] : undefined;
    if (heir && ageOf(heir, e.week) < FAMILY.majority) { // criança: regente governa até a maioridade
      const sp = ruler.spouse !== undefined ? e.characters?.find((x) => x.id === ruler.spouse && !x.dead) : undefined;
      const regent = sp ?? newCharacter(w, e, k, e.week * 17 + k);
      if (!sp) { note(regent, regent.born, `nasceu em §${k}§`); (e.characters ??= []).push(regent); }
      ctry.heirWaiting = heir.id;
      enthrone(w, e, k, regent, `governa como regente de ${heir.name}`, "Regente");
      return;
    }
    if (heir) { heir.parent = undefined; enthrone(w, e, k, heir, `herdou o governo de ${ruler.female ? "sua mãe" : "seu pai"}, ${ruler.name},`); return; }
    crown(w, e, k, gov === "República" ? "eleito para governar" : gov === "Teocracia" ? "escolhido pelo clero para governar" : gov === "Partido único" ? "escolhido pelo partido para comandar" : "herdou o governo");
  });
  // morto só continua guardado se o jogador guardou na história (o livro dele)
  for (const c of e.characters ?? []) if (c.role === "Diplomata" && !c.dead && e.week >= c.dies) { c.dead = true; note(c, e.week, `morreu aos ${ageOf(c, e.week)} anos`); closeOffice(c, "Diplomata", e.week, "morte"); e.countries[c.country - 1].diplomat = undefined; }
  for (const c of e.characters ?? []) if ((c.exiledTo || c.gone) && !c.dead && e.week >= c.dies) { c.dead = true; note(c, e.week, `morreu aos ${ageOf(c, e.week)} anos${c.exiledTo ? ` no exílio, em §${c.exiledTo}§` : ""}`); closeOffice(c, "Exilado", e.week, "morte"); }
  const rulers = new Set([...e.countries.map((x) => x.ruler), ...e.countries.map((x) => x.heirWaiting)]);
  e.characters = (e.characters ?? []).filter((c) => (!c.dead || c.saved) && (c.saved || c.role || c.command || rulers.has(c.id) || c.exiledTo || c.gone || !kinOnly(e, c, rulers)));
  return deaths;
}
