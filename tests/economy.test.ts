import assert from "node:assert/strict";
import {
  priceFactor, createEconomy, tick, build, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel,
  BUILDINGS, GOODS, RULES, MIN_PRICE, MAX_PRICE, borderRadius, settlersOf, growCities, cityReach, popCap,
} from "../src/economy.ts";
import { generateWorld, isLand, claim, T, RESOURCES } from "../src/world.ts";
import { forNeighbors } from "../src/hex.ts";

assert.equal(priceFactor(10, 10), 1);
assert.equal(priceFactor(0, 100), MAX_PRICE);   // só demanda: +75%
assert.equal(priceFactor(100, 0), MIN_PRICE);   // só oferta: -50%
assert.ok(priceFactor(100, 120) > 1 && priceFactor(120, 100) < 1);

assert.equal(dateLabel(0), "600 a.C. · semana 1");
assert.equal(dateLabel(600 * 52), "1 d.C. · semana 1");

const w = generateWorld(300, 150, 1, 4);
const e = createEconomy(w);
assert.equal(e.cities.length, 4);
for (let k = 0; k < 52; k++) tick(w, e);
for (const c of e.countries) assert.ok(c.gdpWeek > 0, "país sem PIB");
for (const city of e.cities) for (let gi = 1; gi < GOODS.length; gi++) {
  const p = city.market.price[gi];
  assert.ok(p >= MIN_PRICE && p <= MAX_PRICE);
}

// todo recurso do mapa tem uma extratora
for (let r = 1; r < 22; r++) assert.ok(buildingsFor(r, false).some((b) => !BUILDINGS[b].industry && BUILDINGS[b].boosts === undefined), `recurso ${r} sem extratora`);

// indústria só em hex urbano
const city = e.cities[0], cap = city.hex, c = e.countries[0];
const forge = BUILDINGS.findIndex((b) => b.name === "Fundição de bronze");
const rural = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i])!;
c.manpower = 1e9;
assert.match(build(w, e, rural, forge)!, /cidade/);

// fundição exige a tecnologia
c.research.known.delete("Metalurgia do bronze");
assert.match(build(w, e, cap, forge)!, /Precisa pesquisar Metalurgia do bronze/);
c.research.known.add("Metalurgia do bronze");

// a fundição transforma cobre + estanho em bronze; sem estanho não produz nada
w.pop[cap] = 1e6;
assert.equal(build(w, e, cap, forge), null);
const m = city.market, COPPER = GOODS.indexOf("Cobre"), TIN = GOODS.indexOf("Estanho"), BRONZE = GOODS.indexOf("Bronze");
const mine = BUILDINGS.findIndex((b) => b.name === "Mina");
const metal = (r: number) => [...e.owned].filter((i) => e.market[i] === 1 && w.resource[i] === r);
for (const i of [...metal(COPPER), ...metal(TIN)]) { e.levels[mine][i] = 0; } // zera minas de cobre/estanho
tick(w, e);
assert.equal(m.supply[BRONZE], 0, "bronze sem insumo");
assert.ok(m.demand[COPPER] > 0 && m.demand[TIN] > 0, "fundição não pediu insumos");
// injeta cobre e estanho de fora: uma mina cheia de cada no próprio hex urbano não é possível, então usamos hexes do mercado
const copperHex = rural, tinHex = [...e.owned].find((i) => e.market[i] === 1 && i !== rural && !e.urban[i])!;
w.resource[copperHex] = COPPER; w.resource[tinHex] = TIN; w.pop[copperHex] = w.pop[tinHex] = 1e5;
e.levels[mine][copperHex] = 10; e.levels[mine][tinHex] = 10; e.producers.add(copperHex); e.producers.add(tinHex);
tick(w, e);
assert.ok(m.supply[BRONZE] > 0, "fundição não produziu bronze");

// colonos: são uma unidade; fundam a cidade onde estão, mas não perto demais de outra
const W = w.W;
const dist = (a: number, b: number) => Math.hypot((a % W) - (b % W), ((a / W) | 0) - ((b / W) | 0));
const target = [...Array(W * w.H).keys()].find((i) => isLand(w.terrain[i]) && !w.owner[i] && dist(i, cap) >= 6 && dist(i, cap) <= 9);
assert.ok(target !== undefined, "mapa de teste sem lugar para cidade nova");
{
  const settler = e.divisions.find((d) => d.kind === "settler" && d.country === 1)!;
  assert.equal(settler.hex, cap);
  assert.match(foundCity(w, e, settler.id)!, /perto/);
  const before = e.cities.length, settlersBefore = settlersOf(e, 1);
  settler.hex = target;
  assert.equal(foundCity(w, e, settler.id), null);
  assert.equal(e.cities.length, before + 1);
  assert.equal(w.owner[target], 1);
  assert.equal(settlersOf(e, 1), settlersBefore - 1); // o grupo de colonos virou a cidade
  assert.ok(e.market[target] === e.cities.length, "cidade nova sem mercado próprio");

  // comércio: a capital tem muito cobre; a cidade nova, sem minas, recebe parte dele
  const fresh = e.cities.at(-1)!.market;
  w.pop[cap] = w.pop[copperHex] = w.pop[tinHex] = 1000; // com populações enormes o próprio mercado consumiria todo o cobre
  tick(w, e);
  assert.ok(m.trade[COPPER] < 0, "capital não exportou cobre");
  assert.ok(fresh.trade[COPPER] > 0, "cidade nova não importou cobre");
  for (let gi = 1; gi < GOODS.length; gi++) { // o que sai de uma cidade entra em outra
    const sum = e.cities.filter((k) => k.country === 1).reduce((s, k) => s + k.market.trade[gi], 0);
    assert.ok(Math.abs(sum) < 1e-6, `comércio criou/destruiu ${GOODS[gi]}`);
  }

  // tamanho transferível entre cidades do mesmo país
  city.size = 3;
  assert.equal(transferSize(w, e, 0, e.cities.length - 1), null);
  assert.equal(city.size, 2);
  assert.equal(e.cities.at(-1)!.size, 2);
}

