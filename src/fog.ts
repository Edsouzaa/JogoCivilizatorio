// Névoa de guerra (estilo Civ) do ponto de vista de um país.
// Visível agora: território próprio + 1 hex de margem, 3 hexes em volta das cidades, 2 em volta das unidades.
// Explorado: tudo que já foi visível alguma vez (fica escurecido, sem mostrar unidades).
import { hexesInRadius } from "./hex.ts";
import { across, type World } from "./world.ts";
import type { Economy } from "./economy.ts";

export const FOG = { border: 1, city: 3, unit: 2 };

/** Marca em `visible` (zerado aqui) o que `country` vê agora e soma isso em `explored`. */
export function updateFog(w: World, e: Economy, country: number, explored: Uint8Array, visible: Uint8Array) {
  visible.fill(0);
  const see = (i: number, r: number) => { for (const j of hexesInRadius(i, r, w.W, w.H)) visible[j] = 1; };
  for (const i of e.owned) if (w.owner[i] === country) see(i, FOG.border);
  for (const c of e.cities) if (c.country === country) see(c.hex, FOG.city);
  for (const d of e.divisions) if (d.country === country) see(d.hex, FOG.unit);
  for (let i = 0; i < visible.length; i++) if (visible[i]) explored[i] = 1;
}

/**
 * Monta a textura de dados do shader (ver render.ts): R = névoa + bit "tem dono", G = clima, B = rios, A = navegáveis.
 * Sem país (fog = null) tudo fica visível.
 */
export function buildInfo(w: World, out: Uint8Array, explored: Uint8Array | null, visible: Uint8Array | null) {
  for (let i = 0; i < w.W * w.H; i++) {
    const fog = !explored ? 2 : visible![i] ? 2 : explored[i] ? 1 : 0;
    out[i * 4] = fog | (w.owner[i] ? 128 : 0);
    out[i * 4 + 1] = w.climate[i];
    out[i * 4 + 2] = w.river[i];
    out[i * 4 + 3] = w.navigable[i];
  }
  return out;
}

/**
 * Fronteiras por borda do hex (ver `across` em world.ts): R = bits 0–5 de fronteira de país (dono diferente
 * do vizinho, com pelo menos um dos dois tendo dono); G = bits 0–5 de fronteira de estado (mesmo país,
 * cidades de estados diferentes — "sem estado" conta como um estado à parte).
 */
export function buildBorders(w: World, e: Economy, out: Uint8Array) {
  const stateOf = (i: number) => (e.market[i] ? e.cities[e.market[i] - 1].state ?? 0 : 0);
  out.fill(0);
  // só os hexes com dono: cada borda é marcada dos dois lados (o vizinho sem dono também ganha a linha)
  for (const i of e.owned) {
    const o = w.owner[i], s = stateOf(i);
    for (let k = 0; k < 6; k++) {
      const n = across(w.W, w.H, i, k);
      if (n < 0) continue;
      if (w.owner[n] !== o) { out[i * 4] |= 1 << k; out[n * 4] |= 1 << ((k + 3) % 6); }
      else if (e.states.length && stateOf(n) !== s) out[i * 4 + 1] |= 1 << k;
    }
  }
  return out;
}
