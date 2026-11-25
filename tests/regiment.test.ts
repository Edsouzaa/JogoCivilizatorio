import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy } from "../src/economy.ts";
import { mergeArmies, splitRegiment } from "../src/war.ts";
import { statsOf, unitOf } from "../src/units.ts";

const w = generateWorld(200, 100, 3, 2), e = createEconomy(w);
const hex = e.cities[0].hex;
const army = (unit: string, strength: number, at = hex) => { const d = { id: e.nextDivision++, kind: "army" as const, country: 1, hex: at, strength, org: 1, target: null, progress: 0, equip: 1, unit }; e.divisions.push(d); return d.id; };
const a = army("Lanceiros", 300), b = army("Arqueiros", 100), far = army("Lanceiros", 100, hex + 5);
assert.match(mergeArmies(e, 1, [a])!, /dois/);
assert.match(mergeArmies(e, 1, [a, far])!, /mesmo hex/);
assert.match(mergeArmies(e, 2, [a, b])!, /dois/, "exército de outro país não entra");
assert.equal(mergeArmies(e, 1, [a, b]), null);
const r = e.divisions.find((d) => d.id === a)!;
assert.ok(!e.divisions.some((d) => d.id === b), "o segundo exército entrou no regimento");
assert.equal(r.strength, 400);
assert.ok(Math.abs(r.mix!["Lanceiros"] - 0.75) < 1e-9 && Math.abs(r.mix!["Arqueiros"] - 0.25) < 1e-9);
const s = statsOf(r), L = unitOf("Lanceiros"), A = unitOf("Arqueiros");
assert.ok(Math.abs(s.atk - (0.75 * L.atk + 0.25 * A.atk)) < 1e-9, "ataque pela média dos soldados");
assert.equal(s.speed, Math.min(L.speed, A.speed));
assert.equal(r.size, 2, "teto de reforço de 2 divisões");
// separar: uma divisão por tipo, com os soldados de cada um
assert.equal(splitRegiment(e, 1, a), null);
const back = e.divisions.filter((d) => d.hex === hex && d.kind === "army" && d.country === 1);
assert.equal(back.length, 2);
assert.ok(back.some((d) => d.unit === "Lanceiros" && Math.abs(d.strength - 300) < 1e-6) && back.some((d) => d.unit === "Arqueiros" && Math.abs(d.strength - 100) < 1e-6));
assert.match(splitRegiment(e, 1, a)!, /regimento/);
console.log("regiment ok");