c.treasury = 1e6;
w.pop[cap] = 1000;
const s = settlersOf(e, 1);
assert.equal(trainSettlers(w, e, 1), null);
assert.equal(settlersOf(e, 1), s + 1);

// construir não gasta manpower (ele é só do exército); o que falta no tesouro vira dívida
c.manpower = 0; c.treasury = 0; c.debt = 0;
assert.equal(build(w, e, cap, forge), null);
assert.equal(c.manpower, 0);
assert.equal(c.debt, RULES.buildCost * 2);
c.debt = c.gdpWeek * 52 * 10;
tick(w, e);
assert.equal(c.bankruptWeeks, RULES.bankruptWeeks);
console.log("economy ok");

// águas territoriais: reivindicar terra na costa pega o mar colado nela, e só ele
{
  const w2 = generateWorld(400, 200, 5, 0);
  let coast = -1;
  for (let i = 0; i < w2.W * w2.H && coast < 0; i++) {
    if (!isLand(w2.terrain[i])) continue;
    forNeighbors(i % w2.W, (i / w2.W) | 0, w2.W, w2.H, (j) => { if (w2.terrain[j] === 0) coast = i; });
  }
  const got = claim(w2, 1, coast, 1);
  const seas = got.filter((j) => w2.terrain[j] === 0);
  assert.ok(seas.length > 0, 'costa sem águas territoriais');
  for (const i of seas) {
    let touches = false;
    forNeighbors(i % w2.W, (i / w2.W) | 0, w2.W, w2.H, (j) => { if (w2.owner[j] === 1 && isLand(w2.terrain[j])) touches = true; });
    assert.ok(touches, 'mar territorial longe da terra do país');
  }
  // fronteira cresce com a cidade
  assert.equal(borderRadius(1), 1); assert.equal(borderRadius(2), 2); assert.equal(borderRadius(10), 5); assert.equal(borderRadius(40), 5);
}
console.log("territory ok");

// recursos: todo hex de terra tem algum; jazida acaba, a mina fecha e o hex vira o recurso comum do terreno
{
  const w3 = generateWorld(200, 100, 8, 2), e3 = createEconomy(w3);
  for (let i = 0; i < w3.W * w3.H; i++) if (isLand(w3.terrain[i]) && w3.terrain[i] !== T.ICE) assert.ok(w3.resource[i], `hex ${i} sem recurso`);
  const i = [...e3.producers].find((j) => w3.reserve[j] !== Infinity && e3.market[j]);
  if (i !== undefined) {
    const before = w3.resource[i];
    w3.reserve[i] = 0.01; w3.pop[i] = 1e5;
    tick(w3, e3);
    assert.deepEqual(e3.exhausted, [i]);
    assert.ok(w3.resource[i] !== before || before === RESOURCES.indexOf("Pedra")); // em morro sem outra coisa fica pedra (que não acaba)
    assert.equal(w3.reserve[i], Infinity);
    assert.ok(BUILDINGS.every((b, k) => b.industry || !e3.levels[k][i]), "mina continuou aberta");
  }
}
console.log("reserves ok");

// cidade cresce +1 hex a cada 25% de gente a mais (ou com pontos administrativos sobrando); o campo longe dela é só território do país
{
  const w4 = generateWorld(200, 100, 3, 2), e4 = createEconomy(w4), city = e4.cities[0];
  tick(w4, e4);
  assert.equal(city.size, 1);
  growCities(w4, e4); // marca a população de partida
  assert.equal(city.size, 1);
  city.market.pop = city.popMark! * (1 + RULES.cityGrowthPct) + 1; // cresceu 25%
  growCities(w4, e4);
  assert.equal(city.size, 2, "25% a mais de gente: +1 hex");
  growCities(w4, e4);
  assert.equal(city.size, 2, "a marca andou: precisa crescer de novo");
  // excesso de pontos administrativos também faz crescer
  const { adminCap } = await import("../src/admin.ts");
  e4.countries[0].admin = adminCap(e4, 1);
  e4.cities[0].market.pop = e4.cities[0].popMark!;
  growCities(w4, e4);
  assert.ok(city.size === 3 && e4.countries[0].admin! < adminCap(e4, 1), "pontos administrativos sobrando: +1 hex");
  assert.ok(city.urban.length === 3 && city.urban.every((j) => e4.urban[j]));
  assert.ok(popCap(w4, e4, city.urban[1]) > popCap(w4, e4, [...e4.owned].find((j) => !e4.urban[j] && isLand(w4.terrain[j]))!));
  // hex do país além do alcance da cidade: sem mercado, mas a gente conta no país
  const far = [...e4.owned].find((j) => w4.owner[j] === 1 && !e4.market[j] && isLand(w4.terrain[j]));
  if (far !== undefined) { w4.pop[far] = 5000; tick(w4, e4); assert.ok(e4.countries[0].pop >= 5000, "território sem cidade conta na população"); }
  assert.ok(cityReach(1) >= 4);
}
console.log("urban ok");
