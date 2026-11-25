import assert from "node:assert/strict";
import { generateWorld, T } from "../src/world.ts";
import { createEconomy, tick, GOODS, type Division } from "../src/economy.ts";
import { declareWar, atWar, stepWar, airRegion } from "../src/war.ts";
import { seaWeather, resolveNaval, convoyFactor, bombardMods, SEA } from "../src/seawar.ts";
import { stepAir, airRecon, AIRW } from "../src/airwar.ts";

const w = generateWorld(300, 150, 2, 4), e = createEconomy(w);
const sea = [...Array(300 * 150).keys()].filter((i) => w.terrain[i] === T.OCEAN);
let nid = 5000;
const fleet = (country: number, hex: number, unit = "Galés", mission?: string): Division =>
  ({ id: nid++, kind: "fleet", country, hex, strength: 20, org: 1, target: null, progress: 0, equip: 1, unit, mission });

// tempo do mar: determinístico e varia (tempestade em algum lugar ao longo do ano)
const kinds = new Set<string>();
for (let wk = 0; wk < 52; wk++) for (const h of sea.filter((_, k) => k % 97 === 0)) kinds.add(seaWeather(w, h, wk));
assert.ok(kinds.has("tempestade") && kinds.has("calmo"));
assert.equal(seaWeather(w, sea[10], 7), seaWeather(w, sea[10], 7));

// batalha naval com dados: rolagens no histórico; submarinos emboscam quem não tem
declareWar(e, 1, 2);
const z = sea[sea.length >> 1];
const subs = fleet(1, z, "Submarinos"), gal = fleet(2, z, "Galés");
e.divisions.push(subs, gal);
resolveNaval(w, e, (a, b) => atWar(e, a, b), (ds, n) => { for (const d of ds) d.strength -= n / ds.length; }, () => -1);
const nb = e.battles!.find((b) => b.naval)!;
assert.ok(nb && nb.log.length > 0, "batalha naval registrada");
const subSide = nb.attacker === 1 ? nb.log[0].att : nb.log[0].def;
assert.ok(subSide.mods.some(([n]) => n === "Emboscada submarina"));
assert.ok(subSide.roll >= 1 && subSide.roll <= 10);
// derrotada e sem porto: afunda; com porto: volta para reparo
gal.org = 0; e.week++;
resolveNaval(w, e, (a, b) => atWar(e, a, b), () => {}, () => -1);
assert.equal(gal.strength, 0, "sem porto: afunda");
e.divisions = e.divisions.filter((d) => d.kind !== "fleet");

// comboio: exército em outro continente recebe só parte; escolta ajuda; frota inimiga perto atrapalha
const cont = w.continent!, cap = e.cities[0].hex;
const other = [...Array(300 * 150).keys()].find((i) => w.terrain[i] !== T.OCEAN && cont[i] && cont[i] !== cont[cap])!;
const army: Division = { id: nid++, kind: "army", country: 1, hex: other, strength: 25, org: 1, target: null, progress: 0, equip: 1 };
const alone = convoyFactor(w, e, army, cap, (a, b) => atWar(e, a, b));
assert.ok(alone < 1 && alone > 0, "além-mar: comboio entrega só parte");
assert.equal(convoyFactor(w, e, { ...army, hex: cap }, cap, (a, b) => atWar(e, a, b)), 1, "mesmo continente: não depende de mar");
e.divisions.push(fleet(1, sea[0], "Galés", "Escolta de comboios"));
const escorted = convoyFactor(w, e, army, cap, (a, b) => atWar(e, a, b));
assert.ok(escorted > alone, "escolta melhora");
e.divisions.push({ ...fleet(2, other + 1, "Submarinos"), hex: other });
assert.ok(convoyFactor(w, e, army, cap, (a, b) => atWar(e, a, b)) < escorted, "submarino inimigo perto intercepta");
e.divisions = [];

// bombardeio costeiro: frota com a missão na zona colada dá +1 na batalha do litoral
const shore = [...Array(300 * 150).keys()].find((i) => w.terrain[i] !== T.OCEAN && w.terrain[i + 1] === T.OCEAN)!;
e.divisions.push(fleet(1, shore + 1, "Galés", "Bombardeio costeiro"));
assert.deepEqual(bombardMods(w, e, { hex: shore } as never, 1), [["Bombardeio naval", SEA.bombard]]);
assert.deepEqual(bombardMods(w, e, { hex: shore } as never, 2), []);
e.divisions = [];

// aviação: sem combustível não voa; com combustível, bombardeio estratégico derruba a produção da cidade inimiga
const capB = e.cities.find((k) => k.country === 2)!;
const plane: Division = { id: nid++, kind: "air", country: 1, hex: cap, strength: 10, org: 1, target: capB.hex, progress: 0, equip: 1, unit: "Caças", mission: "Bombardeio estratégico" };
e.divisions.push(plane);
tick(w, e); for (const k of e.cities) k.market.supply[GOODS.indexOf("Combustível")] = 0;
stepAir(w, e, (h) => airRegion(e, h), (a, b) => atWar(e, a, b));
assert.equal(plane.ready, 0, "sem combustível, no chão");
for (const k of e.cities) k.market.supply[GOODS.indexOf("Combustível")] = 100;
stepAir(w, e, (h) => airRegion(e, h), (a, b) => atWar(e, a, b));
assert.ok(plane.ready! > 0 && (capB.bombed ?? -1) >= e.week, "bombardeio marca a cidade");
assert.ok(AIRW.bombing > 0);
// reconhecimento aéreo sobre a região
plane.mission = "Reconhecimento";
stepAir(w, e, (h) => airRegion(e, h), (a, b) => atWar(e, a, b));
assert.ok(plane.ready! < 0.3 || airRecon(e, airRegion(e, capB.hex), 1, (h) => airRegion(e, h)));
stepWar(w, e);
console.log("sea and air ok");
