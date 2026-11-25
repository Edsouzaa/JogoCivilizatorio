import assert from "node:assert/strict";
import { generateWorld, isLand, RESOURCES } from "../src/world.ts";
import { createEconomy, foundCity, refresh, borderRadius, tick } from "../src/economy.ts";
import { pathDistance, distanceMult, foundingCost, buildOutpost, updateExpansion, buyHex, hexPrice, EXPAND } from "../src/expansion.ts";
import { hexDistance, forNeighbors } from "../src/hex.ts";
import { relation } from "../src/diplomacy.ts";
import { applyCommand } from "../src/commands.ts";

const w = generateWorld(200, 100, 9, 2), e = createEconomy(w);
const cap = e.cities[0].hex, c = e.countries[0];
const d = (a: number, b: number) => hexDistance(a % 200, (a / 200) | 0, b % 200, (b / 200) | 0, 200);
// distância por caminho e multiplicador crescente
assert.equal(pathDistance(w, e, 1, cap), 0);
assert.ok(distanceMult(2) < distanceMult(8) && distanceMult(8) < distanceMult(20));
const land = [...Array(200 * 100).keys()].filter((i) => isLand(w.terrain[i]) && !w.owner[i]);
const near = land.find((i) => d(i, cap) === 5)!, far = land.filter((i) => d(i, cap) >= 14).sort((a, b) => d(a, cap) - d(b, cap))[0];
const fn = foundingCost(w, e, 1, near, RESOURCES), ff = foundingCost(w, e, 1, far, RESOURCES);
assert.ok(ff.cost > fn.cost, `longe deveria custar mais (${ff.cost} vs ${fn.cost})`);
// fundar cobra o custo; sem dinheiro não funda
const settler = (hex: number) => { const s = { id: 900 + e.divisions.length, kind: "settler" as const, country: 1, hex, strength: 20, org: 1, target: null, progress: 0, equip: 1 }; e.divisions.push(s); return s.id; };
c.treasury = 0;
const sNear = settler(near);
assert.match(foundCity(w, e, sNear)!, /custa/);
c.treasury = 1e4;
assert.equal(foundCity(w, e, sNear), null);
assert.equal(c.treasury, 1e4 - fn.cost);
const sFar = settler(far); // sem limite de cidades a cada 2 anos: os colonos seguem para virar posto avançado
// posto avançado: reivindica o hex e vira âncora (fundar perto dele fica mais barato)
const target = land.find((i) => d(i, far) === 4 && d(i, cap) > 12) ?? far;
const before = foundingCost(w, e, 1, target, RESOURCES).cost;
assert.equal(buildOutpost(w, e, sFar), null);
assert.equal(w.owner[far], 1);
assert.ok(foundingCost(w, e, 1, target, RESOURCES).cost <= before);
// área de influência e isolamento calculados no mês
refresh(w, e); updateExpansion(w, e, borderRadius);
assert.equal(typeof e.cities.find((k) => k.hex === near)!.isolated, "boolean");
assert.ok(e.influence!.some((v) => v === 1), "influência deveria cobrir hexes livres");
// compra de hex: só livre e colado; preço sobe com o tamanho; vizinho que se expandia ali fica com relação pior
const free = land.find((i) => { if (w.owner[i]) return false; let t = false; forNeighbors(i % w.W, (i / w.W) | 0, w.W, w.H, (j) => { if (w.owner[j] === 1) t = true; }); return t; })!;
const p0 = hexPrice(w, e, 1);
assert.match(buyHex(w, e, 1, cap)!, /dono/);
e.influence![free] = 2; c.treasury = 1e4;
assert.equal(buyHex(w, e, 1, free), null);
assert.equal(w.owner[free], 1);
assert.ok(hexPrice(w, e, 1) >= p0);
assert.equal(relation(e, 1, 2), -EXPAND.contested);
// cidade do hex escolhida à mão (como no Civilization): vale até voltar ao automático
const kNear = e.cities.findIndex((k) => k.hex === near), hx = [...e.owned].find((j) => w.owner[j] === 1 && !e.urban[j] && e.market[j] && e.market[j] !== kNear + 1)!;
assert.equal(applyCommand(w, e, 1, { t: "assignHex", hex: hx, city: near }), null);
assert.equal(e.market[hx], kNear + 1);
assert.equal(applyCommand(w, e, 1, { t: "assignHex", hex: hx, city: 12345 }), "Cidade não é sua");
applyCommand(w, e, 1, { t: "assignHex", hex: hx, city: -1 });
assert.equal(e.hexCity![hx], undefined);
tick(w, e);
console.log("expansion ok");
