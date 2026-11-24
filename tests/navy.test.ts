import assert from "node:assert/strict";
import { createEconomy, foundCity, type Economy } from "../src/economy.ts";
import { buildFleet, orderMove, stepWar, declareWar, recruit, coastOf, homePort, NAVY } from "../src/war.ts";
import { generateWorld, T, type World } from "../src/world.ts";
import { hexDistance } from "../src/hex.ts";

const w: World = generateWorld(400, 200, 5, 20), e: Economy = createEconomy(w);
// dois países com litoral: os colonos dos países 1 e 2 fundam uma cidade costeira
const [A, B] = [1, 2];
for (const c of [A, B]) {
  const settler = e.divisions.find((d) => d.kind === "settler" && d.country === c)!;
  for (let i = 0; i < w.W * w.H; i++) {
    if (w.owner[i] || w.terrain[i] === T.OCEAN || w.terrain[i] === T.ICE || coastOf(w, i) < 0) continue;
    if (e.cities.some((k) => hexDistance(i % w.W, (i / w.W) | 0, k.hex % w.W, (k.hex / w.W) | 0, w.W) < 6)) continue;
    settler.hex = i;
    if (foundCity(w, e, settler.id) === null) break;
  }
  assert.ok(homePort(w, e, c) >= 0, `país ${c} sem litoral`);
}
for (const c of e.countries) { c.manpower = 1e4; c.treasury = 1e5; }
const cityA = e.cities.find((k) => k.country === A && k.urban.some((j) => coastOf(w, j) >= 0))!, coastHexA = cityA.urban.find((j) => coastOf(w, j) >= 0)!;

// frota precisa da tecnologia e de litoral
assert.match(buildFleet(w, e, A, coastHexA)!, /Galés/);
e.countries[A - 1].research.known.add(NAVY.tech);
e.countries[B - 1].research.known.add(NAVY.tech);
assert.equal(buildFleet(w, e, A, coastHexA), null);
const fleet = e.divisions.find((d) => d.kind === "fleet" && d.country === A)!;
assert.equal(w.terrain[fleet.hex], T.OCEAN);

// frota só anda no mar, e até NAVY.speed hexes por semana
assert.match(orderMove(w, e, fleet.id, cityA.hex)!, /mar/);
const zone = w.seaZone[fleet.hex];
let far = -1;
for (let i = 0; i < w.W * w.H; i++) if (w.seaZone[i] === zone && hexDistance(i % w.W, (i / w.W) | 0, fleet.hex % w.W, (fleet.hex / w.W) | 0, w.W) >= 8) { far = i; break; }
assert.ok(far >= 0);
const start = fleet.hex;
assert.equal(orderMove(w, e, fleet.id, far), null);
stepWar(w, e);
const moved = hexDistance(fleet.hex % w.W, (fleet.hex / w.W) | 0, start % w.W, (start / w.W) | 0, w.W);
assert.ok(moved >= 2 && moved <= NAVY.speed, `frota andou ${moved} hexes`);
assert.equal(w.terrain[fleet.hex], T.OCEAN);
fleet.target = null;

// exército só entra no mar com frota própria na zona
assert.equal(recruit(w, e, A, cityA.hex), null);
const army = e.divisions.find((d) => d.kind === "army" && d.country === A)!;
assert.equal(orderMove(w, e, army.id, fleet.hex), null); // tem frota nessa zona
const otherZone = [...Array(w.W * w.H).keys()].find((i) => w.terrain[i] === T.OCEAN && w.seaZone[i] !== zone)!;
// mar sem frota: a ordem vale, mas a tropa só anda até onde dá (nunca entra na zona sem frota)
assert.equal(orderMove(w, e, army.id, otherZone), null);
for (let k = 0; k < 30 && army.target !== null; k++) { stepWar(w, e); assert.ok(w.terrain[army.hex] !== T.OCEAN || w.seaZone[army.hex] === zone); }
army.hex = cityA.hex; army.path = undefined;
army.target = null;

// combate naval: frotas de países em guerra na mesma zona perdem marinheiros e organização
const cityB = e.cities.find((k) => k.country === B && k.urban.some((j) => coastOf(w, j) >= 0))!, coastHexB = cityB.urban.find((j) => coastOf(w, j) >= 0)!;
assert.equal(buildFleet(w, e, B, coastHexB), null);
const fleetB = e.divisions.find((d) => d.kind === "fleet" && d.country === B)!;
fleetB.hex = fleet.hex; // mesma zona
declareWar(e, A, B);
stepWar(w, e);
assert.ok(fleet.strength < NAVY.sailors && fleetB.strength < NAVY.sailors, "combate naval sem baixas");
assert.ok(fleet.org < 1 && fleetB.org < 1);

// bloqueio: frota de A na zona colada numa cidade de B, sem frota de B lá
fleetB.hex = homePort(w, e, A); // tira a frota de B dali (põe longe, na costa de A)
const seaB = coastOf(w, coastHexB);
fleet.hex = seaB; fleet.org = 1; fleet.strength = NAVY.sailors;
if (w.seaZone[fleetB.hex] === w.seaZone[seaB]) fleetB.strength = 0; // se por acaso for a mesma zona, some
stepWar(w, e);
assert.ok(cityB.blockaded, "cidade de B deveria estar bloqueada");
assert.ok(!cityA.blockaded);

// exército de B no mar, sem frota de B na zona e com frota de A: afunda
assert.equal(recruit(w, e, B, cityB.hex), null);
const armyB = e.divisions.filter((d) => d.kind === "army" && d.country === B).at(-1)!;
armyB.hex = seaB;
stepWar(w, e);
assert.ok(!e.divisions.includes(armyB), "exército sem escolta deveria afundar");
console.log("navy ok");

// tipos de navio: exigem tecnologia; navio melhor ganha a batalha naval
{
  const { SHIPS, craftOf } = await import("../src/units.ts");
  assert.ok(SHIPS.every((s) => s.power > 0 && s.cost > 0));
  assert.equal(craftOf(SHIPS, undefined).name, "Galés", "frota sem tipo (save antigo) = galés");
  const { buildFleet } = await import("../src/war.ts");
  const c = e.countries[A - 1]; c.treasury = 1e4; c.manpower = 1e4;
  const city = e.cities.find((k) => k.country === A && k.urban.some((j) => coastOf(w, j) >= 0))!, coast = city.urban.find((j) => coastOf(w, j) >= 0)!;
  assert.match(buildFleet(w, e, A, coast, "Couraçados")!, /Eletricidade/);
  c.research.known.add("Eletricidade");
  assert.equal(buildFleet(w, e, A, coast, "Couraçados"), null);
  assert.ok(e.divisions.some((d) => d.unit === "Couraçados"));
}
console.log("ships ok");
