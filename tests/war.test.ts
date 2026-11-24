import assert from "node:assert/strict";
import { createEconomy, tick } from "../src/economy.ts";
import { recruit, orderMove, declareWar, stepWar, warScore, makePeace, atWar, controller, settlerDistance, nextStep, siegeWeeks, WAR } from "../src/war.ts";
import { RULES } from "../src/economy.ts";
import { forNeighbors } from "../src/hex.ts";
import { generateWorld, isLand } from "../src/world.ts";
import { P } from "../src/pops.ts";

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
const d = e.divisions.find((x) => x.kind === "army" && x.country === A)!;

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
cb.manpower = 1e5; // o manpower é recalculado pelo teto da população a cada tick
assert.equal(recruit(w, e, B, capB), null);
const db = e.divisions.find((x) => x.kind === "army" && x.country === B)!;
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
w.pop[target] += 1e4; // o hex ocupado vale bastante gente: vitória clara, independente do mapa
assert.ok(warScore(w, e, A, B) > WAR.peaceThreshold);
assert.equal(makePeace(w, e, A, B), null);
assert.ok(!atWar(e, A, B));
for (const i of occupied) { assert.equal(w.owner[i], A); assert.equal(e.occupier[i], 0); }
assert.equal(w.owner[capB], B, "capital do perdedor não pode ser tomada");
console.log("war ok");

// colonos: longe das cidades perdem gente; exército inimigo no hex deles os destrói
{
  const s = e.divisions.find((x) => x.kind === "settler" && x.country === A)!;
  let far = -1;
  for (let i = 0; i < w.W * w.H && far < 0; i++) if (isLand(w.terrain[i]) && !w.owner[i] && settlerDistance(w, e, { ...s, hex: i }) > RULES.settlerSupplyRange + 2) far = i;
  s.hex = far; s.target = null;
  const before = s.strength;
  stepWar(w, e);
  assert.ok(s.strength < before, "colonos sem suprimento não perderam gente");
  // perto de casa não perdem
  s.hex = capA; const home = s.strength;
  stepWar(w, e);
  assert.equal(s.strength, home);
  // colonos não atacam nem entram em território de outro país
  assert.equal(orderMove(w, e, s.id, target), null);
  for (let k = 0; k < 30; k++) stepWar(w, e);
  assert.ok(!w.owner[s.hex] || w.owner[s.hex] === A, "colonos entraram em território estrangeiro");
}
console.log("settlers ok");

// caminho: contorna parede (o guloso travava) e, se o alvo é inalcançável, para no ponto mais perto
{
  const g = { W: 20, H: 20 } as Parameters<typeof nextStep>[0];
  const wall = (i: number) => i % 20 === 10 && ((i / 20) | 0) > 2; // parede vertical aberta só em cima
  let at = 10 * 20 + 5, steps = 0;
  const me: { path?: { target: number; steps: number[] } } = {};
  while (steps < 60) { const n = nextStep(g, at, 10 * 20 + 15, (j) => !wall(j), me); if (n < 0) break; at = n; steps++; }
  assert.equal(at, 10 * 20 + 15, "não contornou a parede");
  at = 5 * 20 + 5;
  for (let k = 0; k < 60; k++) { const n = nextStep(g, at, 5 * 20 + 12, (j) => j % 20 < 9); if (n < 0) break; at = n; }
  assert.equal(at % 20, 8, "deveria parar na beira do possível"); // (o mapa dá a volta: alvo perto da coluna 8)
}
console.log("path ok");

// cerco: o centro da cidade só cai depois de semanas; aí a região toda fica ocupada; retomar o centro devolve tudo
{
  const w5 = generateWorld(200, 100, 6, 2), e5 = createEconomy(w5);
  for (const c of e5.countries) { c.manpower = 1e4; c.treasury = 1e4; }
  declareWar(e5, 1, 2);
  const city = e5.cities.find((k) => k.country === 2)!, k = e5.cities.indexOf(city);
  assert.equal(recruit(w5, e5, 1, e5.cities.find((c) => c.country === 1)!.hex), null);
  const army = e5.divisions.find((d) => d.country === 1 && d.kind === "army")!;
  army.hex = city.hex; army.target = null; army.strength = 1e3; // já chegou, sem defensores
  const need = siegeWeeks(city.size, 1);
  for (let t = 1; t < need; t++) { stepWar(w5, e5); assert.equal(e5.occupier[city.hex], 0, `caiu na semana ${t}`); }
  stepWar(w5, e5);
  const region = [...e5.owned].filter((i) => e5.market[i] === k + 1 && w5.owner[i] === 2);
  assert.ok(region.length > 1 && region.every((i) => e5.occupier[i] === 1), "a região deveria ficar ocupada");
  // B volta ao centro: liberta a região
  army.strength = 0; stepWar(w5, e5); // o sitiante morre
  const def = { ...army, id: 9999, country: 2, strength: 1e3, org: 1, siege: 0, path: undefined, target: null, hex: region.find((i) => i !== city.hex)! };
  e5.divisions.push(def); orderMove(w5, e5, def.id, city.hex);
  for (let t = 0; t < 20 && e5.occupier[city.hex]; t++) stepWar(w5, e5);
  assert.ok(region.every((i) => !e5.occupier[i]), "retomar o centro deveria libertar a região");
}
console.log("siege ok");

