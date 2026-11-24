import assert from "node:assert/strict";
import { createEconomy, tick, foundCity } from "../src/economy.ts";
import { createState, addCityToState, removeCityFromState, setStateTax, statesOf, stateOfCity, cityTax, adminBonus, updateStates, STATES } from "../src/states.ts";
import { declareWar, airRegion } from "../src/war.ts";
import { buildBorders } from "../src/fog.ts";
import { across } from "../src/world.ts";
import { generateWorld, isLand } from "../src/world.ts";
import { hexDistance } from "../src/hex.ts";

const w = generateWorld(300, 150, 1, 4), e = createEconomy(w);
const A = 1, c = e.countries[A - 1];
// segunda cidade do país A, perto da capital
const settler = e.divisions.find((d) => d.kind === "settler" && d.country === A)!;
const cap = e.cities[0].hex;
for (let i = 0; i < w.W * w.H; i++) {
  if (w.owner[i] || !isLand(w.terrain[i])) continue;
  const d = hexDistance(i % w.W, (i / w.W) | 0, cap % w.W, (cap / w.W) | 0, w.W);
  if (d < 5 || d > 8) continue;
  settler.hex = i;
  if (foundCity(w, e, settler.id) === null) break;
}
const cities = e.cities.map((k, idx) => [k, idx] as const).filter(([k]) => k.country === A).map(([, idx]) => idx);
assert.ok(cities.length >= 2, "país A sem segunda cidade");
const [c0, c1] = cities;

// só a partir da Clássica
assert.match(createState(e, A, c0)!, /Clássica/);
c.research.era = 1;
assert.equal(createState(e, A, c0, "Norte"), null);
const s = statesOf(e, A)[0];
assert.equal(s.name, "Norte");
assert.equal(addCityToState(e, c1, s.id), null);
assert.equal(stateOfCity(e, c1)?.id, s.id);
assert.match(createState(e, 2, c0)!, /cidade sua/); // cidade de outro país

// Centralizado: +2% de arrecadação por estado
assert.equal(adminBonus(e, A), STATES.adminPerState);

// região aérea: as duas cidades do estado são uma só região
assert.equal(airRegion(e, e.cities[c0].hex), airRegion(e, e.cities[c1].hex));
assert.equal(airRegion(e, e.cities[c0].hex), STATES.regionBase + s.id);

// Federação: o estado escolhe o imposto; centralizado não deixa
assert.match(setStateTax(e, s.id, "Dízimo")!, /Federação/);
c.politics.laws["Estados"] = "Federação";
assert.equal(setStateTax(e, s.id, "Dízimo"), null);
assert.equal(cityTax(e, c0), 0.12);
assert.equal(adminBonus(e, A), 0); // federação não tem o bônus de administração
tick(w, e);
assert.ok(Math.abs(c.tax - 0.12) < 1e-9, "imposto do país deveria ser o do estado (todas as cidades nele)");

// interesse: com imposto de 18% (agrícola quer até 12%) e comércio de 40% (os outros querem 50%+),
// o estado fica insatisfeito qualquer que seja o interesse, e tira legitimidade
setStateTax(e, s.id, "Imposto por cabeça");
const loss = updateStates(e, A);
assert.ok(["Agrícola", "Industrial", "Mercantil"].includes(s.interest));
assert.ok(!s.happy, `estado ${s.interest} deveria estar insatisfeito`);
assert.equal(loss, STATES.unhappyLegitimacy);

// fronteira de estado: com c1 fora do estado, aparece linha entre as regiões de c0 e c1 (se forem vizinhas)
assert.equal(removeCityFromState(e, c1), null);
{
  const b = buildBorders(w, e, new Uint8Array(w.W * w.H * 4));
  let touching = false, stateLines = 0;
  for (const i of e.owned) if (e.market[i] === c0 + 1) for (let k = 0; k < 6; k++) {
    const n = across(w.W, w.H, i, k);
    if (n >= 0 && e.market[n] === c1 + 1) { touching = true; stateLines += (b[i * 4 + 1] >> k) & 1; }
  }
  if (touching) assert.ok(stateLines > 0, "sem linha entre estados diferentes");
}
assert.equal(addCityToState(e, c1, s.id), null);

// em guerra os estados travam; estado vazio some
declareWar(e, A, 2);
assert.match(removeCityFromState(e, c1)!, /guerra/);
e.wars.clear();
assert.equal(removeCityFromState(e, c1), null);
assert.equal(removeCityFromState(e, c0), null);
assert.equal(statesOf(e, A).length, 0);
console.log("states ok");
