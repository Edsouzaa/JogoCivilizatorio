import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy } from "../src/economy.ts";
import { advanceWeek } from "../src/sim.ts";
import { applyCommand } from "../src/commands.ts";
import { EVENT_LIST, CHOICES } from "../src/choices.ts";

// eventos saem para todo mundo; jogador fica com o evento pendente até responder; IA resolve sozinha
const w = generateWorld(200, 100, 2, 6), e = createEconomy(w);
e.humans = [1];
for (let k = 0; k < 52 * 30 && !e.choices?.[1]; k++) advanceWeek(w, e);
assert.ok(e.choices?.[1], "em 30 anos deveria sair ao menos um evento para o jogador");
assert.ok(Object.keys(e.choices!).every((k) => +k === 1), "IA não deveria ficar com evento pendente");
const ev = e.choices![1];
assert.ok(EVENT_LIST[ev.id].options.length >= 2);
assert.match(applyCommand(w, e, 1, { t: "choose", option: 99 })!, /inválida/);
assert.equal(applyCommand(w, e, 1, { t: "choose", option: 0 }), null);
assert.equal(e.choices![1], undefined);
assert.match(applyCommand(w, e, 1, { t: "choose", option: 0 })!, /Nenhum/);
assert.ok(CHOICES.timeoutMs === 120_000);
console.log("choices ok");
