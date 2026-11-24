import assert from "node:assert/strict";
import { createEconomy, tick } from "./economy.ts";
import { recruit, orderMove, declareWar, stepWar, warScore, makePeace, atWar, controller, WAR } from "./war.ts";
import { forNeighbors } from "./hex.ts";
import { generateWorld, isLand } from "./world.ts";
import { P } from "./pops.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
tick(w, e);
const [A, B] = [1, 2], ca = e.countries[A - 1], cb = e.countries[B - 1];
ca.manpower = cb.manpower = 1e5; ca.treasury = cb.treasury = 1e5;
const capA = e.cities[A - 1].hex, capB = e.cities[B - 1].hex;

// recrutar só em cidade própria; custa manpower e dinheiro
const ruralA = [...e.owned].find((i) => w.owner[i] === A && !e.urban[i])!;
assert.match(recruit(w, e, A, ruralA)!, /cidade/);
assert.equal(recruit(w, e, A, capA), null);
assert.equal(ca.manpower, 1e5 - WAR.divisionSize);
assert.equal(ca.treasury, 1e5 - WAR.recruitCost);
const d = e.divisions[0];

// soldados entram na população como POP Soldados
tick(w, e);
assert.ok(Math.abs(ca.pops.count[P["Soldados"]] - d.strength) < 1e-6);

// um hex de B com vizinho de terra: a divisão de A é posta ao lado dele
let target = -1, start = -1;
for (const i of e.owned) {
  if (w.owner[i] !== B || i === capB || e.urban[i]) continue;
  forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (start < 0 && isLand(w.terrain[j]) && j !== capB) start = j; });
  if (start >= 0 && w.terrain[i] !== 7) { target = i; break; }
  start = -1;
}
assert.ok(target >= 0, "mapa de teste sem fronteira");
d.hex = start;

// sem guerra não entra
assert.equal(orderMove(w, e, d.id, target), null);
for (let k = 0; k < 3; k++) stepWar(w, e);
assert.notEqual(d.hex, target);

// em guerra entra e ocupa
assert.equal(declareWar(e, A, B), null);
assert.ok(atWar(e, A, B));
orderMove(w, e, d.id, target);
for (let k = 0; k < 4 && d.hex !== target; k++) stepWar(w, e);
assert.equal(d.hex, target);
assert.equal(e.occupier[target], A);
assert.equal(controller(w, e, target), A);
assert.ok(warScore(w, e, A, B) > 0);

// combate: uma divisão de B no vizinho; atacar tira soldados e organização dos dois lados
recruit(w, e, B, capB);
const db = e.divisions.find((x) => x.country === B)!;
let fight = -1;
forNeighbors(target % w.W, (target / w.W) | 0, w.W, w.H, (j) => { if (fight < 0 && isLand(w.terrain[j]) && w.terrain[j] !== 7) fight = j; });
db.hex = fight;
orderMove(w, e, d.id, fight);
stepWar(w, e);
assert.ok(d.strength < WAR.divisionSize && db.strength < WAR.divisionSize, "combate sem baixas");
assert.ok(d.org < 1 && db.org < 1, "combate sem perda de organização");
d.target = null;

// paz: A está na frente e fica com o hex ocupado; a guerra acaba
const occupied = [...e.owned].filter((i) => e.occupier[i] === A);
assert.ok(occupied.length > 0);
assert.ok(warScore(w, e, A, B) > WAR.peaceThreshold);
assert.equal(makePeace(w, e, A, B), null);
assert.ok(!atWar(e, A, B));
for (const i of occupied) { assert.equal(w.owner[i], A); assert.equal(e.occupier[i], 0); }
assert.equal(w.owner[capB], B, "capital do perdedor não pode ser tomada");
console.log("war ok");
