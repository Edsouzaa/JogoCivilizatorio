import { spend } from "./eramods.ts";
// Construção naval (Etapa 6): estaleiros fazem pontos navais (PN) e navios saem de uma fila própria, separada das obras.
//   Doca (Galés): embarcações pequenas e primitivas.   Estaleiro (Navegação): navios oceânicos, de linha e de transporte.
//   Arsenal naval (Eletricidade): couraçados, submarinos e porta-aviões.
// Os estaleiros são indústrias urbanas em hex colado no mar: compram os materiais no mercado da cidade (madeira, velas,
// ferro, aço...) e geram PN para a fila da própria cidade. O dinheiro do navio sai aos poucos com o progresso;
// os marinheiros saem do manpower quando o navio fica pronto (sem gente, ele espera no cais).
import { BUILDINGS, type Economy } from "./economy.ts";
import { buildFleet, coastOf, NAVY } from "./war.ts";
import { SHIPS } from "./units.ts";
import type { World } from "./world.ts";

/** Nível do estaleiro que cada navio exige (1 = doca, 2 = estaleiro, 3 = arsenal naval). */
export const SHIP_YARD: Record<string, number> = { "Galés": 1, "Caravelas": 2, "Navios de linha": 2, "Couraçados": 3, "Submarinos": 3, "Porta-aviões": 3 };
export const YARDS = ["Doca", "Estaleiro", "Arsenal naval"] as const;
export const NAVAL = {
  pointsPerCost: 25, // PN de um navio = isto × custo relativo do navio (Galés 25, Porta-aviões 100)
  queueMax: 20,      // navios na fila por país
};

export type ShipOrder = { id: number; country: number; city: number; ship: string; np: number; done: number; cost: number; paid: number; waiting?: string };

/** Maior estaleiro da cidade (0 = nenhum): o tipo mais avançado com nível em algum centro urbano. */
export function yardTier(e: Economy, city: number) {
  const k = e.cities[city];
  let tier = 0;
  YARDS.forEach((name, t) => { const b = BUILDINGS.findIndex((x) => x.name === name); if (k?.urban.some((j) => e.levels[b][j])) tier = t + 1; });
  return tier;
}
export const navalQueueOf = (e: Economy, country: number) => (e.naval ?? []).filter((o) => o.country === country);

/** Encomenda um navio no estaleiro da cidade. */
export function orderShip(w: World, e: Economy, country: number, city: number, ship: string): string | null {
  const k = e.cities[city], sh = SHIPS.find((x) => x.name === ship), c = e.countries[country - 1];
  if (!k || k.country !== country) return "Cidade não é sua";
  if (!sh) return "Tipo de navio desconhecido";
  if (!c.research.known.has(sh.tech)) return `Precisa pesquisar ${sh.tech}`;
  if (!k.urban.some((j) => coastOf(w, j) >= 0)) return "A cidade não fica no litoral";
  const need = SHIP_YARD[sh.name] ?? 1;
  if (yardTier(e, city) < need) return `Precisa de ${YARDS[need - 1]} na cidade`;
  if (navalQueueOf(e, country).length >= NAVAL.queueMax) return "Fila naval cheia";
  (e.naval ??= []).push({ id: (e.nextNaval = (e.nextNaval ?? 0) + 1), country, city, ship, np: Math.round(NAVAL.pointsPerCost * sh.cost), done: 0, cost: Math.round(NAVY.cost * sh.cost), paid: 0 });
  return null;
}
export function cancelShip(e: Economy, country: number, id: number): string | null {
  const o = e.naval?.find((x) => x.id === id);
  if (!o || o.country !== country) return "Encomenda não é sua";
  e.naval = e.naval!.filter((x) => x !== o);
  return null;
}

/** Uma vez por semana, depois da produção (cada cidade já somou os PN dos estaleiros em navalWeek). */
export function stepNaval(w: World, e: Economy) {
  const done: ShipOrder[] = [];
  e.cities.forEach((k, ci) => {
    let pool = k.navalWeek ?? 0;
    for (const o of (e.naval ?? []).filter((x) => x.city === ci)) {
      if (o.country !== k.country) { o.waiting = "cidade perdida"; continue; }
      const c = e.countries[o.country - 1];
      if (o.done >= o.np) { // pronto: falta tripulação
        if (c.manpower >= NAVY.sailors) done.push(o); else o.waiting = "sem marinheiros";
        continue;
      }
      let give = Math.min(pool, o.np - o.done);
      if (give <= 0) { o.waiting = yardTier(e, ci) ? "sem capacidade" : "sem estaleiro"; continue; }
      let pay = (o.cost * give) / o.np;
      const got = spend(c, pay); give *= got; pay *= got;
      if (give <= 1e-9) { o.waiting = "sem dinheiro"; continue; }
      o.paid += pay; o.done += give; pool -= give; o.waiting = undefined;
      if (o.done >= o.np - 1e-9) { if (c.manpower >= NAVY.sailors) done.push(o); else o.waiting = "sem marinheiros"; }
    }
    k.navalWeek = 0;
  });
  for (const o of done) {
    const k = e.cities[o.city], port = k.urban.find((j) => coastOf(w, j) >= 0);
    if (port === undefined) continue;
    const c = e.countries[o.country - 1], price = Math.round(NAVY.cost * (SHIPS.find((x) => x.name === o.ship)?.cost ?? 1));
    c.treasury += price; // buildFleet cobra o navio inteiro: devolve antes, porque ele já foi pago aos poucos
    if (!buildFleet(w, e, o.country, port, o.ship)) e.naval = e.naval!.filter((x) => x !== o);
    else { c.treasury -= price; o.waiting = "não pôde zarpar"; }
  }
}
