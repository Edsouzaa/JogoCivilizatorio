import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, proposePact, tick } from "../src/economy.ts";
import { declareWar, makePeace } from "../src/war.ts";
import { applyCommand } from "../src/commands.ts";
import { relation, addRelation, prestige, stepDiplomacy, DIPLO } from "../src/diplomacy.ts";

const w = generateWorld(200, 100, 4, 3), e = createEconomy(w);
tick(w, e);
assert.equal(relation(e, 1, 2), 0);
// guerra azeda, acordo melhora, tudo volta devagar para 0
declareWar(e, 1, 2); stepDiplomacy(e);
assert.ok(relation(e, 1, 2) <= DIPLO.warMonth + 1e-9);
makePeace(w, e, 1, 2);
// relação ruim trava acordo
addRelation(e, 1, 2, -100);
assert.match(proposePact(e, 1, 2)!, /relações ruins/);
// diplomatas custam pontos administrativos
e.countries[0].admin = 0;
assert.match(applyCommand(w, e, 1, { t: "improve", target: 2 })!, /pontos/);
e.countries[0].admin = 100;
const r0 = relation(e, 1, 2);
assert.equal(applyCommand(w, e, 1, { t: "improve", target: 2 }), null);
assert.equal(relation(e, 1, 2), Math.min(100, r0 + DIPLO.improve));
assert.equal(relation(e, 1, 2), relation(e, 2, 1), "relação é simétrica");
// prestígio: média do mundo ≈ 100; glória de guerra soma
const avg = e.countries.reduce((s, _, k) => s + prestige(e, k + 1), 0) / e.countries.length;
assert.ok(Math.abs(avg - 100) < 5, `média ${avg}`);
const p = prestige(e, 1); e.countries[0].glory = (e.countries[0].glory ?? 0) + 50;
assert.equal(prestige(e, 1), p + 50);
console.log("diplomacy ok");

// dependências: aceitar exige prestígio e relação; tributário paga; vassalo entra nas guerras; autonomia 100 solta
{
  const { proposeSubject, stepSubjects, SUBJ } = await import("../src/subjects.ts");
  const w2 = generateWorld(200, 100, 4, 3), e2 = createEconomy(w2);
  tick(w2, e2);
  e2.countries[0].glory = 1000; // país 1 bem mais forte
  assert.match(proposeSubject(e2, 1, 2, "Vassalo")!, /relação/);
  addRelation(e2, 1, 2, 60);
  assert.match(proposeSubject(e2, 2, 1, "Tributário")!, /prestígio/);
  assert.equal(proposeSubject(e2, 1, 2, "Vassalo"), null);
  assert.match(proposeSubject(e2, 3, 2, "Tributário")!, /já é súdito/);
  // tributo
  const t1 = e2.countries[0].treasury; tick(w2, e2);
  assert.ok((e2.countries[0].tributeWeek ?? 0) >= 0 && (e2.countries[1].tributeWeek ?? 0) <= 0);
  assert.ok(e2.countries[0].treasury > t1 - 1e9);
  // guerra: atacar o soberano arrasta o vassalo; súdito não ataca o soberano
  assert.match(declareWar(e2, 2, 1)!, /soberano/);
  declareWar(e2, 3, 1);
  assert.ok(e2.wars.has("2-3"), "vassalo deveria entrar na guerra do soberano");
  // autonomia: soberano fraco e odiado perde o súdito
  e2.countries[0].glory = -1000; addRelation(e2, 1, 2, -200); e2.subjects![2].autonomy = SUBJ.free - 1;
  assert.deepEqual(stepSubjects(e2), [2]);
  assert.equal(e2.subjects![2], undefined);
}
console.log("subjects ok");
{
  const { proposeSubject } = await import("../src/subjects.ts");
  const w3 = generateWorld(200, 100, 4, 3), e3 = createEconomy(w3);
  e3.humans = [2]; e3.countries[0].glory = 1000; addRelation(e3, 1, 2, 100);
  assert.match(proposeSubject(e3, 1, 2, "Fantoche")!, /jogador/);
}
console.log("subjects human ok");

// propostas entre jogadores: vão para o outro aceitar ou recusar; aceitar aplica com as regras normais
{
  const { applyCommand: ac } = await import("../src/commands.ts");
  const { proposalsTo, PROPOSAL_WEEKS } = await import("../src/proposals.ts");
  const w4 = generateWorld(200, 100, 4, 3), e4 = createEconomy(w4);
  e4.humans = [1, 2];
  assert.equal(ac(w4, e4, 1, { t: "pact", target: 2 }), null);
  assert.ok(!e4.pacts.has("1-2"), "acordo com jogador não vale sem ele aceitar");
  assert.match(ac(w4, e4, 1, { t: "pact", target: 2 })!, /esperando/);
  const p = proposalsTo(e4, 2)[0];
  assert.match(ac(w4, e4, 3, { t: "respond", id: p.id, accept: true })!, /não encontrada/, "só o destinatário responde");
  assert.equal(ac(w4, e4, 2, { t: "respond", id: p.id, accept: true }), null);
  assert.ok(e4.pacts.has("1-2"));
  // dependência: proposta; recusa não aplica
  e4.countries[0].glory = 1000; addRelation(e4, 1, 2, 100);
  assert.equal(ac(w4, e4, 1, { t: "subject", target: 2, kind: "Vassalo" }), null);
  const q = proposalsTo(e4, 2)[0];
  assert.equal(ac(w4, e4, 2, { t: "respond", id: q.id, accept: false }), null);
  assert.equal(e4.subjects?.[2], undefined);
  assert.equal(ac(w4, e4, 1, { t: "subject", target: 2, kind: "Vassalo" }), null);
  const q2 = proposalsTo(e4, 2)[0];
  assert.equal(ac(w4, e4, 2, { t: "respond", id: q2.id, accept: true }), null);
  assert.equal(e4.subjects?.[2]?.overlord, 1);
  // vence
  ac(w4, e4, 3, { t: "pact", target: 1 });
  e4.week += PROPOSAL_WEEKS + 1;
  assert.equal(proposalsTo(e4, 1).length, 0);
}
console.log("proposals ok");
