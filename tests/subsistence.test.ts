import assert from "node:assert/strict";
import { generateWorld, T, isLand, weatherAt } from "../src/world.ts";
import { createEconomy, tick, jobsAt, BUILDINGS, GOODS } from "../src/economy.ts";
import { subsistAt, kindOf, SUBSIST } from "../src/subsistence.ts";
import { distributeIncome, POP_TYPES } from "../src/pops.ts";

const w = generateWorld(300, 150, 2, 4), e = createEconomy(w), c = e.countries[0];
const need = 1 / 200, N = w.W * w.H;
const at = (i: number, jobs = 0) => subsistAt(w, e, i, c, need, jobs, BUILDINGS);
const find = (f: (i: number) => boolean) => { for (let i = 0; i < N; i++) if (f(i)) return i; return -1; };
const free = (t: number) => find((i) => w.terrain[i] === t && !w.river[i] && !e.urban[i] && kindOf(w, i) !== "Pesca de subsistência" && w.climate[i] !== 4);

// biomas: planície sustenta mais gente que floresta e que deserto; sem Agricultura, roça vira coleta
const plain = free(T.PLAINS), forest = free(T.FOREST), desert = free(T.DESERT);
assert.ok(at(plain).capacity > at(forest).capacity && at(forest).capacity > at(desert).capacity, "fertilidade manda");
c.research.known.delete("Agricultura");
assert.equal(kindOf(w, plain, c), "Coleta e caça");
c.research.known.add("Agricultura");
assert.equal(kindOf(w, plain, c), "Agricultura de subsistência");
const coast = find((i) => kindOf(w, i) === "Pesca de subsistência");
assert.ok(coast >= 0, "há pesca no litoral");

// pressão: produção por pessoa cai devagar acima de 80% e para de crescer perto de 120%
const cap = at(plain).capacity, perHead = (p: number) => { w.pop[plain] = p; const s = at(plain); return s.gross / Math.max(1, p); };
const low = perHead(cap * 0.5), soft = perHead(cap * 0.8), over = perHead(cap * 1.1), way = perHead(cap * 3);
assert.ok(Math.abs(low - soft) < 1e-9, "até 80% rende cheio");
assert.ok(over < soft && over > soft * 0.8, "um pouco acima: cai pouco");
assert.ok(way < soft * 0.5, "muito acima: cai muito");
w.pop[plain] = cap * 3; assert.ok(at(plain).pressure > 2.9);

// autoconsumo e excedente: a família come primeiro; o resto sobra
w.pop[plain] = cap * 0.4;
const s = at(plain);
assert.ok(s.self > 0 && s.self <= s.dependants * need * 3 + 1e-9 && Math.abs(s.self + s.surplus - s.gross) < 1e-9);

// construções ocupam terra (fazenda mais que oficina) e empregam gente; a roça de casa nunca some
const farm = BUILDINGS.findIndex((b) => b.name === "Fazenda");
e.levels[farm][plain] = 3; e.producers.add(plain);
const withFarm = at(plain, jobsAt(e, plain));
assert.ok(withFarm.capacity < cap && withFarm.land > 0.25, "fazenda ocupa terra");
assert.ok(withFarm.dependants < s.dependants && withFarm.dependants >= w.pop[plain] * SUBSIST.plots - 1e-9, "emprego tira gente da terra, mas não toda");
e.levels[farm][plain] = 50;
assert.ok(at(plain).land <= SUBSIST.landMax && at(plain).capacity > 0, "nunca some de todo");
e.levels[farm][plain] = 0;

// clima: semana de calor (seca) rende menos que semana limpa no mesmo hex
let hot = -1, clear = -1;
for (let wk = 0; wk < 520 && (hot < 0 || clear < 0); wk++) { const x = weatherAt(w, plain, wk); if (x === "calor" && hot < 0) hot = wk; if (x === "limpo" && clear < 0) clear = wk; }
if (hot >= 0 && clear >= 0) { e.week = hot; const a = at(plain).gross; e.week = clear; assert.ok(at(plain).gross > a, "seca rende menos"); e.week = 0; }

// tecnologia aumenta, com teto: nunca vira agricultura comercial
const before = at(plain).capacity;
for (const n of ["Coleta organizada", "Cerâmica", "Refrigeração"]) c.research.known.add(n);
const after = at(plain).capacity;
assert.ok(after > before && after <= before * (1 + SUBSIST.techMax) + 1e-6);

// imposto: comida comida em casa não é renda tributável; o excedente vendido é
const p = { count: new Float64Array(POP_TYPES.length), income: new Float64Array(POP_TYPES.length), qol: new Float64Array(POP_TYPES.length), loyalty: new Float64Array(POP_TYPES.length) };
const hunters = POP_TYPES.findIndex((t) => t.name === "Caçadores-coletores"); p.count[hunters] = 100;
distributeIncome(p, 50, 30, 1, 0, 20);
assert.ok(Math.abs(p.taxable![hunters] - (p.income[hunters] - 20)) < 1e-9, "só o autoconsumo fica isento");

// mercado: autoconsumo está na oferta mas fora do PIB
tick(w, e);
const k0 = e.cities[0], grain = GOODS.indexOf("Grãos");
assert.ok(k0.market.self![grain] > 0 && k0.market.self![grain] <= k0.market.supply[grain]);
assert.ok(e.countries[0].sub!.dependants > 0 && Number.isFinite(e.countries[0].gdpWeek));

// desempenho: todos os hexes de terra do mapa
const land = [...Array(N).keys()].filter((i) => isLand(w.terrain[i]));
const t0 = performance.now(); for (const i of land) subsistAt(w, e, i, c, need, 0, BUILDINGS);
const ms = performance.now() - t0;
assert.ok(ms < 2000, `${land.length} hexes em ${ms.toFixed(0)} ms`);
console.log(`subsistence ok (${land.length} hexes em ${ms.toFixed(0)} ms)`);
