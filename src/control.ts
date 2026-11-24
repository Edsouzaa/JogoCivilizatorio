// Controle (estilo EU5): quanto o governo realmente administra cada hex, de 0 a 1.
// O máximo vem da proximidade de uma sede (capital ou a primeira cidade de cada estado, o "governador");
// o atual anda devagar até o máximo. Pouco controle = menos imposto, menos produção no mercado e menos recrutas.
import { hexDistance } from "./hex.ts";
import type { World } from "./world.ts";
import { RULES, type Economy } from "./economy.ts"; // RULES só é lido dentro das funções (import circular)
import { hasIncentive } from "./admin.ts";
import { EXPAND } from "./expansion.ts";
const INTEGRATION = 0.25; // incentivo "Integração": + controle máximo

export const CONTROL = {
  rangeBase: 6,      // a até tantos hexes da sede o controle máximo ainda é > 0 (mais por era)...
  rangePerEra: 3,
  min: 0.1,          // ...e nunca cai abaixo disto em território próprio
  risePerMonth: 0.04, // o atual sobe isto por mês até o máximo (≈ 2 anos de 0 a 100%)
  market: 0.5,       // produção que chega ao mercado = (1 − market) + market × controle
};

/** Sedes administrativas do país: capital e a primeira cidade de cada estado. */
export function seats(w: World, e: Economy, country: number) {
  const s = [w.countries[country - 1].capital];
  for (const st of e.states) if (st.country === country) { const k = e.cities.find((c) => c.state === st.id); if (k) s.push(k.hex); }
  return s;
}

/** Controle máximo do hex pela distância até a sede mais perto. */
export function maxControl(w: World, e: Economy, i: number, seatsOf: number[]) {
  const country = w.owner[i];
  if (!country) return 0;
  const range = CONTROL.rangeBase + CONTROL.rangePerEra * e.countries[country - 1].research.era;
  let d = Infinity;
  for (const s of seatsOf) d = Math.min(d, hexDistance(i % w.W, (i / w.W) | 0, s % w.W, (s / w.W) | 0, w.W));
  return Math.max(CONTROL.min, Math.min(1, 1 - d / range));
}

/** Uma vez por mês: o controle anda até o máximo (ocupado pelo inimigo cai a zero). `start` = já começa no máximo. */
export function updateControl(w: World, e: Economy, start = false) {
  const cache = new Map<number, number[]>();
  for (const i of e.owned) {
    const c = w.owner[i];
    if (!cache.has(c)) cache.set(c, seats(w, e, c));
    const k = e.market[i] - 1;
    const integ = k >= 0 ? (hasIncentive(e, k, "Integração") ? INTEGRATION : 0) + RULES.roadControl * (e.cities[k].road ?? 0) : 0;
    const iso = k >= 0 && e.cities[k].isolated ? EXPAND.isolation : 1; // cidade sem ligação com a capital: difícil de administrar
    const max = e.occupier[i] ? 0 : Math.min(1, (maxControl(w, e, i, cache.get(c)!) + integ) * iso);
    e.control[i] = start ? max : e.control[i] > max ? max : Math.min(max, e.control[i] + CONTROL.risePerMonth);
  }
}
