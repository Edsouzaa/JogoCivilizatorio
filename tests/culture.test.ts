import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { applyCommand, ACCEPT_COST } from "../src/commands.ts";
import { shift, acceptedShare, stepCulture, countryMix, CULTURE } from "../src/culture.ts";

// shift: move gente para o alvo sem criar nem perder ninguém
const mix: Record<number, number> = { 1: 0.5, 2: 0.5 };
shift(mix, 1, 0.1);
assert.ok(Math.abs(mix[1] - 0.55) < 1e-12 && Math.abs(mix[1] + mix[2] - 1) < 1e-12);

const w = generateWorld(200, 100, 3, 3), e = createEconomy(w);
tick(w, e);
// cada tribo nasce com cultura, língua e religião próprias, 100% aceitas
const c1 = e.countries[0], city = e.cities.findIndex((k) => k.country === 1);
assert.deepEqual(e.cities[city].identity!.culture, { [c1.primaryCulture!]: 1 });
assert.equal(acceptedShare(e, city), 1);
// cidade conquistada: cultura de fora, não aceita → perda de lealdade; assimila devagar
const other = e.cities.findIndex((k) => k.country === 2);
e.cities[other].country = 1;
const before = e.cities[other].identity!.culture[c1.primaryCulture!] ?? 0;
const pen = stepCulture(w, e)[0];
assert.ok(pen > 0, "minoria não aceita deveria tirar lealdade");
const after = e.cities[other].identity!.culture[c1.primaryCulture!] ?? 0;
assert.ok(after > before && after < CULTURE.assimilateYear * 4, "assimila, mas devagar");
assert.ok(countryMix(e, 1, "culture").length === 2);
// aceitar a cultura custa pontos e zera a perda
const foreign = e.countries[1].primaryCulture!;
c1.admin = 0;
assert.match(applyCommand(w, e, 1, { t: "acceptCulture", culture: foreign })!, /pontos/);
c1.admin = ACCEPT_COST;
assert.equal(applyCommand(w, e, 1, { t: "acceptCulture", culture: foreign }), null);
assert.equal(acceptedShare(e, other), 1);
assert.equal(stepCulture(w, e)[0], 0);
console.log("culture ok");
