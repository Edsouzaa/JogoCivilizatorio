// Propostas para países de jogador: em vez de valer na hora, ficam esperando o outro aceitar ou recusar.
// (País da IA decide sozinho pelas regras de cada proposta.)
import { proposePact, type Economy } from "./economy.ts";
import { proposeSubject, type SubjectKind } from "./subjects.ts";

export type Proposal = { id: number; from: number; to: number; kind: "pact" | "subject"; subject?: SubjectKind; week: number };
export const PROPOSAL_WEEKS = 8; // sem resposta nesse tempo, a proposta vence

export const proposalsTo = (e: Economy, k: number) => (e.proposals ?? []).filter((p) => p.to === k && e.week - p.week <= PROPOSAL_WEEKS);

/** Guarda a proposta (uma por par e tipo). */
export function addProposal(e: Economy, p: Omit<Proposal, "id" | "week">): string | null {
  const list = (e.proposals ??= []);
  if (list.some((x) => x.from === p.from && x.to === p.to && x.kind === p.kind)) return "Já existe uma proposta igual esperando resposta";
  list.push({ ...p, id: (e.nextProposal = (e.nextProposal ?? 0) + 1), week: e.week });
  return null;
}

/** O destinatário responde. Aceitar aplica (com as mesmas regras de sempre, menos o bloqueio "é jogador"). */
export function respond(e: Economy, to: number, id: number, accept: boolean): string | null {
  const p = (e.proposals ?? []).find((x) => x.id === id && x.to === to);
  if (!p) return "Proposta não encontrada";
  e.proposals = e.proposals!.filter((x) => x !== p);
  if (!accept) return null;
  if (e.week - p.week > PROPOSAL_WEEKS) return "Proposta vencida";
  return p.kind === "pact" ? proposePact(e, p.from, p.to) : proposeSubject(e, p.from, p.to, p.subject!, true);
}

/** Tira as vencidas (uma vez por mês). */
export const expireProposals = (e: Economy) => {
  e.proposals = (e.proposals ?? []).filter((p) => e.week - p.week <= PROPOSAL_WEEKS);
  e.votes = (e.votes ?? []).filter((v) => e.week - v.week <= PROPOSAL_WEEKS);
};

/** Votação entre jogadores (multiplayer): hoje para nome de continente. Passa com mais da metade dos jogadores. */
export type Vote = { id: number; continent: number; name: string; yes: number[]; no: number[]; week: number };

export function startVote(e: Economy, from: number, continent: number, name: string): string | null {
  const v: Vote = { id: (e.nextProposal = (e.nextProposal ?? 0) + 1), continent, name, yes: [from], no: [], week: e.week };
  (e.votes ??= []).push(v);
  return castVote(e, from, v.id, true);
}

/** Registra o voto e resolve se já há maioria (sim aplica o nome; não descarta). */
export function castVote(e: Economy, who: number, id: number, yes: boolean, rename?: (continent: number, name: string) => void): string | null {
  const v = (e.votes ?? []).find((x) => x.id === id);
  if (!v) return "Votação não encontrada";
  if (!e.humans.includes(who)) return "Só jogadores votam";
  v.yes = v.yes.filter((x) => x !== who); v.no = v.no.filter((x) => x !== who);
  (yes ? v.yes : v.no).push(who);
  const half = e.humans.length / 2;
  if (v.yes.length > half) { rename?.(v.continent, v.name); e.votes = e.votes!.filter((x) => x !== v); }
  else if (v.no.length >= half) e.votes = e.votes!.filter((x) => x !== v);
  return null;
}
