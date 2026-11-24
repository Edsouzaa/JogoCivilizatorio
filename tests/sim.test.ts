import assert from "node:assert/strict";
import { advanceWeek, checksum } from "../src/sim.ts";
import { applyCommand, type Cmd } from "../src/commands.ts";
import { createEconomy } from "../src/economy.ts";
import { generateWorld } from "../src/world.ts";
import { saveGame, loadGame } from "../src/save.ts";

const make = () => { const w = generateWorld(300, 150, 9, 4); return { w, e: createEconomy(w) }; };
const a = make(), b = make();

// os mesmos comandos nas mesmas semanas → mesmo resultado (é o lockstep do multiplayer)
const script: Record<number, [number, Cmd][]> = {
  1: [[1, { t: "claim" }], [1, { t: "settlers" }]],
  3: [[1, { t: "recruit", hex: a.e.cities[0].hex }]],
  10: [[2, { t: "war", target: 3 }]],
};
let copy: { w: typeof a.w; e: typeof a.e } | null = null;
for (let week = 0; week < 120; week++) {
  for (const s of [a, b]) {
    for (const [country, cmd] of script[week] ?? []) applyCommand(s.w, s.e, country, cmd);
    advanceWeek(s.w, s.e);
  }
  if (week === 60) { // alguém entra no meio: recebe a foto e segue junto
    const snap = await loadGame(await saveGame({ world: a.w, eco: a.e, ui: { active: 0, cam: { x: 0, y: 0, zoom: 1 }, mode: 0, speed: 2, explored: [] } }));
    copy = { w: snap.world, e: snap.eco };
  } else if (copy) advanceWeek(copy.w, copy.e);
}
assert.equal(checksum(a.e), checksum(b.e), "duas simulações com os mesmos comandos divergiram");
assert.deepEqual(a.e.humans, [1]);
assert.equal(checksum(copy!.e), checksum(a.e), "quem entrou no meio (pela foto) divergiu");

// comandos só valem para o próprio país
const enemyUnit = a.e.divisions.find((d) => d.country === 2)!;
assert.match(applyCommand(a.w, a.e, 1, { t: "move", id: enemyUnit.id, target: 0 })!, /não é sua/);
assert.match(applyCommand(a.w, a.e, 1, { t: "build", i: a.e.cities[1].hex, b: 0 })!, /não é seu/);
assert.match(applyCommand(a.w, a.e, 99, { t: "settlers" })!, /País inválido/);
assert.match(applyCommand(a.w, a.e, 1, { t: "hack" } as unknown as Cmd)!, /desconhecido/);
// identidade e nomes: valida tudo o que vem do jogador
const flag = { layout: 2, colors: ["#112233", "#ffffff", "#aa0000"] as [string, string, string], symbol: "★" };
assert.equal(applyCommand(a.w, a.e, 1, { t: "identity", name: " <b>Roma</b> ", color: [200, 10, 10], flag }), null);
assert.equal(a.w.countries[0].name, "bRoma/b");
assert.deepEqual(a.w.countries[0].color, [200, 10, 10]);
assert.match(applyCommand(a.w, a.e, 1, { t: "identity", name: "X", color: [999, 0, 0], flag })!, /inválida/);
assert.match(applyCommand(a.w, a.e, 1, { t: "identity", name: "X", color: [1, 2, 3], flag: { ...flag, colors: ["red", "#fff", "#000"] } } as unknown as Cmd)!, /inválida/);
const mine = a.e.cities.findIndex((k) => k.country === 1), theirs = a.e.cities.findIndex((k) => k.country === 2);
assert.equal(applyCommand(a.w, a.e, 1, { t: "rename", kind: "city", id: mine, name: "Lácio" }), null);
assert.equal(a.e.cities[mine].name, "Lácio");
assert.match(applyCommand(a.w, a.e, 1, { t: "rename", kind: "city", id: theirs, name: "Minha" })!, /Não é seu/);
// estado novo já com nome e bandeira; bandeira inválida é ignorada (fica a do país)
a.e.countries[0].research.era = 1;
assert.equal(applyCommand(a.w, a.e, 1, { t: "stateNew", city: mine, name: "Lácio", flag }), null);
assert.equal(a.e.states.at(-1)!.name, "Lácio");
assert.deepEqual(a.e.states.at(-1)!.flag, flag);
assert.equal(applyCommand(a.w, a.e, 1, { t: "rename", kind: "state", id: a.e.states.at(-1)!.id, name: "Roma", flag: { ...flag, symbol: "<script>" } }), null);
assert.deepEqual(a.e.states.at(-1)!.flag, flag);
console.log("sim ok");
