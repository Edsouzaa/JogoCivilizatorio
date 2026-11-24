import assert from "node:assert/strict";
import { runAI, siteScore, bestSite } from "./ai.ts";
import { createEconomy, tick } from "./economy.ts";
import { stepWar } from "./war.ts";
import { generateWorld } from "./world.ts";

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
console.log(`ai ok (${cities0} → ${e.cities.length} cidades, ${e.divisions.filter((d) => d.kind === "army").length} divisões, ${e.wars.size} guerras)`);
