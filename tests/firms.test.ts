import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, BUILDINGS, GOODS } from "../src/economy.ts";
import { TECHS } from "../src/tech.ts";
import { methodsOf, activeMethods, setMethod, combine, methodKey, CATEGORIES } from "../src/methods.ts";
import { ledgerOf, privatize, nationalize, FIRM } from "../src/firms.ts";
import { POP_RULES } from "../src/pops.ts";

// todo edifício tem as 5 categorias; todo método pede tecnologia que existe e bens que existem
const techs = new Set(TECHS.map((t) => t.name));
for (const b of BUILDINGS) {
  const lists = methodsOf(b.name);
  assert.equal(lists.length, CATEGORIES.length, b.name);
  for (const list of lists) for (const m of list) {
    assert.ok(!m.tech || techs.has(m.tech), `${b.name}/${m.name}: tecnologia ${m.tech}`);
    for (const [g] of [...(m.inputs ?? []), ...(m.extra ?? [])]) assert.ok(GOODS.includes(g), `${m.name}: bem ${g}`);
  }
}

const w = generateWorld(200, 100, 4, 2), e = createEconomy(w), c = e.countries[0];
const farm = BUILDINGS.findIndex((b) => b.name === "Fazenda"), GRAIN = GOODS.indexOf("Grãos"), CATTLE = GOODS.indexOf("Gado");
const hex = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i] && e.market[i] === 1)!;
w.resource[hex] = GRAIN; w.resource2[hex] = 0; w.pop[hex] = 1e4; e.levels[farm][hex] = 4; e.producers.add(hex);
for (const i of e.owned) if (e.market[i] === 1 && i !== hex) { for (const l of e.levels) l[i] = 0; } // só a fazenda produz no mercado
const key = methodKey(hex, farm);

// método travado pela tecnologia
assert.match(setMethod(e, key, "Fazenda", 2, 2, c.research.known)!, /Arado pesado/);
// Arado: menos trabalhadores, pede gado; sem gado no mercado, o bônus não vem
c.research.known.add("Domesticação");
assert.equal(setMethod(e, key, "Fazenda", 2, 1, c.research.known), null);
const fx = combine(activeMethods(e, key, "Fazenda", c.research.known));
assert.ok(fx.workers < 1 && fx.inputs.get("Gado")! > 0);
tick(w, e);
const l = ledgerOf(e, key)!;
assert.ok(l.workers > 0 && l.rev > 0);
assert.equal(l.inputs, 0, "sem gado: nada comprado");
const plain = l.produced;
// com gado no mercado, o bônus aparece e o insumo é pago
const pasture = BUILDINGS.findIndex((b) => b.name === "Pasto"), h2 = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i] && e.market[i] === 1 && i !== hex)!;
w.resource[h2] = CATTLE; w.resource2[h2] = 0; w.pop[h2] = 1e4; e.levels[pasture][h2] = 5; e.producers.add(h2);
tick(w, e);
assert.ok(l.inputs > 0, "gado comprado");
assert.ok(l.produced > plain, "bônus do arado com gado");

// conta: lucro = receita − insumos − salários − manutenção − impostos; salário = parte do trabalho no valor agregado
assert.ok(Math.abs(l.profit - (l.rev - l.inputs - l.wages - l.upkeep - l.tax)) < 1e-9);
assert.ok(Math.abs(l.wages - Math.max(0, l.rev - l.inputs) * (1 - POP_RULES.ownerShare)) < 1e-9);
// reserva enche até a meta; o resto vira dividendos (organização comunitária: nada vai ao tesouro)
for (let k = 0; k < 20; k++) tick(w, e);
assert.ok(l.reserve > 0 && l.reserve <= FIRM.reserveWeeks * (l.inputs + l.wages + l.upkeep) + 1e-6);
assert.equal(l.toState, 0);
// organização estatal: o lucro livre vai ao tesouro e sai da renda dos donos
c.research.known.add("Escrita");
const orgs = methodsOf("Fazenda")[3], estatal = orgs.findIndex((m) => m.state);
assert.equal(setMethod(e, key, "Fazenda", 3, estatal, c.research.known), null);
l.reserve = 1e6; const t0 = c.treasury;
tick(w, e);
assert.ok(l.toState > 0 && (c.ownersTake ?? 0) >= l.toState - 1e-9, "estatal manda o lucro ao tesouro");
assert.ok(c.treasury > t0 - 1e5);

// privatizar (o fundo paga ao tesouro) e nacionalizar (o tesouro indeniza, legitimidade cai)
c.investPool = 0;
assert.match(privatize(w, e, 1, hex, farm, 2)!, /fundo/);
c.investPool = 1e5; c.treasury = 1e5;
assert.equal(privatize(w, e, 1, hex, farm, 2), null);
assert.equal(l.priv, 2);
assert.ok(c.investPool < 1e5 && c.treasury > 1e5);
const leg = c.politics.legitimacy;
assert.equal(nationalize(w, e, 1, hex, farm, 1), null);
assert.equal(l.priv, 1);
assert.ok(c.politics.legitimacy < leg || leg === 0);
assert.match(nationalize(w, e, 1, hex, farm, 5)!, /tantos/);
console.log("firms ok");
