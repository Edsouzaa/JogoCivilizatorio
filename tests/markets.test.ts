import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, GOODS, BUILDINGS } from "../src/economy.ts";
import { releaseStock, storeSurplus, updateAccess, updateNodes, powerShare, advantage, complexityTarget, complexityCost, commerceOf, policyOf, MARKET } from "../src/markets.ts";
import { applyCommand } from "../src/commands.ts";
import { queueBuild } from "../src/construction.ts";

const w = generateWorld(300, 150, 2, 4), e = createEconomy(w);
for (let k = 0; k < 4; k++) tick(w, e);
const grain = GOODS.indexOf("Grãos"), tools = GOODS.indexOf("Ferramentas");

// estoque: encalhe é guardado até a capacidade, comida estraga mais que o resto, e volta à venda aos poucos
const k0 = e.cities[0], m = k0.market;
m.supply.fill(0); m.used.fill(0); m.demand.fill(0); m.stock!.fill(0);
m.supply[grain] = 10; m.supply[tools] = 10;
storeSurplus(e);
assert.ok(m.stock![grain] > 0 && m.stock![grain] < m.stock![tools], "comida estraga mais");
m.supply[grain] = 1e6; storeSurplus(e);
const cap = MARKET.storagePerSize * k0.size * (1 + e.countries[0].research.era / 2);
assert.ok(m.stock![grain] <= cap + 1e-9, "estoque limitado");
const before = m.stock![tools]; m.supply.fill(0); releaseStock(e);
assert.ok(m.supply[tools] > 0 && m.stock![tools] < before, "estoque volta à venda");

// acesso: capital 1; cidade isolada perde metade
updateAccess(w, e);
const cap1 = e.cities.find((k) => k.country === 1)!;
assert.equal(cap1.access, 1);
const other = e.cities.find((k) => k.country === 1 && k !== cap1);
if (other) { const a = other.access!; other.isolated = true; updateAccess(w, e); assert.ok(other.access! < a || other.access === 0.05); other.isolated = false; }

// estruturas comerciais: mercado local aumenta estoque e poder no nó
updateNodes(w, e);
const mk = BUILDINGS.findIndex((d) => d.name === "Mercado local");
assert.ok(commerceOf(mk)!.storage > 0);
const n0 = e.tradeNodes!.find((n) => n.id === cap1.node)!, p0 = n0.power[1];
e.levels[mk][cap1.urban[0]] = 3; updateNodes(w, e);
assert.ok(e.tradeNodes!.find((n) => n.id === cap1.node)!.power[1] > p0, "estrutura dá poder comercial");
e.levels[mk][cap1.urban[0]] = 0;
// poder: parte entre 0 e 1, complementares
const ps = powerShare(e, 1, 2);
assert.ok(ps >= 0 && ps <= 1 && Math.abs(ps + powerShare(e, 2, 1) - 1) < 1e-9);
// vantagem: tarifa alta reduz
const a0 = advantage(e, 1, 1, 0); e.countries[0].tariffRate = 0.5;
assert.ok(advantage(e, 1, 1, 0) < a0); e.countries[0].tariffRate = undefined;

// política por mercadoria: comando valida e grava; "Livre" apaga
assert.equal(applyCommand(w, e, 1, { t: "tradePolicy", good: "Nada", policy: "Livre" }), "Política inválida");
assert.equal(applyCommand(w, e, 1, { t: "tradePolicy", good: "Grãos", policy: "Proibir exportação" }), null);
assert.equal(policyOf(e.countries[0], grain), "Proibir exportação");
applyCommand(w, e, 1, { t: "tradePolicy", good: "Grãos", policy: "Livre" });
assert.equal(e.countries[0].tradePolicy!["Grãos"], undefined);

// complexidade: alvo entre 0 e 1000 (known é um Set: cada tecnologia conta uma vez); encarece mais construção sofisticada
const c = e.countries[0], t0 = complexityTarget(w, e, 1);
assert.ok(t0 > 0 && t0 <= 1000);
c.complexity = 800;
const farm = BUILDINGS.findIndex((d) => d.name === "Fazenda"), steel = BUILDINGS.findIndex((d) => d.name === "Siderúrgica");
assert.ok(complexityCost(c, steel) > complexityCost(c, farm) && complexityCost(c, farm) > 1);
c.complexity = 0;
const ok = queueBuild(w, e, cap1.urban[0], farm);
if (ok === null) { const p = e.construction!.at(-1)!; const base = p.cost; e.construction!.pop(); c.complexity = 1000; queueBuild(w, e, cap1.urban[0], farm); assert.ok(e.construction!.at(-1)!.cost > base); e.construction!.pop(); }
c.complexity = 0;

for (let k = 0; k < 8; k++) tick(w, e);
assert.ok(e.countries.every((x) => Number.isFinite(x.complexity!) && x.complexity! >= 0));
console.log("markets ok");
