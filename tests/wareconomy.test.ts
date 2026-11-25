import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick, BUILDINGS, GOODS } from "../src/economy.ts";
import { declareWar } from "../src/war.ts";
import { setWarEconomy, setConversion, warMult, convertedOutputs, exportBlocked, WAR_ECON, stepWarEconomy } from "../src/wareconomy.ts";
import { privateShare } from "../src/construction.ts";

const w = generateWorld(200, 100, 3, 2), e = createEconomy(w), c = e.countries[0];
const armeiro = BUILDINGS.findIndex((b) => b.name === "Armeiro"), olaria = BUILDINGS.findIndex((b) => b.name === "Olaria"), machines = BUILDINGS.findIndex((b) => b.name === "Fábrica de máquinas");
const IRON = GOODS.indexOf("Ferro"), GRAIN = GOODS.indexOf("Grãos");

// paz: nada muda
assert.equal(warMult(e, 1, armeiro), 1);
assert.equal(exportBlocked(e, 1, IRON), false);
// guerra total só em guerra; conversão só mobilizado
assert.match(setWarEconomy(e, 1, 2, false)!, /durante uma guerra/);
assert.match(setConversion(e, 1, true)!, /economia de guerra/);
c.politics.laws["Economia"] = "Livre comércio";
const priv0 = privateShare(e, 1);
assert.equal(setWarEconomy(e, 1, 1, false), null);
assert.equal(warMult(e, 1, armeiro), 1 + WAR_ECON.military[1], "militar produz mais");
assert.equal(warMult(e, 1, olaria), 1, "civil igual na guerra");
assert.ok(exportBlocked(e, 1, IRON) && !exportBlocked(e, 1, GRAIN), "só estratégicos ficam");
assert.equal(privateShare(e, 1), priv0 * WAR_ECON.privateCut[1]);
assert.equal(convertedOutputs(e, 1, machines), null, "sem conversão");
assert.equal(setConversion(e, 1, true), null);
assert.equal(GOODS[convertedOutputs(e, 1, machines)![0][0]], "Armas", "máquinas viram armas");
// custo político: sem guerra declarada, cai o dobro
const leg = c.politics.legitimacy = 0.5;
stepWarEconomy(e, () => false);
assert.ok(Math.abs(c.politics.legitimacy - (leg - 2 * WAR_ECON.legitimacyWeek[1])) < 1e-9);
// guerra total: civil cai, fila privada para, preço estratégico tabelado; acabou a guerra, volta um degrau
declareWar(e, 1, 2);
assert.equal(setWarEconomy(e, 1, 2, true), null);
assert.equal(warMult(e, 1, olaria), 1 + WAR_ECON.civilian[2]);
assert.equal(privateShare(e, 1), 0);
tick(w, e);
for (const k of e.cities) if (k.country === 1) assert.ok(k.market.price[IRON] <= WAR_ECON.priceCap + 1e-9, "ferro tabelado");
stepWarEconomy(e, () => false);
assert.equal(c.warEconomy, 1, "sem guerra, a guerra total desmobiliza");
assert.equal(setWarEconomy(e, 1, 0, false), null);
assert.equal(c.conversion, false);
console.log("war economy ok");
