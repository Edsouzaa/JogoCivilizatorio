// Dependências políticas: um país (súdito) ligado a outro (soberano), com autonomia de 0 a 100.
//   Tributário: paga tributo, resto livre.         Vassalo: paga e entra nas guerras do soberano.
//   Fantoche: paga mais, entra nas guerras e não pode fazer acordos sozinho.   Protetorado: não paga; o protetor entra nas guerras dele.
// A autonomia anda todo mês (soberano forte e querido segura; fraco e odiado perde). Em 100 o súdito se solta.
import type { Economy } from "./economy.ts";
import { relation, addRelation, prestige } from "./diplomacy.ts";

export const SUBJECT_KINDS = {
  "Tributário": { tribute: 0.15, joinsWars: false, protectedBy: false, relationMin: 20, desc: "Paga 15% da renda; política externa livre." },
  "Vassalo": { tribute: 0.1, joinsWars: true, protectedBy: true, relationMin: 40, desc: "Paga 10% e luta nas guerras do soberano, que também o defende." },
  "Fantoche": { tribute: 0.2, joinsWars: true, protectedBy: true, relationMin: 60, desc: "Governo controlado: paga 20%, luta junto e não assina acordos sozinho." },
  "Protetorado": { tribute: 0, joinsWars: false, protectedBy: true, relationMin: 30, desc: "Não paga; o protetor entra nas guerras contra ele." },
} as const;
export type SubjectKind = keyof typeof SUBJECT_KINDS;
export type Subject = { overlord: number; kind: SubjectKind; autonomy: number };

export const SUBJ = {
  prestigeRatio: 1.5, // soberano precisa de 1,5× o prestígio do súdito para propor
  autonomyStart: 40,
  autonomyMonth: 2,   // quanto anda por mês até o alvo
  free: 100,          // autonomia em que o súdito se solta sozinho
  breakRelation: -40, // relação que fica quando um súdito se solta ou rompe
};

export const subjectOf = (e: Economy, k: number) => e.subjects?.[k];
export const subjectsOf = (e: Economy, overlord: number) => Object.entries(e.subjects ?? {}).filter(([, s]) => s.overlord === overlord).map(([k, s]) => [+k, s] as const);

/** Proposta de dependência: o outro aceita se o proponente for bem mais forte e a relação bastar. */
export function proposeSubject(e: Economy, overlord: number, target: number, kind: SubjectKind): string | null {
  const def = SUBJECT_KINDS[kind];
  if (!def || overlord === target || !e.countries[target - 1]) return "Proposta inválida";
  // shortcut: jogador não pode ser posto como súdito sem aceitar; falta a tela de aceite, então por ora é recusado
  if (e.humans.includes(target)) return "Esse país é de um jogador: ele teria que aceitar (ainda não dá)";
  if (e.subjects?.[target]) return "Esse país já é súdito de alguém";
  if (e.subjects?.[overlord]) return "Um súdito não pode ter súditos";
  if (prestige(e, overlord) < SUBJ.prestigeRatio * prestige(e, target)) return `Recusado: seu prestígio precisa ser ${SUBJ.prestigeRatio}× o deles`;
  if (relation(e, overlord, target) < def.relationMin) return `Recusado: relação precisa ser pelo menos ${def.relationMin}`;
  (e.subjects ??= {})[target] = { overlord, kind, autonomy: SUBJ.autonomyStart };
  return null;
}

/** Libertação: o soberano solta, ou o súdito rompe (piora muito a relação). */
export function releaseSubject(e: Economy, target: number, byOverlord: boolean) {
  const s = e.subjects?.[target];
  if (!s) return "Não é súdito";
  if (!byOverlord) addRelation(e, s.overlord, target, SUBJ.breakRelation);
  delete e.subjects![target];
  return null;
}

/** Tributo da semana: sai da renda do súdito e entra no tesouro do soberano. */
export function payTribute(e: Economy) {
  for (const [k, s] of Object.entries(e.subjects ?? {})) {
    const c = e.countries[+k - 1], o = e.countries[s.overlord - 1];
    const t = Math.max(0, c.income) * SUBJECT_KINDS[s.kind].tribute * (1 - s.autonomy / 200); // mais autonomia, menos tributo
    c.treasury -= t; o.treasury += t;
    c.tributeWeek = -t; o.tributeWeek = (o.tributeWeek ?? 0) + t;
  }
}

/** Uma vez por mês: autonomia anda; quem chega a 100 se solta. Devolve os que se soltaram (para avisar). */
export function stepSubjects(e: Economy) {
  const freed: number[] = [];
  for (const [k, s] of Object.entries(e.subjects ?? {})) {
    const ratio = prestige(e, s.overlord) / Math.max(1, prestige(e, +k));
    const target = Math.max(0, Math.min(100, 70 - 15 * ratio - relation(e, s.overlord, +k) / 4)); // forte e querido: baixa
    s.autonomy += Math.sign(target - s.autonomy) * Math.min(SUBJ.autonomyMonth, Math.abs(target - s.autonomy));
    if (s.autonomy >= SUBJ.free) { releaseSubject(e, +k, false); freed.push(+k); }
  }
  return freed;
}

/** Guerra declarada (a contra b): súditos que lutam junto entram; protetores de b entram contra a. Devolve pares novos. */
export function warAllies(e: Economy, a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  for (const [k, s] of Object.entries(e.subjects ?? {})) {
    const def = SUBJECT_KINDS[s.kind];
    if (def.joinsWars && s.overlord === a && +k !== b) out.push([+k, b]);
    if (def.joinsWars && s.overlord === b && +k !== a) out.push([a, +k]);
    if (def.protectedBy && +k === b && s.overlord !== a) out.push([a, s.overlord]); // protetor defende o súdito atacado
  }
  return out;
}
