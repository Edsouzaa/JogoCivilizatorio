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

// etapa 2: cargos, leis, general herói assume o governo, golpe, títulos pelo que foi registrado
{
  const ch = await import("../src/characters.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy } = await import("../src/economy.ts");
  const { applyCommand } = await import("../src/commands.ts");
  const w = generateWorld(120, 60, 4, 2), e = createEconomy(w);
  ch.stepCharacters(w, e);
  const r0 = ch.rulerOf(e, 1)!;
  assert.equal(r0.offices![0].title, "Governante");
  assert.equal(r0.offices![0].to, undefined);
  // lei: proposta e retirada entram na vida de quem governa
  const { LAWS } = await import("../src/politics.ts");
  const { lawOf } = await import("../src/politics.ts");
  const [cat, law] = Object.entries(LAWS).flatMap(([c, l]) => l.filter((x) => x.era === 0 && x.name !== lawOf(e.countries[0].politics, c).name).map((x) => [c, x] as const))[0];
  if (law.tech) e.countries[0].research.known.add(law.tech);
  assert.equal(applyCommand(w, e, 1, { t: "law", cat, name: law.name }), null);
  {
    assert.equal(r0.laws!.at(-1)!.result, "proposta");
    applyCommand(w, e, 1, { t: "cancelLaw" });
    assert.equal(r0.laws!.at(-1)!.result, "retirada");
  }
  // general com 3 vitórias e herói: na morte do governante, assume (e segue general: acumula cargos)
  const d = { id: 950, kind: "army", country: 1, hex: e.cities[0].hex, strength: 20, org: 1, target: null, progress: 0, equip: 1 } as never as import("../src/economy.ts").Division;
  e.divisions.push(d); e.countries[0].treasury = 1000;
  assert.equal(ch.hireGeneral(w, e, d.id, 0), null);
  const g = e.characters!.at(-1)!;
  for (let k = 0; k < 3; k++) { e.week++; ch.recordBattle(e, { id: k + 1, hex: d.hex, start: e.week, attacker: 1, defender: 2, startAtt: 100, startDef: 90, deadAtt: 5, deadDef: 40 }, "att", [d], [], `t${k}`); }
  assert.ok(ch.titlesOf(g, e.week).includes("General invicto") && ch.titlesOf(g, e.week).includes("Herói nacional"));
  assert.match(ch.epithet(g, e.week), /^O /);
  r0.dies = e.week; e.countries[0].politics.laws["Governo"] = "Chefia tribal";
  ch.stepCharacters(w, e);
  assert.equal(ch.rulerOf(e, 1)!.id, g.id, "o herói assume");
  assert.equal(r0.offices!.at(-1)!.end, "morte");
  assert.deepEqual(g.offices!.filter((o) => o.to === undefined).map((o) => o.title).sort(), ["Comandante terrestre", "Governante"]);
  // ninguém ganha título sem feito registrado
  assert.deepEqual(ch.titlesOf(ch.newCharacter(w, e, 2, 77), e.week), []);
  console.log("characters ok (cargos, leis, sucessão, títulos)");
}

// etapa 3: agitador aparece com radicais; revolução derruba o governante, que vai para o exílio e aprende a língua de lá
{
  const ch = await import("../src/characters.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy } = await import("../src/economy.ts");
  const { rulerWar } = await import("../src/ai.ts");
  const w = generateWorld(120, 60, 4, 2), e = createEconomy(w);
  ch.stepCharacters(w, e);
  const c = e.countries[0], old = ch.rulerOf(e, 1)!;
  c.radicals = 0.5; c.politics.legitimacy = 0.1; old.dies = e.week + 9999;
  ch.stepCharacters(w, e);
  const agit = e.characters!.find((x) => x.country === 1 && x.offices?.some((o) => o.title === "Agitador político"))!;
  assert.ok(agit, "agitador apareceu");
  let weeks = 0;
  while (ch.rulerOf(e, 1)!.id === old.id && weeks++ < 30) { e.week++; ch.stepCharacters(w, e); }
  assert.equal(ch.rulerOf(e, 1)!.id, agit.id, "a revolução venceu");
  assert.ok(agit.revolution && ch.titlesOf(agit, e.week).includes("Revolucionário"));
  assert.ok(old.exiledTo && old.exiledTo !== 1, "governante no exílio");
  assert.ok(old.langs!.includes(w.countries[old.exiledTo - 1].lang ?? 0));
  assert.equal(c.politics.legitimacy, ch.AGITATION.newLegitimacy);
  // radicais baixos: o movimento esfria e o agitador sai de cena
  c.radicals = 0.5; e.week++; ch.stepCharacters(w, e);
  const a2 = e.characters!.find((x) => x.role === "Agitador" && x.country === 1 && !x.gone);
  if (a2) { c.radicals = 0; e.week++; ch.stepCharacters(w, e); assert.ok(a2.gone); }
  // IA: governante expansionista empurra para a guerra, pacifista segura
  const r = ch.rulerOf(e, 1)!; r.personality = "Expansionista"; r.traits = []; assert.ok(rulerWar(e, 1) > 1);
  r.personality = "Conciliador"; r.traits = ["Pacifista"]; assert.ok(rulerWar(e, 1) < 0.5);
  console.log("characters ok (agitadores, revolução, exílio)");
}
