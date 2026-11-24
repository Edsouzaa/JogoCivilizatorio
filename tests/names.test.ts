import assert from "node:assert/strict";
import { makeName, LANGUAGES } from "../src/names.ts";
import { generateWorld, CONTINENT_MIN } from "../src/world.ts";
import { createEconomy } from "../src/economy.ts";
import { applyCommand } from "../src/commands.ts";

// mesma semente → mesmo nome (lockstep); nomes variados e sem caracteres estranhos
assert.equal(makeName(2, 99), makeName(2, 99));
const names = new Set(Array.from({ length: 200 }, (_, k) => makeName(k % LANGUAGES.length, k)));
assert.ok(names.size > 150, `pouca variedade: ${names.size}`);
for (const n of names) assert.match(n, /^[A-ZÇ][a-zçãéí]+$/u, n);

// países e cidades ganham nome na língua do lugar; continentes grandes têm nome e podem ser renomeados
const w = generateWorld(400, 200, 11, 6), e = createEconomy(w);
assert.ok(w.countries.every((c) => c.lang !== undefined && !/^País/.test(c.name)));
assert.ok(e.cities.every((c) => !/^Capital/.test(c.name)));
assert.ok(w.continents!.length > 0);
const sizes = new Map<number, number>();
for (const k of w.continent!) if (k) sizes.set(k, (sizes.get(k) ?? 0) + 1);
for (const n of sizes.values()) assert.ok(n >= CONTINENT_MIN);
assert.equal(applyCommand(w, e, 1, { t: "continent", id: 1, name: "Pangeia" }), null);
assert.equal(w.continents![0].name, "Pangeia");
assert.match(applyCommand(w, e, 1, { t: "continent", id: 99, name: "X" })!, /inválido/);
console.log("names ok");

// multiplayer: renomear continente vira votação; passa com mais da metade dos jogadores
{
  e.humans = [1, 2, 3];
  const old = w.continents![0].name;
  assert.equal(applyCommand(w, e, 1, { t: "continent", id: 1, name: "Novaterra" }), null);
  assert.equal(w.continents![0].name, old, "não muda sem votação");
  const v = e.votes![0];
  assert.match(applyCommand(w, e, 4, { t: "vote", id: v.id, yes: true }) ?? "", /jogadores|inválido|País/);
  assert.equal(applyCommand(w, e, 2, { t: "vote", id: v.id, yes: true }), null);
  assert.equal(w.continents![0].name, "Novaterra");
  assert.equal(e.votes!.length, 0);
}
console.log("votes ok");
