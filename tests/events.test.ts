import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { stepEvents, EVENTS } from "../src/events.ts";

const w = generateWorld(200, 100, 2, 2), e = createEconomy(w);
tick(w, e);
const k = 0, region = [...e.owned].filter((i) => e.market[i] === k + 1);
const pop = () => region.reduce((s, i) => s + w.pop[i], 0);
// fome: mercado sem comida → avisa uma vez e mata gente enquanto durar
for (const m of [e.cities[k].market]) { m.supply.fill(0); m.need.fill(10); m.pop = 1e3; }
let before = pop();
const news = stepEvents(w, e);
assert.ok(news.some((n) => n.kind === "fome" && n.city === k));
assert.ok(pop() < before);
assert.ok(!stepEvents(w, e).some((n) => n.kind === "fome" && n.city === k), "fome já avisada");
// peste: dura plagueWeeks e mata; medicina corta as mortes pela metade
e.cities[k].market.need.fill(0); e.famine![k] = false;
e.plague![k] = 3; before = pop();
stepEvents(w, e);
const plain = before - pop();
assert.ok(plain > 0 && e.plague![k] === 2);
e.countries[e.cities[k].country - 1].research.known.add("Medicina moderna");
before = pop(); stepEvents(w, e);
assert.ok(Math.abs((before - pop()) / before - (EVENTS.plagueDeath / 2) * 0.7) < 1e-6); // metade pela medicina e −30% da tecnologia (plague)
console.log("events ok");
