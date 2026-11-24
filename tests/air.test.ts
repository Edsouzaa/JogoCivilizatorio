import assert from "node:assert/strict";
import { createEconomy, tick } from "../src/economy.ts";
import { buildAir, orderMove, stepWar, declareWar, recruit, airSuperiority, airRegion, AIR, WAR } from "../src/war.ts";
import { generateWorld, isLand } from "../src/world.ts";
import { forNeighbors, hexDistance } from "../src/hex.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
for (const c of e.countries) { c.manpower = 1e4; c.treasury = 1e5; }
const [A, B] = [1, 2], capA = e.cities[0].hex, capB = e.cities[1].hex;

// esquadrão precisa da tecnologia e de uma cidade
assert.match(buildAir(w, e, A, capA)!, /Aviação/);
e.countries[A - 1].research.known.add(AIR.tech); e.countries[B - 1].research.known.add(AIR.tech);
assert.equal(buildAir(w, e, A, capA), null);
const air = e.divisions.find((d) => d.kind === "air" && d.country === A)!;
assert.equal(air.hex, capA);

// missão só dentro do alcance e sobre região com cidade
const far = [...e.owned].find((i) => hexDistance(i % w.W, (i / w.W) | 0, capA % w.W, (capA / w.W) | 0, w.W) > AIR.range)!;
assert.match(orderMove(w, e, air.id, far)!, /alcance/);
assert.equal(orderMove(w, e, air.id, capA), null); // defender a própria região

// teste de batalha em terra: B ataca um hex de A; compara a força com e sem superioridade aérea de A
const defendHex = capA;
let from = -1;
forNeighbors(defendHex % w.W, (defendHex / w.W) | 0, w.W, w.H, (j) => { if (from < 0 && isLand(w.terrain[j])) from = j; });
declareWar(e, B, A);
const fight = (withAir: boolean) => {
  e.divisions = e.divisions.filter((d) => d.kind !== "army");
  air.strength = AIR.pilots; air.org = withAir ? 1 : 0; // org 0 = sem força no céu (sem apagar a unidade)
  recruit(w, e, A, capA);
  const atk = (recruit(w, e, B, capB), e.divisions.filter((d) => d.kind === "army" && d.country === B).at(-1)!);
  atk.hex = from; orderMove(w, e, atk.id, defendHex);
  const def = e.divisions.find((d) => d.kind === "army" && d.country === A)!;
  stepWar(w, e);
  return WAR.divisionSize - atk.strength; // baixas do atacante
};
assert.ok(airSuperiority(e, airRegion(e, defendHex), A, B) === 1, "A deveria dominar o céu da própria região");
const lossesWithAir = fight(true), lossesWithoutAir = fight(false);
assert.ok(lossesWithAir > lossesWithoutAir, `com céu de A o atacante deveria perder mais (${lossesWithAir} vs ${lossesWithoutAir})`);

// combate aéreo: esquadrão de B na mesma região derruba e é derrubado
air.strength = AIR.pilots; air.org = 1;
assert.equal(buildAir(w, e, B, capB), null);
const airB = e.divisions.find((d) => d.kind === "air" && d.country === B)!;
airB.hex = capA; // base perto, só para o teste
assert.equal(orderMove(w, e, airB.id, capA), null);
stepWar(w, e);
assert.ok(air.strength < AIR.pilots && airB.strength < AIR.pilots, "combate aéreo sem perdas");
// base em cidade que não é sua (aqui, a de A): o esquadrão volta para a capital e para de voar a missão
assert.equal(airB.hex, capB);
assert.equal(airB.target, null);
tick(w, e);
console.log("air ok");
