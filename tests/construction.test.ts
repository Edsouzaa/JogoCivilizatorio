import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, buildingsFor, BUILDINGS, GOODS, SECTOR, RULES } from "../src/economy.ts";
import { queueBuild, queueOf, stepConstruction, cancelProject, cpCost, baseCp, CONSTRUCTION_METHODS, constructionMethod } from "../src/construction.ts";
import { applyCommand } from "../src/commands.ts";

const w = generateWorld(200, 100, 5, 2), e = createEconomy(w), c = e.countries[0];
const cap = e.cities[0].hex;
// um hex rural do país com uma construção possível
const hex = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i] && buildingsFor(w.resource[i], false, w.resource2[i]).length)!;
const b = buildingsFor(w.resource[hex], false, w.resource2[hex])[0];
w.pop[hex] = 1e4;
const lv0 = e.levels[b][hex]; // o país pode começar com construções

// obra não aparece na hora: entra na fila e anda com os pontos de construção
c.treasury = 1e4;
assert.equal(queueBuild(w, e, hex, b), null);
assert.equal(e.levels[b][hex], lv0, "construção não é instantânea");
assert.equal(queueOf(e, 1).length, 1);
const p = queueOf(e, 1)[0];
assert.equal(p.cp, cpCost(b));
c.cpWeek = 0; stepConstruction(w, e);
assert.ok(p.done > 0 && p.done <= baseCp(e, 1) + 1e-9, "anda só com a capacidade da semana");
assert.ok(Math.abs(c.treasury - (1e4 - p.paid)) < 1e-6 && p.paid < p.cost, "paga aos poucos");
for (let k = 0; k < 50 && queueOf(e, 1).length; k++) { c.cpWeek = 0; stepConstruction(w, e); }
assert.equal(e.levels[b][hex], lv0 + 1, "obra terminada vira nível");
assert.ok(Math.abs(c.treasury - (1e4 - RULES.buildCost * (lv0 + 1))) < 1e-6, "custo total = 100 × nível");

// cancelar tira da fila
queueBuild(w, e, hex, b);
const id = queueOf(e, 1)[0].id;
assert.match(cancelProject(e, 2, id)!, /não é sua/);
assert.equal(cancelProject(e, 1, id), null);
assert.equal(queueOf(e, 1).length, 0);

// limite físico: hex rural sem gente não aceita mais níveis
{ const keep = e.levels[b][hex]; e.levels[b][hex] = 250; assert.match(queueBuild(w, e, hex, b)!, /não comporta/); e.levels[b][hex] = keep; }

// fila privada: paga pelo fundo, não pelo tesouro; sem fundo, espera
c.politics.laws["Economia"] = "Livre comércio";
c.investPool = 0; const t0 = c.treasury;
queueBuild(w, e, hex, b, true);
c.cpWeek = 0; stepConstruction(w, e);
assert.equal(queueOf(e, 1)[0].waiting, "fundo sem dinheiro");
assert.equal(c.treasury, t0, "obra privada não mexe no tesouro");
c.investPool = 1e4;
for (let k = 0; k < 50 && queueOf(e, 1).length; k++) { c.cpWeek = 0; stepConstruction(w, e); }
assert.equal(e.levels[b][hex], lv0 + 2);
assert.ok(c.investPool < 1e4 && c.treasury === t0);

// construção em massa pelo comando: vários níveis de uma vez
assert.equal(applyCommand(w, e, 1, { t: "buildMany", hexes: [hex], b, levels: 3 }), null);
assert.equal(queueOf(e, 1).length, 3);
e.construction = [];

// setor de construção: só na cidade, gasta materiais do método da era e gera pontos
assert.match(queueBuild(w, e, hex, SECTOR)!, /cidade/);
e.levels[SECTOR][cap] = 5; e.producers.add(cap);
const m = e.cities[0].market, wood = GOODS.indexOf("Madeira");
// materiais da era tribal no mercado da capital: uma serraria e uma pedreira perto dela
const near = [...e.owned].filter((i) => w.owner[i] === 1 && !e.urban[i] && e.market[i] === 1 && i !== hex).slice(0, 2);
[["Madeira", "Serraria"], ["Pedra", "Mina"]].forEach(([g, bn], k) => {
  const i = near[k], bb = BUILDINGS.findIndex((x) => x.name === bn);
  w.resource[i] = GOODS.indexOf(g); w.resource2[i] = 0; w.pop[i] = 1e4; w.reserve[i] = Infinity; e.levels[bb][i] = 20; e.producers.add(i);
});
tick(w, e);
const method = CONSTRUCTION_METHODS[constructionMethod(c.research.era)];
assert.ok(m.used[wood] > 0, "setor consome madeira");
assert.ok((c.cpWeek ?? 0) > baseCp(e, 1), "setor soma pontos de construção");
assert.ok((c.cpWeek ?? 0) <= baseCp(e, 1) + 5 * method.cp * RULES.urbanIndustry * 2 + 1e-9);
assert.equal(BUILDINGS[SECTOR].name, "Setor de construção");
console.log("construction ok");