// números da guerra: duração, civis perdidos em território ocupado, custo; apoio cai e paz apaga tudo
{
  const { warSupport } = await import("../src/war.ts");
  const w6 = generateWorld(200, 100, 6, 2), e6 = createEconomy(w6);
  tick(w6, e6);
  declareWar(e6, 1, 2);
  const st = e6.warStats!["1-2"];
  const hex = [...e6.owned].find((i) => w6.owner[i] === 2)!;
  e6.occupier[hex] = 1; w6.pop[hex] = 1000;
  const leg = e6.countries[1].politics.legitimacy;
  for (let k = 0; k < 10; k++) stepWar(w6, e6);
  assert.ok(st.civil[2] > 0, "civis deveriam morrer em hex ocupado");
  assert.ok(warSupport(e6, 2, st) < 1);
  assert.ok(e6.countries[1].politics.legitimacy <= leg);
  makePeace(w6, e6, 1, 2);
  assert.equal(e6.warStats!["1-2"], undefined);
}
console.log("war stats ok");

// tipos de tropa: exigem tecnologia, custam diferente e mudam a força; general dá bônus e ganha vida
{
  const { unitOf, UNITS, bestUnit } = await import("../src/units.ts");
  const { applyCommand } = await import("../src/commands.ts");
  const w7 = generateWorld(200, 100, 6, 2), e7 = createEconomy(w7), c = e7.countries[0];
  c.manpower = 1e4; c.treasury = 1e4;
  const hex = e7.cities.find((k) => k.country === 1)!.hex;
  assert.match(recruit(w7, e7, 1, hex, "Cavalaria")!, /Domesticação/);
  c.research.known.add("Domesticação");
  const t0 = c.treasury;
  assert.equal(recruit(w7, e7, 1, hex, "Cavalaria"), null);
  assert.equal(t0 - c.treasury, Math.round(WAR.recruitCost * unitOf("Cavalaria").cost));
  const cav = e7.divisions.find((d) => d.unit === "Cavalaria")!;
  assert.equal(bestUnit(c.research.known).name !== "", true);
  assert.ok(UNITS.every((u) => u.atk > 0 && u.def > 0 && u.speed > 0 && u.siege > 0));
  // general
  assert.equal(applyCommand(w7, e7, 1, { t: "general", id: cav.id }), null);
  const g = e7.characters!.find((x) => x.id === cav.general)!;
  assert.equal(g.role, "General");
  assert.match(applyCommand(w7, e7, 1, { t: "general", id: cav.id })!, /já tem/);
}
console.log("units ok");

// frente: defender espalha pela fronteira; atacar manda às cidades inimigas
{
  const { frontOrder } = await import("../src/war.ts");
  const { refresh } = await import("../src/economy.ts");
  const w8 = generateWorld(200, 100, 6, 2), e8 = createEconomy(w8);
  const a = e8.cities.find((k) => k.country === 1)!, b = e8.cities.find((k) => k.country === 2)!;
  e8.countries[0].manpower = 1e4; e8.countries[0].treasury = 1e4;
  for (let k = 0; k < 3; k++) recruit(w8, e8, 1, a.hex);
  const ids = e8.divisions.filter((d) => d.country === 1 && d.kind === "army").map((d) => d.id);
  assert.match(frontOrder(w8, e8, 1, ids, 2, "defend")!, /fronteira/, "sem fronteira ainda");
  // cria a fronteira: um hex nosso colado no território deles
  let border = -1;
  for (const i of e8.owned) if (w8.owner[i] === 2) forNeighbors(i % 200, (i / 200) | 0, 200, 100, (j) => { if (border < 0 && !w8.owner[j] && isLand(w8.terrain[j])) border = j; });
  w8.owner[border] = 1; refresh(w8, e8);
  assert.equal(frontOrder(w8, e8, 1, ids, 2, "defend"), null);
  assert.ok(e8.divisions.filter((d) => ids.includes(d.id)).every((d) => d.target === border || d.hex === border), "todos para o único hex de fronteira");
  declareWar(e8, 1, 2);
  assert.equal(frontOrder(w8, e8, 1, ids, 2, "attack"), null);
  assert.ok(e8.divisions.filter((d) => ids.includes(d.id)).every((d) => d.target === b.hex || e8.cities.some((k) => k.country === 2 && k.hex === d.target)));
  assert.match(frontOrder(w8, e8, 1, [999], 2, "attack")!, /exércitos seus/);
}
console.log("front ok");
