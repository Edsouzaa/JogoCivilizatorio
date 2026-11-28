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

// etapa 4: religião, casamento, filhos e herdeiro na monarquia; retrato varia e mostra os traços
{
  const ch = await import("../src/characters.ts");
  const { portraitSVG } = await import("../src/portrait.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy } = await import("../src/economy.ts");
  const w = generateWorld(120, 60, 5, 2), e = createEconomy(w);
  ch.stepCharacters(w, e);
  const r = ch.rulerOf(e, 1)!; r.dies = e.week + 52 * 100; r.born = e.week - 25 * 52;
  assert.equal(r.religion, e.countries[0].stateReligion ?? 0);
  for (let k = 0; k < 52 * 12 && (r.heirs?.length ?? 0) < 2; k++) { e.week++; if (e.week % 4 === 0) ch.stepCharacters(w, e); }
  assert.ok(r.spouse !== undefined, "casou");
  assert.ok((r.heirs?.length ?? 0) >= 1, "teve filhos");
  const kid = e.characters!.find((x) => x.id === r.heirs![0])!;
  assert.equal(kid.parent, r.id); assert.equal(ch.ageOf(kid, kid.born), 0);
  assert.equal(kid.name.split(" ").slice(1).join(" "), r.name.split(" ").slice(1).join(" "), "sobrenome da família");
  e.countries[0].politics.laws["Governo"] = "Chefia tribal";
  r.dies = e.week; e.week += 4 - (e.week % 4); ch.stepCharacters(w, e);
  assert.equal(e.countries[0].heirWaiting, kid.id, "filho bebê: herdeiro com regente");
  assert.equal(ch.rulerOf(e, 1)!.id, r.spouse, "o cônjuge vivo é o regente");
  // governante de outra fé perde legitimidade
  const heir = ch.rulerOf(e, 1)!, leg = (e.countries[0].politics.legitimacy = 0.5);
  heir.religion = ((e.countries[0].stateReligion ?? 0) + 1) % 5; e.week += 4; ch.stepCharacters(w, e);
  assert.ok(e.countries[0].politics.legitimacy < leg);
  // retrato: caolho com tapa-olho, chapéu pelo cargo, personagens diferentes dão retratos diferentes
  const svgs = new Set(e.characters!.map((c) => portraitSVG(c, 3)));
  assert.ok(svgs.size >= Math.min(3, e.characters!.length));
  heir.traits.push("Caolho"); assert.match(portraitSVG(heir, 3), /M18 22 L45 31/);
  assert.match(portraitSVG(heir, 3), /#e3b93c/, "governante medieval de coroa");
  console.log("characters ok (religião, família, herdeiros, retratos)");
}

// etapa 5: crônica central (um fato, várias referências), tratados, regência
{
  const ch = await import("../src/characters.ts");
  const cr = await import("../src/chronicle.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy, proposePact } = await import("../src/economy.ts");
  const { addRelation } = await import("../src/diplomacy.ts");
  const w = generateWorld(120, 60, 6, 2), e = createEconomy(w);
  ch.stepCharacters(w, e);
  // batalha com dois comandantes: um evento, os dois o referenciam
  const mk = (id: number, country: number) => ({ id, kind: "army", country, hex: e.cities[0].hex, strength: 20, org: 1, target: null, progress: 0, equip: 1 }) as never as import("../src/economy.ts").Division;
  const a = mk(970, 1), b = mk(971, 2); e.divisions.push(a, b); e.countries[0].treasury = e.countries[1].treasury = 1000;
  ch.hireGeneral(w, e, a.id, 0); ch.hireGeneral(w, e, b.id, 0);
  const n0 = e.chronicle?.length ?? 0;
  ch.recordBattle(e, { id: 1, hex: a.hex, start: e.week, attacker: 1, defender: 2, startAtt: 50, startDef: 40, deadAtt: 5, deadDef: 20 }, "att", [a], [b], "de Teste");
  const evs = e.chronicle!.slice(n0).filter((v) => v.t === "batalha");
  assert.equal(evs.length, 1, "um evento só");
  assert.ok(evs[0].c.includes(a.general!) && evs[0].c.includes(b.general!));
  assert.equal(cr.eventsOfCharacter(e, a.general!).filter((v) => v.t === "batalha").length, 1);
  assert.ok(evs[0].d >= 0 && evs[0].d < 7);
  // tratado: acordo comercial entra na crônica e na vida dos dois governantes
  addRelation(e, 1, 2, 100);
  assert.equal(proposePact(e, 1, 2), null);
  const t = e.chronicle!.at(-1)!; assert.equal(t.t, "tratado"); assert.deepEqual(t.k.sort(), [1, 2]);
  assert.ok(ch.rulerOf(e, 1)!.life.some((l) => l.includes("acordo comercial")));
  // regência: herdeiro criança espera a maioridade; regente governa; depois o herdeiro assume
  const r = ch.rulerOf(e, 1)!; r.born = e.week - 30 * 52; r.dies = e.week + 9999;
  e.countries[0].politics.laws["Governo"] = "Chefia tribal";
  const kid = ch.newCharacter(w, e, 1, 5); kid.born = e.week - 5 * 52; kid.dies = e.week + 80 * 52; kid.parent = r.id; (r.heirs ??= []).push(kid.id); e.characters!.push(kid);
  r.dies = e.week; ch.stepCharacters(w, e);
  const regent = ch.rulerOf(e, 1)!;
  assert.notEqual(regent.id, kid.id); assert.equal(e.countries[0].heirWaiting, kid.id);
  assert.equal(regent.offices!.at(-1)!.title, "Regente");
  assert.ok(e.characters!.includes(kid), "herdeiro guardado durante a regência");
  regent.dies = e.week + 9999; e.week += 11 * 52; ch.stepCharacters(w, e);
  assert.equal(ch.rulerOf(e, 1)!.id, kid.id, "maioridade: o herdeiro assume");
  assert.equal(regent.offices!.at(-1)!.end, `${kid.name} atingiu a maioridade`);
  // limite: a crônica não cresce sem fim e guarda os importantes
  cr.chronicle(e, "guerra", "guerra importante", [1, 2], [], 3);
  for (let k = 0; k < cr.CHRONICLE.max + 50; k++) cr.chronicle(e, "governo", "teste", [1], [], 1);
  assert.ok(e.chronicle!.length <= cr.CHRONICLE.max);
  assert.ok(e.chronicle!.some((v) => v.x === "guerra importante"), "importante não some primeiro");
  console.log("characters ok (crônica, tratados, regência)");
}

// etapa 6: diplomata (cargo, bônus real), avaliação do comando por batalha
{
  const ch = await import("../src/characters.ts");
  const { generateWorld } = await import("../src/world.ts");
  const { createEconomy } = await import("../src/economy.ts");
  const { improveRelations, relation } = await import("../src/diplomacy.ts");
  const { applyCommand } = await import("../src/commands.ts");
  const w = generateWorld(120, 60, 7, 2), e = createEconomy(w);
  ch.stepCharacters(w, e);
  const cs = ch.diplomatCandidates(w, e, 1);
  assert.equal(cs.length, 3);
  e.countries[0].treasury = 1000;
  assert.equal(applyCommand(w, e, 1, { t: "diplomat", pick: 2 }), null);
  const d = ch.diplomatOf(e, 1)!;
  assert.equal(d.name, cs[2].name); assert.equal(d.offices![0].title, "Diplomata");
  d.dip = 100; d.traits = []; d.personality = "Pragmático";
  const bonus = ch.diplomatBonus(e, 1); assert.ok(bonus > 0);
  e.countries[0].admin = 100; const r0 = relation(e, 1, 2);
  assert.equal(improveRelations(e, 1, 2), null);
  assert.equal(relation(e, 1, 2) - r0, 15 + bonus, "diplomata hábil rende mais");
  // trocar: o anterior deixa o cargo
  applyCommand(w, e, 1, { t: "diplomat", pick: 0 });
  assert.equal(d.offices![0].end?.startsWith("substituído"), true);
  // avaliação: só fatos medidos
  const base = { week: 1, day: 0, place: "x", enemy: 2, weeks: 1 } as const;
  assert.ok(ch.assess({ ...base, side: "atacante", won: true, own: 50, foe: 100, ownLost: 5, foeLost: 30 }, 1).includes("venceu em inferioridade numérica"));
  assert.ok(ch.assess({ ...base, side: "atacante", won: true, own: 300, foe: 100, ownLost: 5, foeLost: 30 }, 1)[0].includes("mérito dividido"));
  assert.ok(ch.assess({ ...base, side: "defensor", won: true, own: 100, foe: 100, ownLost: 5, foeLost: 30 }, 0.3, { name: "Colinas", defense: 2 }).some((n) => n.includes("colinas")));
  assert.ok(ch.assess({ ...base, side: "defensor", won: true, own: 100, foe: 100, ownLost: 5, foeLost: 30 }, 0.3).some((n) => n.includes("mal abastecidas")));
  console.log("characters ok (diplomata, avaliação)");
}
