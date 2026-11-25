import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { stepCharacters, rulerOf, ageOf } from "../src/characters.ts";
import { applyCommand } from "../src/commands.ts";
import { portraitSVG } from "../src/portrait.ts";

const w = generateWorld(200, 100, 6, 3), e = createEconomy(w);
// todo país ganha governante adulto, com atributos de 0 a 100 e retrato
stepCharacters(w, e);
for (let k = 1; k <= 3; k++) {
  const r = rulerOf(e, k)!;
  assert.ok(r && ageOf(r, e.week) >= 20 && r.dies > e.week);
  assert.ok([r.adm, r.dip, r.mil].every((v) => v >= 0 && v <= 100));
  assert.match(portraitSVG(r, 0), /^<svg/);
}
// determinístico (lockstep): o mesmo mundo dá o mesmo governante
const w2 = generateWorld(200, 100, 6, 3), e2 = createEconomy(w2); stepCharacters(w2, e2);
assert.equal(rulerOf(e2, 1)!.name, rulerOf(e, 1)!.name);
// governante bom de administração arrecada mais
tick(w, e); const r1 = rulerOf(e, 1)!;
r1.adm = 0; e.week = 1; tick(w, e); e.week = 1; tick(w, e); const bad = e.countries[0].income; // o imposto cobrado entra no tesouro na semana seguinte
r1.adm = 100; e.week = 1; tick(w, e); e.week = 1; tick(w, e); const good = e.countries[0].income;
assert.ok(good > bad);
// morte: vem o sucessor; guardado na história continua existindo
assert.equal(applyCommand(w, e, 1, { t: "saveCharacter", id: r1.id }), null);
e.week = r1.dies;
const deaths = stepCharacters(w, e);
assert.ok(deaths.some((d) => d.id === r1.id));
assert.notEqual(rulerOf(e, 1)!.id, r1.id);
assert.ok(e.characters!.some((c) => c.id === r1.id && c.dead), "guardado na história não some");
assert.ok(r1.life.some((l) => l.includes("morreu")));
console.log("characters ok");
