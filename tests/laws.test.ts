import assert from "node:assert/strict";
import { LAWS, proposeLaw, lawFx, newPolitics } from "../src/politics.ts";
import { TECHS } from "../src/tech.ts";
import { generateWorld } from "../src/world.ts";
import { createEconomy, migrate } from "../src/economy.ts";

// toda lei pede tecnologia que existe; a primeira de cada categoria é tribal e sem exigência (todo país começa nela)
const techs = new Set(TECHS.map((t) => t.name));
for (const [cat, list] of Object.entries(LAWS)) {
  assert.equal(list[0].era, 0, `${cat}: primeira lei tribal`);
  assert.ok(!list[0].tech, `${cat}: primeira lei sem tecnologia`);
  for (const l of list) assert.ok(!l.tech || techs.has(l.tech), `${l.name}: tecnologia ${l.tech}`);
}
assert.ok(Object.keys(LAWS).length >= 13, "categorias novas");

// desbloqueio por era e por tecnologia
const p = newPolitics(), known = new Set<string>();
assert.match(proposeLaw(p, "Governo", "Monarquia", 0, known)!, /era/);
assert.match(proposeLaw(p, "Governo", "Monarquia", 1, known)!, /Direito escrito/);
assert.match(proposeLaw(p, "Governo", "Chefia com conselho", 0, known)!, /Conselho de anciãos/);
known.add("Conselho de anciãos");
assert.equal(proposeLaw(p, "Governo", "Chefia com conselho", 0, known), null);
assert.match(proposeLaw(p, "Justiça", "Justiça religiosa", 1, new Set(["Escrita"]))!, /Já está votando/, "uma votação por vez");

// efeitos: valem por inteiro com controle total e pela metade sem controle (implementação gradual)
p.enacting = null; p.laws["Administração"] = "Burocracia profissional";
assert.ok(Math.abs(lawFx(p, "control", 1) - 0.08) < 1e-9);
assert.ok(Math.abs(lawFx(p, "control", 0) - 0.04) < 1e-9);
p.laws["Trabalho"] = "Trabalho servil";
assert.ok(lawFx(p, "unrest") > 0 && lawFx(p, "manpower") > 0, "servidão: mais recrutas, mais agitação");

// imigração: fronteiras fechadas não recebem ninguém
{
  const w = generateWorld(200, 100, 3, 2), e = createEconomy(w);
  const [a, b] = e.countries;
  for (const c of e.countries) c.pops.count.fill(0);
  a.pops.count[2] = 100; b.pops.count[2] = 100; a.pops.income[2] = 1; b.pops.income[2] = 1000; a.pops.qol[2] = 5; b.pops.qol[2] = 50; // b é muito melhor
  b.politics.laws["Imigração"] = "Fronteiras fechadas";
  migrate(w, e);
  assert.ok(!(b.migration > 0), "fronteira fechada: ninguém chega");
}
console.log("laws ok");
