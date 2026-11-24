// Uma semana de jogo, igual em todo lugar: single-player, servidor e cada navegador do multiplayer.
// Tem que ser determinística: nada de Math.random, relógio ou estado fora de `w`/`e`.
import { tick, refresh, type Economy } from "./economy.ts";
import { stepWar } from "./war.ts";
import { runAI, clearFounded } from "./ai.ts";
import type { World } from "./world.ts";
import { stepEvents } from "./events.ts";
import { stepChoices } from "./choices.ts";
import { recordHistory } from "./history.ts";

export function advanceWeek(w: World, e: Economy) {
  tick(w, e);
  e.news = stepEvents(w, e);
  stepChoices(w, e);
  recordHistory(e);
  stepWar(w, e);
  // cada país pensa uma vez por mês, em semanas alternadas: com centenas de tribos o custo não cai todo numa semana só
  for (let k = 1; k <= e.countries.length; k++) if ((k + e.week) % 4 === 0 && !e.humans.includes(k)) runAI(w, e, k);
  if (clearFounded()) refresh(w, e);
}

/** Resumo numérico da partida para conferir se dois computadores estão iguais. */
export function checksum(e: Economy) {
  let s = e.week * 7 + e.cities.length * 131 + e.divisions.length * 17;
  for (const c of e.countries) s = (s * 31 + Math.round(c.treasury * 100) + Math.round(c.pop * 10) + Math.round(c.debt * 100)) % 2147483647;
  for (const d of e.divisions) s = (s * 31 + d.hex + Math.round(d.strength * 100)) % 2147483647;
  return s;
}
