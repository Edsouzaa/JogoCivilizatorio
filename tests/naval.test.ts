import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, canBuild, BUILDINGS } from "../src/economy.ts";
import { coastOf, NAVY } from "../src/war.ts";
import { orderShip, stepNaval, navalQueueOf, yardTier, cancelShip } from "../src/naval.ts";

// acha um mapa com capital no litoral
let w = generateWorld(200, 100, 4, 6), e = createEconomy(w);
for (let seed = 5; seed < 40 && !e.cities.some((c) => c.urban.some((j) => coastOf(w, j) >= 0)); seed++) { w = generateWorld(200, 100, seed, 6); e = createEconomy(w); }
const ci = e.cities.findIndex((c) => c.urban.some((j) => coastOf(w, j) >= 0)), city = e.cities[ci], A = city.country, c = e.countries[A - 1];
const port = city.urban.find((j) => coastOf(w, j) >= 0)!;
const dock = BUILDINGS.findIndex((b) => b.name === "Doca");

// sem tecnologia, sem estaleiro: nada
assert.match(orderShip(w, e, A, ci, "Galés")!, /Galés/);
c.research.known.add("Galés");
assert.match(orderShip(w, e, A, ci, "Galés")!, /Doca/);
assert.equal(canBuild(w, e, port, dock), null, "doca cabe no hex do porto");
const inland = e.cities.flatMap((k) => k.urban).find((j) => coastOf(w, j) < 0 && e.urban[j]);
if (inland !== undefined) assert.match(canBuild(w, e, inland, dock) ?? "", /mar|pesquisar/);
e.levels[dock][port] = 1;
assert.equal(yardTier(e, ci), 1);
// doca não faz navio oceânico
c.research.known.add("Navegação");
assert.match(orderShip(w, e, A, ci, "Caravelas")!, /Estaleiro/);
// encomenda: anda com os pontos navais da cidade, paga aos poucos e vira frota no fim
assert.equal(orderShip(w, e, A, ci, "Galés"), null);
const o = navalQueueOf(e, A)[0];
c.treasury = 1e4; c.manpower = 1e4;
city.navalWeek = o.np / 2; stepNaval(w, e);
assert.ok(o.done > 0 && o.done < o.np && c.treasury < 1e4, "metade feita e paga");
const fleets = e.divisions.filter((d) => d.kind === "fleet" && d.country === A).length;
city.navalWeek = o.np; stepNaval(w, e);
assert.equal(e.divisions.filter((d) => d.kind === "fleet" && d.country === A).length, fleets + 1, "navio pronto vira frota");
assert.equal(navalQueueOf(e, A).length, 0);
assert.ok(Math.abs(c.treasury - (1e4 - o.cost)) < 1e-6, "custo total pago uma vez só");
assert.equal(c.manpower, 1e4 - NAVY.sailors);
// sem marinheiros, o navio pronto espera no cais
assert.equal(orderShip(w, e, A, ci, "Galés"), null);
c.manpower = 0; city.navalWeek = 1e3; stepNaval(w, e);
assert.equal(navalQueueOf(e, A)[0].waiting, "sem marinheiros");
assert.equal(cancelShip(e, A, navalQueueOf(e, A)[0].id), null);
console.log("naval ok");
