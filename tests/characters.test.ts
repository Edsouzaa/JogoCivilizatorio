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

// traços mexem nos atributos efetivos (com teto 0–100)
{
  const { skill, TRAIT_FX } = await import("../src/characters.ts");
  const c0 = { adm: 50, dip: 50, mil: 95, traits: ["Corrupto", "Guerreiro"] } as never;
  assert.equal(skill(c0, "adm"), 50 + TRAIT_FX["Corrupto"].adm!);
  assert.equal(skill(c0, "mil"), 100);
  console.log("traits ok");
}

// três candidatos diferentes por comando; contrata só o escolhido; batalha entra no registro e dá traço
{
  const { generalCandidates, hireGeneral, recordBattle, SPECS, PERSONALITIES, dayOf, WEEKDAYS } = await import("../src/characters.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy } = await import("../src/economy.ts");
  const w = generateWorld(120, 60, 3, 2), e = createEconomy(w);
  for (const kind of ["army", "fleet"] as const) {
    const d = { id: 900 + (kind === "army" ? 1 : 2), kind, country: 1, hex: e.cities[0].hex, strength: 20, org: 1, target: null, progress: 0, equip: 1 } as never as import("../src/economy.ts").Division;
    e.divisions.push(d);
    const cs = generalCandidates(w, e, d.id);
    assert.equal(cs.length, 3);
    assert.equal(new Set(cs.map((c) => c.spec)).size, 3, "especializações diferentes");
    assert.equal(new Set(cs.map((c) => c.personality)).size, 3, "personalidades diferentes");
    assert.ok(cs.every((c) => SPECS[kind].some(([n]) => n === c.spec) && PERSONALITIES[c.personality!]));
    const n0 = (e.characters ?? []).length;
    e.countries[0].treasury = 1000;
    assert.equal(hireGeneral(w, e, d.id, 1), null);
    assert.equal(e.characters!.length, n0 + 1, "só um contratado");
    const g = e.characters!.at(-1)!;
    assert.equal(g.name, cs[1].name); assert.equal(d.general, g.id);
    if (kind === "army") {
      for (let k = 0; k < 3; k++) { e.week += 1; recordBattle(e, { id: k + 1, hex: d.hex, start: e.week, attacker: 1, defender: 2, startAtt: 100, startDef: 80, deadAtt: 10, deadDef: 50 }, "att", [d], [], `teste ${k}`); }
      assert.equal(g.record!.length, 3); assert.ok(g.traits.includes("Veterano") && g.traits.includes("Herói de guerra"));
      assert.equal(g.record![0].ownLost, 10); assert.equal(g.record![0].foeLost, 50);
    }
  }
  assert.ok(WEEKDAYS.length === 7 && dayOf(5, 3) === dayOf(5, 3) && dayOf(5, 3) < 7);
  console.log("characters ok (candidatos, registro)");
}
