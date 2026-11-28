// Crônica: registro central de acontecimentos. Cada fato entra uma vez; personagens e países guardam só a referência
// (o id no campo c ou k), e o livro e a interface consultam daqui. Datas: semana do jogo + dia da semana fixo pelo fato.
import type { Economy } from "./economy.ts";

export type EvType = "batalha" | "guerra" | "paz" | "tratado" | "lei" | "governo" | "golpe" | "revolução" | "morte" | "fundação" | "conquista" | "exílio" | "família";
/** w = semana, d = dia (0 = segunda), k = países, c = personagens, x = texto (§k§ = nome do país), imp = importância 1–5. */
export type Ev = { id: number; w: number; d: number; t: EvType; k: number[]; c: number[]; x: string; imp: number };
export const CHRONICLE = { max: 6000, keepImp: 3 }; // passou do máximo: some o mais antigo de importância baixa

const dayOf = (week: number, salt: number) => (((Math.imul(week + 1, 2654435761) ^ Math.imul(salt + 7, 40503)) >>> 0) % 7);
export function chronicle(e: Economy, t: EvType, x: string, k: number[], c: number[] = [], imp = 1): Ev {
  const ev: Ev = { id: (e.nextEvent = (e.nextEvent ?? 0) + 1), w: e.week, d: dayOf(e.week, (e.nextEvent ?? 0) + x.length), t, k: [...new Set(k)].filter(Boolean), c: [...new Set(c)].filter((v) => v !== undefined), x, imp };
  const list = (e.chronicle ??= []);
  list.push(ev);
  if (list.length > CHRONICLE.max) { const i = list.findIndex((v) => v.imp < CHRONICLE.keepImp); list.splice(i >= 0 ? i : 0, 1); }
  return ev;
}
export const eventsOfCharacter = (e: Economy, id: number) => (e.chronicle ?? []).filter((v) => v.c.includes(id));
export const eventsOfCountry = (e: Economy, k: number) => (e.chronicle ?? []).filter((v) => v.k.includes(k));
