import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, build, BUILDINGS, GOODS } from "../src/economy.ts";
import { applyCommand } from "../src/commands.ts";
import { hasIncentive, adminCap, INCENTIVES, ADMIN, socialComplexity, incentiveCost, canIncentive, progressOf, incFx, stepAdmin } from "../src/admin.ts";
import { stepEvents } from "../src/events.ts";

const w = generateWorld(200, 100, 9, 2), e = createEconomy(w), c = e.countries[0], city = e.cities[0];
tick(w, e);
// centro administrativo com papel no mercado gera pontos; sem papel, nada
c.research.known.add("Escrita"); c.treasury = 1e5;
const center = BUILDINGS.findIndex((b) => b.name === "Centro administrativo");
assert.equal(build(w, e, city.hex, center), null);
w.pop[city.hex] = 1e5;
const sawB = BUILDINGS.findIndex((b) => b.name === "Serraria");
for (const i of e.owned) if (e.market[i] === 1) e.levels[sawB][i] = 0; // serraria com aproveitamento de resíduos faz papel
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
assert.match(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Alívio emergencial" })!, /Faltam/);
c.admin = 100;
const fc = incentiveCost(e, "Alívio emergencial", [0], false);
assert.ok(fc.cost >= INCENTIVES["Alívio emergencial"].cost, "complexidade só encarece");
assert.equal(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Alívio emergencial" }), null);
assert.ok(Math.abs(c.admin - (100 - fc.cost)) < 1e-9);
assert.ok(hasIncentive(e, 0, "Alívio emergencial"));
assert.match(applyCommand(w, e, 1, { t: "incentive", city: e.cities.findIndex((k) => k.country === 2), kind: "Integração" })!, /inválido/);
// alívio emergencial: cidade com fome não perde gente
const region = [...e.owned].filter((i) => e.market[i] === 1), pop = () => region.reduce((s, i) => s + w.pop[i], 0);
city.market.supply.fill(0); city.market.need.fill(10); city.market.pop = 1e4;
const before = pop(); stepEvents(w, e);
assert.equal(pop(), before, "alívio emergencial deveria impedir mortes de fome");
// desligar
assert.equal(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Alívio emergencial", off: true }), null);
assert.ok(!hasIncentive(e, 0, "Alívio emergencial"));

// Complexidade Social: custo = base × (1 + C/100); estado +25% (sem multiplicar pelas cidades)
const sc = socialComplexity(e, [0]);
assert.ok(sc >= 0);
assert.ok(Math.abs(incentiveCost(e, "Integração", [0], false).cost - INCENTIVES["Integração"].cost * (1 + sc / 100)) < 1e-9);
assert.ok(Math.abs(incentiveCost(e, "Integração", [0], true).cost / incentiveCost(e, "Integração", [0], false).cost - ADMIN.stateMult) < 1e-9);
// grupo de foco econômico: só um por território
c.admin = 1000;
assert.equal(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Incentivar agricultura" }), null);
assert.match(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Incentivar extração" })!, /Não combina/);
// requisito: formação profissional precisa de oficina ou indústria na região
assert.equal(canIncentive(e, 1, "Formação profissional", { city: 0 }) === null, [...e.producers].some((i) => e.market[i] === 1 && BUILDINGS.some((b, k) => b.industry && e.levels[k][i])));
// efeito gradual: começa pequeno, chega ao cheio no fim do ramp
const x = e.incentives!.find((y) => y.kind === "Incentivar agricultura")!;
assert.ok(progressOf(e, x) < 1);
e.week += INCENTIVES["Incentivar agricultura"].ramp; assert.equal(progressOf(e, x), 1);
assert.ok(Math.abs(incFx(e, 0, "farm") - 0.2) < 1e-9);
// permanente: alfabetização acumula e fica depois de cancelar; temporário some
c.research.known.add("Escrita");
assert.equal(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Campanha de alfabetização" }), null);
e.week += 60; for (let k = 0; k < 10; k++) stepAdmin(e);
const lit = c.incLiteracy ?? 0; assert.ok(lit > 0, "alfabetização acumulou");
applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Campanha de alfabetização", off: true });
applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Incentivar agricultura", off: true });
stepAdmin(e);
assert.ok((c.incLiteracy ?? 0) >= lit, "fica depois de cancelar");
assert.equal(incFx(e, 0, "farm"), 0, "bônus temporário some");
// prazo: passa do máximo, acaba sozinho
assert.equal(applyCommand(w, e, 1, { t: "incentive", city: 0, kind: "Alívio emergencial" }), null);
e.week += INCENTIVES["Alívio emergencial"].max; stepAdmin(e);
assert.ok(!hasIncentive(e, 0, "Alívio emergencial"));
// desempenho: muitos incentivos, consulta por cidade barata
const t0 = performance.now(); for (let k = 0; k < 20000; k++) incFx(e, 0, "farm"); assert.ok(performance.now() - t0 < 1000);
console.log("admin ok");
