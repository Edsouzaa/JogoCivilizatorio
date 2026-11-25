// Disputa de navegação: quem tem a foz de um rio navegável pode fechá-lo ao comércio dos outros países.
// Cidades estrangeiras nesse rio perdem o bônus de porto fluvial e a ligação por água (podem ficar isoladas)
// e passam a gostar menos de quem fechou. Quem perde a foz perde o fechamento.
import { forNeighbors } from "./hex.ts";
import { T, type World } from "./world.ts";
import type { Economy } from "./economy.ts";
import { addRelation } from "./diplomacy.ts";

export const NAV = { relationMonth: -1 }; // relação por mês de cada país prejudicado com quem fechou

const mouthCache = new WeakMap<World, Map<number, number[]>>(); // o mapa não muda durante o jogo
/** Hexes da foz: trechos do rio que encostam no mar ou num lago. */
export function riverMouths(w: World, river: number) {
  let all = mouthCache.get(w);
  if (!all) {
    mouthCache.set(w, (all = new Map()));
    w.riverOf?.forEach((r, i) => {
      if (!r) return;
      let wet = false;
      forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (w.terrain[j] === T.OCEAN) wet = true; });
      if (wet) { const list = all!.get(r) ?? []; list.push(i); all!.set(r, list); }
    });
  }
  return all.get(river) ?? [];
}
export const holdsMouth = (w: World, country: number, river: number) => riverMouths(w, river).some((h) => w.owner[h] === country);
/** Países (além do dono) com cidade no rio: os prejudicados quando ele fecha. */
export const riverUsers = (e: Economy, river: number, except: number) => [...new Set(e.cities.filter((c) => c.river === river && c.country !== except).map((c) => c.country))];

/** Fecha ou reabre o rio ao comércio dos outros. Só quem tem a foz. */
export function toggleRiver(w: World, e: Economy, country: number, river: number): string | null {
  if (!w.rivers?.[river - 1]) return "Rio inválido";
  const cur = e.closedRivers?.[river];
  if (cur === country) { delete e.closedRivers![river]; return null; }
  if (cur) return "Outro país já fechou este rio";
  if (!holdsMouth(w, country, river)) return "Só quem controla a foz pode fechar o rio";
  (e.closedRivers ??= {})[river] = country;
  return null;
}

/** Uma vez por mês: fechamento cai se o dono perdeu a foz; os prejudicados gostam menos dele. */
export function stepRivers(w: World, e: Economy) {
  for (const [r, k] of Object.entries(e.closedRivers ?? {})) {
    if (!e.countries[k - 1] || !holdsMouth(w, k, +r)) { delete e.closedRivers![+r]; continue; }
    for (const u of riverUsers(e, +r, k)) addRelation(e, u, k, NAV.relationMonth);
  }
}
