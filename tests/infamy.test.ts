import assert from "node:assert/strict";
import { createEconomy, tick, proposePact, hasPact, INFAMY } from "../src/economy.ts";
import { declareWar, makePeace } from "../src/war.ts";
import { TECHS } from "../src/tech.ts";
import { generateWorld } from "../src/world.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
const [a, b, c] = e.countries;

// declarar guerra dá infâmia a quem declara, não a quem apanha
declareWar(e, 1, 2);
assert.equal(a.infamy, INFAMY.declareWar);
assert.equal(b.infamy, 0);

// tomar território na paz dá infâmia por hex tomado
const hex = [...e.owned].find((i) => w.owner[i] === 2 && i !== e.cities[1].hex && w.terrain[i] !== 0)!;
e.occupier[hex] = 1; w.pop[hex] += 1e5; // vitória clara
assert.equal(makePeace(w, e, 1, 2), null);
assert.equal(w.owner[hex], 1);
assert.equal(a.infamy, INFAMY.declareWar + INFAMY.perHexTaken);

// a infâmia cai com o tempo
const before = a.infamy;
tick(w, e);
assert.ok(Math.abs(a.infamy - (before - INFAMY.decayWeek)) < 1e-9);

// infâmia alta: ninguém fecha acordo; muito alta: acordos existentes caem
assert.equal(proposePact(e, 2, 3), null);
a.infamy = INFAMY.noPacts;
assert.match(proposePact(e, 1, 3)!, /infâmia/);
assert.match(proposePact(e, 3, 1)!, /infâmia/); // vale dos dois lados
b.infamy = INFAMY.pactsBreak + 1;
tick(w, e);
assert.ok(!hasPact(e, 2, 3), "acordo com país infame deveria cair");
assert.equal(c.infamy, 0);

// armas temidas dão infâmia ao serem descobertas
const mg = TECHS.find((t) => t.name === "Metralhadora")!;
assert.ok((mg.infamy ?? 0) > 0);
const r = c.research;
for (const q of TECHS) if (q !== mg) r.known.add(q.name); // tudo menos a metralhadora
r.era = mg.era; r.researching = mg.name; r.progress.set(mg.name, mg.cost - 0.001); // falta um tiquinho
const infamyBefore = c.infamy;
tick(w, e);
assert.ok(r.known.has("Metralhadora"));
assert.ok(Math.abs(c.infamy - Math.max(0, infamyBefore + mg.infamy! - INFAMY.decayWeek)) < 1e-9, "descobrir a metralhadora não deu infâmia");
console.log("infamy ok");
