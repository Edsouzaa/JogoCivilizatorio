import assert from "node:assert/strict";
import { nextSlot, autosaveClock, type AutosaveMeta } from "../src/autosave.ts";

// vagas: primeiro as vazias, depois a mais antiga
const m = (slot: number, savedAt: number): AutosaveMeta => ({ slot, savedAt, label: "", size: 0 });
assert.equal(nextSlot([]), 0);
assert.equal(nextSlot([m(0, 10)]), 1);
assert.equal(nextSlot([m(0, 10), m(1, 20)]), 2);
assert.equal(nextSlot([m(0, 30), m(1, 10), m(2, 20)]), 1); // a mais antiga
assert.equal(nextSlot([m(0, 30), m(1, 40), m(2, 20)]), 2);

// relógio: só conta tempo com o jogo andando, e dispara uma vez por intervalo
const c = autosaveClock(1000);
assert.equal(c.tick(600, true), false);
assert.equal(c.tick(5000, false), false); // pausado não conta
assert.equal(c.tick(500, true), true);    // 1100 ms rodando
assert.equal(c.tick(500, true), false);   // zerou
console.log("autosave ok");
