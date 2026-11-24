import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, build, BUILDINGS, GOODS } from "../src/economy.ts";
import { applyCommand } from "../src/commands.ts";
import { hasIncentive, adminCap, INCENTIVES, ADMIN } from "../src/admin.ts";
import { stepEvents } from "../src/events.ts";

const w = generateWorld(200, 100, 9, 2), e = createEconomy(w), c = e.countries[0], city = e.cities[0];
tick(w, e);
// centro administrativo com papel no mercado gera pontos; sem papel, nada
c.research.known.add("Escrita"); c.treasury = 1e5;
const center = BUILDINGS.findIndex((b) => b.name === "Centro administrativo");
assert.equal(build(w, e, city.hex, center), null);
w.pop[city.hex] = 1e5;
tick(w, e);
assert.equal(c.adminWeek, 0, "sem papel não deveria gerar pontos");
// madeira no mercado: uma serraria num hex da região
const wood = [...e.owned].find((i) => e.market[i] === 1 && i !== city.hex)!, saw = BUILDINGS.findIndex((b) => b.name === "Serraria");
w.resource[wood] = GOODS.indexOf("Madeira"); w.resource2[wood] = 0; w.reserve[wood] = Infinity; e.levels[saw][wood] = 10; e.producers.add(wood); w.pop[wood] = 1e4;
assert.equal(build(w, e, city.hex, BUILDINGS.findIndex((b) => b.name === "Oficina de papel")), null);
for (let k = 0; k < 3; k++) tick(w, e);
assert.ok((c.adminWeek ?? 0) > 0 && (c.admin ?? 0) > 0, "papel + centro deveriam gerar pontos");
assert.ok((c.admin ?? 0) <= adminCap(e, 1));
assert.equal(ADMIN.capBase * (c.research.era + 1), adminCap(e, 1));

// incentivo: custa pontos, liga na cidade, tem manutenção; sem pontos, falha
c.admin = 5;
assert.match(applyCommand(w, e, 1, { t: "incentive", cities: [0], kind: "Alívio emergencial" })!, /Faltam/);
c.admin = 100;
assert.equal(applyCommand(w, e, 1, { t: "incentive", cities: [0], kind: "Alívio emergencial" }), null);
assert.equal(c.admin, 100 - INCENTIVES["Alívio emergencial"].cost);
assert.ok(hasIncentive(e, 0, "Alívio emergencial"));
assert.match(applyCommand(w, e, 1, { t: "incentive", cities: [e.cities.findIndex((k) => k.country === 2)], kind: "Integração" })!, /inválido/);
// alívio emergencial: cidade com fome não perde gente
const region = [...e.owned].filter((i) => e.market[i] === 1), pop = () => region.reduce((s, i) => s + w.pop[i], 0);
city.market.supply.fill(0); city.market.need.fill(10); city.market.pop = 1e4;
const before = pop(); stepEvents(w, e);
assert.equal(pop(), before, "alívio emergencial deveria impedir mortes de fome");
// desligar
assert.equal(applyCommand(w, e, 1, { t: "incentive", cities: [0], kind: "Alívio emergencial", off: true }), null);
assert.ok(!hasIncentive(e, 0, "Alívio emergencial"));
console.log("admin ok");
