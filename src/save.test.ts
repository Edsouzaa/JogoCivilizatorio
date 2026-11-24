import assert from "node:assert/strict";
import { saveGame, loadGame } from "./save.ts";
import { createEconomy, tick } from "./economy.ts";
import { stepWar, recruit, declareWar } from "./war.ts";
import { generateWorld } from "./world.ts";

const w = generateWorld(300, 150, 4, 4), e = createEconomy(w);
e.countries[0].manpower = 1000; e.countries[0].treasury = 1000;
recruit(w, e, 1, e.cities[0].hex);
declareWar(e, 1, 2);
for (let k = 0; k < 30; k++) { tick(w, e); stepWar(w, e); }

const explored = new Uint8Array(w.W * w.H); explored[5] = 1;
const blob = await saveGame({ world: w, eco: e, ui: { active: 1, cam: { x: 1, y: 2, zoom: 3 }, mode: 0, speed: 2, explored: [[1, explored]] } });
const got = await loadGame(blob);

// volta igual: arrays tipados, Set, Map e números
assert.deepEqual(got.world.owner, w.owner);
assert.deepEqual(got.world.pop, w.pop);
assert.deepEqual(got.eco.levels[0], e.levels[0]);
assert.deepEqual(got.eco.producers, e.producers);
assert.deepEqual(got.eco.wars, e.wars);
assert.deepEqual(got.eco.countries[0].research.known, e.countries[0].research.known);
assert.deepEqual(got.eco.countries[0].research.progress, e.countries[0].research.progress);
assert.equal(got.eco.week, e.week);
assert.equal(got.ui.explored[0][1][5], 1);

// e continua jogando do mesmo jeito: uma semana a mais nos dois dá o mesmo resultado
tick(w, e); stepWar(w, e);
tick(got.world, got.eco); stepWar(got.world, got.eco);
assert.equal(got.eco.countries[0].treasury, e.countries[0].treasury);
assert.deepEqual(got.eco.divisions, e.divisions);

// arquivos que não são save são recusados com mensagem
await assert.rejects(loadGame(new Blob(["olá"])), /não é um save/);
console.log(`save ok (${(blob.size / 1024).toFixed(0)} KB)`);
