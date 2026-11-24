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
console.log("sim ok");
