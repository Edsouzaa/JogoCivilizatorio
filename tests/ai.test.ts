import assert from "node:assert/strict";
import { runAI, siteScore, bestSite } from "../src/ai.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { stepWar } from "../src/war.ts";
import { generateWorld } from "../src/world.ts";

const w = generateWorld(300, 150, 2, 4), e = createEconomy(w);
for (const c of e.countries) c.treasury = 2000; // começa com algum dinheiro para a IA ter o que decidir

// lugar de cidade: só terra livre e longe de outros países
const site = bestSite(w, e, 1);
assert.ok(site >= 0, "IA sem lugar para expandir");
assert.ok(siteScore(w, site) > 0 && !w.owner[site]);
assert.equal(siteScore(w, e.cities[0].hex), -1); // hex com dono não serve

const levels = () => e.levels.reduce((s, l) => s + l.reduce((a, v) => a + v, 0), 0);
const cities0 = e.cities.length, levels0 = levels();
for (let week = 0; week < 52 * 15; week++) {
  tick(w, e);
  stepWar(w, e);
  if (e.week % 4 === 0) for (let k = 1; k <= e.countries.length; k++) runAI(w, e, k);
}
assert.ok(e.cities.length > cities0, `IA não fundou cidades (${e.cities.length})`);
assert.ok(levels() > levels0, "IA não construiu nada");
assert.ok(e.divisions.some((d) => d.kind === "army"), "IA não formou exército");
for (const c of e.countries) assert.ok(Number.isFinite(c.treasury) && Number.isFinite(c.debt), "economia quebrou");
// sem bola de neve política: exército e lealdade não podem derrubar o governo de todo mundo
for (const c of e.countries) assert.ok(c.politics.legitimacy > 0.2 && c.radicals < 0.5, `legitimidade ${c.politics.legitimacy.toFixed(2)}, radicais ${c.radicals.toFixed(2)}`);
console.log(`ai ok (${cities0} → ${e.cities.length} cidades, ${e.divisions.filter((d) => d.kind === "army").length} divisões, ${e.wars.size} guerras)`);

// investimento privado: o fundo cresce com o PIB pela lei de Economia e vira obra sem tirar do tesouro
{
  const { generateWorld: gw } = await import("../src/world.ts");
  const { createEconomy: ce, tick: tk } = await import("../src/economy.ts");
  const { privateInvest } = await import("../src/ai.ts");
  const w2 = gw(200, 100, 3, 2), e2 = ce(w2), c = e2.countries[0];
  tk(w2, e2);
  assert.equal(c.investWeek, 0, "Subsistência não investe");
  c.politics.laws["Economia"] = "Livre comércio";
  tk(w2, e2);
  assert.ok((c.investWeek ?? 0) > 0);
  c.investPool = 1e5; c.treasury = 50;
  const levels = () => e2.levels.reduce((s, l) => s + l.reduce((a, v) => a + v, 0), 0);
  const before = levels();
  privateInvest(w2, e2);
  assert.ok(levels() > before, "investidores deveriam construir");
  assert.equal(c.treasury, 50, "o tesouro não paga");
  assert.ok(c.investPool < 1e5);
}
console.log("private invest ok");
