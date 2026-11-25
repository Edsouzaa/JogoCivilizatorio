import assert from "node:assert/strict";
import { generateWorld, T } from "../src/world.ts";
import { createEconomy, tick, type Division } from "../src/economy.ts";
import { resolveBattles, frontageOf, deploy, entrench, BATTLE } from "../src/battle.ts";
import { stepSupply, attrition, demandOf, LOGI } from "../src/logistics.ts";
import "../src/war.ts"; // liga a checagem de rio

const w = generateWorld(200, 100, 4, 2), e = createEconomy(w);
const SIZE = 25;
let nid = 1000;
const army = (country: number, hex: number, strength = SIZE, unit = "Lanceiros"): Division =>
  ({ id: nid++, kind: "army", country, hex, strength, org: 1, target: null, progress: 0, equip: 1, unit, morale: 1 });
const land = [...Array(200 * 100).keys()].filter((i) => w.terrain[i] !== T.OCEAN && !e.market[i]);
const hexOf = (t: number) => land.find((i) => w.terrain[i] === t)!;
/** Luta `weeks` semanas: atacantes (país 1) contra defensores (país 2) no hex. Devolve as baixas de cada lado. */
function fight(hex: number, att: Division[], def: Division[], weeks = 1) {
  e.battles = []; const s0a = att.reduce((s, d) => s + d.strength, 0), s0d = def.reduce((s, d) => s + d.strength, 0);
  for (let k = 0; k < weeks; k++) {
    e.week = 100 + k;
    resolveBattles(w, e, new Map([[hex, att.filter((d) => d.strength >= 1 && d.target !== null)]]), SIZE,
      () => def.filter((d) => d.strength >= 1 && d.hex === hex), () => -1,
      (ds, n) => { const tot = ds.reduce((s, d) => s + d.strength, 0) || 1; for (const d of ds) d.strength -= Math.min(d.strength, (n * d.strength) / tot); }, () => {}, () => 0);
  }
  return { att: s0a - att.reduce((s, d) => s + d.strength, 0), def: s0d - def.reduce((s, d) => s + d.strength, 0), b: e.battles.at(-1) };
}
const attackers = (hex: number, n: number) => Array.from({ length: n }, () => { const d = army(1, hex + 1); d.target = hex; return d; });

// frente pelo terreno: montanha é estreita; duas direções aumentam a frente
const plain = hexOf(T.PLAINS), mount = hexOf(T.MOUNTAIN);
assert.ok(frontageOf(w, e, mount, 1) < frontageOf(w, e, plain, 1));
assert.ok(frontageOf(w, e, plain, 2) > frontageOf(w, e, plain, 1));
// reservas: mais tropa que a frente comporta fica atrás
const many = attackers(mount, 12), dep = deploy(many, frontageOf(w, e, mount, 1), SIZE);
assert.ok(dep.reserve.length > 0 && dep.front.length < 12, "frente cheia: o resto na reserva");

// 1. exército numericamente superior atacando montanha sofre mais que na planície (mesmos dados: mesma semana e semente)
const m = fight(mount, attackers(mount, 6), [army(2, mount), army(2, mount)]);
const p = fight(plain, attackers(plain, 6), [army(2, plain), army(2, plain)]);
assert.ok(m.b!.log.some((r) => r.def.mods.some(([n]) => n === "Terreno")), "terreno aparece no dado do defensor");
assert.ok(m.att / Math.max(0.01, m.def) > p.att / Math.max(0.01, p.def) || m.def < p.def, "montanha favorece quem defende");

// histórico mostra cada rolagem com os modificadores; dado de 1 a 10
const r0 = m.b!.log[0];
assert.ok(r0.att.roll >= 1 && r0.att.roll <= 10 && r0.def.roll >= 1 && r0.def.roll <= 10);
assert.equal(r0.att.total, Math.max(1, r0.att.roll + r0.att.mods.reduce((s, [, v]) => s + v, 0)));

// determinístico: a mesma batalha dá o mesmo resultado
const again = fight(mount, attackers(mount, 6), [army(2, mount), army(2, mount)]);
assert.equal(again.att, m.att); assert.equal(again.def, m.def);

// 2. defensor pequeno entrincheirado: o entrincheiramento entra no dado e cresce parado (zera ao andar)
const fort = army(2, plain); for (let k = 0; k < 8; k++) entrench(e, fort, false);
assert.ok(fort.entrench! >= BATTLE.entrenchMax);
entrench(e, fort, true); assert.equal(fort.entrench, 0);
for (let k = 0; k < 8; k++) entrench(e, fort, false);
const f = fight(plain, attackers(plain, 2), [fort]);
assert.ok(f.b!.log[0].def.mods.some(([n]) => n === "Entrincheiramento"));

// 3. derrota sem saída: o defensor cercado é destruído (retreatTo = −1); organização e força são números separados
const weak = army(2, plain, 10); weak.org = 0.12;
fight(plain, attackers(plain, 6), [weak], 3);
assert.ok(weak.strength === 0 || weak.org < BATTLE.broken);

// 4. sem munição o fogo enfraquece: atacante com mosquetes e sem pólvora mata menos
const withAmmo = attackers(plain, 3), noAmmo = attackers(plain, 3);
for (const d of noAmmo) d.supply = { level: 0.5, food: 1, ammo: 0, fuel: 1, stock: 0, delivered: 0, demand: 0 };
const fa = fight(plain, withAmmo, [army(2, plain), army(2, plain)]), fn = fight(plain, noAmmo, [army(2, plain), army(2, plain)]);
assert.ok(fn.def <= fa.def, "sem munição mata menos");

// 5. batalha não dura para sempre
const long = fight(plain, attackers(plain, 1), [army(2, plain)], BATTLE.maxWeeks + 1);
assert.notEqual(long.b?.state, "combate");

// logística: demanda por tipo; exército longe do depósito recebe menos; sem comida morre de atrito e perde moral
const c = e.countries[0]; c.research.known.add("Pólvora");
const near = army(1, e.cities[0].hex), far = army(1, e.cities[0].hex);
assert.equal(demandOf(e, near).length, 2, "comida e pólvora");
e.divisions.push(near, far);
tick(w, e); // mercado da capital com comida
for (let k = 0; k < 10; k++) stepSupply(w, e, (d) => (d === far ? 999 : 0), () => 6, new Set());
assert.ok(far.supply!.level < near.supply!.level, "longe do depósito: menos suprimento");
assert.ok(far.stock!.food === 0 && far.supply!.food === 0, "estoque acabou");
const before = far.strength, mor = far.morale!;
const dead = attrition(w, e, far, false, false);
assert.ok(dead > 0 && far.strength < before && far.morale! < mor, "fome: atrito e moral");
assert.ok((c.attritionTotal ?? 0) >= dead, "atrito contado à parte");
// marchar cansa; descansar recupera
const walker = army(1, plain); walker.supply = { level: 1, food: 1, ammo: 1, fuel: 1, stock: 4, delivered: 1, demand: 0 };
for (let k = 0; k < 5; k++) attrition(w, e, walker, true, false);
assert.ok(walker.fatigue! > 0.6);
attrition(w, e, walker, false, false); assert.ok(walker.fatigue! < 0.6);
// inverno e montanha matam mais que planície no verão
const a1 = army(1, plain, 1000), a2 = army(1, mount, 1000);
for (const d of [a1, a2]) d.supply = walker.supply;
assert.ok(attrition(w, e, a2, false, false) > attrition(w, e, a1, false, false));
assert.ok(LOGI.reserveWeeks > 0);
e.divisions = e.divisions.filter((d) => d !== near && d !== far);

// clima: determinístico e coerente com o lugar
{
  const { weatherAt } = await import("../src/world.ts");
  const seen = new Set<string>();
  for (let wk = 0; wk < 104; wk++) for (const h of land.filter((_, k) => k % 40 === 0)) seen.add(weatherAt(w, h, wk)); // amostra do mapa todo
  assert.ok(seen.has("chuva") && seen.has("limpo"), "tempo varia");
  assert.equal(weatherAt(w, plain, 30), weatherAt(w, plain, 30));
}
// estilo do general: cauteloso perde menos soldados que agressivo na mesma luta
{
  const { styleOf } = await import("../src/characters.ts");
  const mk = (trait: string) => { const ch = { id: 900 + nid++, name: "G", female: false, country: 1, born: 0, dies: 1e9, adm: 50, dip: 50, mil: 50, traits: [trait], looks: {} as never, life: [], role: "General" as const }; (e.characters ??= []).push(ch); return ch; };
  const cau = mk("Cauteloso"), agr = mk("Guerreiro");
  assert.equal(styleOf(cau), "Cauteloso"); assert.equal(styleOf(agr), "Agressivo");
  const lose = (g: { id: number }) => { const att = attackers(plain, 4); for (const d of att) d.general = g.id; return fight(plain, att, [army(2, plain), army(2, plain), army(2, plain)]).att; };
  assert.ok(lose(cau) < lose(agr), "cauteloso preserva tropas");
}
// evento: carga de montaria em campo aberto aparece no histórico
{
  let charged = false;
  for (let k = 0; k < 12 && !charged; k++) {
    const att = attackers(plain, 3); for (const d of att) d.unit = "Cavalaria";
    e.week = 300 + k; e.battles = [];
    resolveBattles(w, e, new Map([[plain, att]]), SIZE, () => [army(2, plain)], () => -1, (ds, n) => { for (const d of ds) d.strength -= n / ds.length; }, () => {}, () => 0);
    charged = !!e.battles!.at(-1)?.log.some((r) => r.att.mods.some(([n]) => n === "Carga de montaria"));
  }
  assert.ok(charged, "carga de montaria em planície");
}
// depósito: vira fonte de suprimento (mais perto) e soma capacidade
{
  const { depotHexes, depotCapacity } = await import("../src/logistics.ts");
  const { BUILDINGS } = await import("../src/economy.ts");
  const dep = BUILDINGS.findIndex((b) => b.name === "Depósito de suprimentos"), h = [...e.owned].find((i) => w.owner[i] === 1 && !e.urban[i] && w.terrain[i] !== T.OCEAN)!;
  assert.equal(depotHexes(w, e, 1).length, 0);
  e.levels[dep][h] = 2; e.producers.add(h);
  assert.deepEqual(depotHexes(w, e, 1), [h]);
  assert.ok(depotCapacity(e, 1) > 0);
}
// prioridade: com pouca capacidade, a emergência recebe antes da guarnição
{
  const c1 = e.countries[0], cap = e.cities[0].hex;
  const a = army(1, cap, 400), b = army(1, cap, 400); a.priority = 6; b.priority = 1; a.stock = b.stock = { food: 0, ammo: 0, fuel: 0 };
  e.divisions = e.divisions.filter((d) => d.kind !== "army"); e.divisions.push(a, b);
  for (const k of e.cities) if (k.country === 1) k.size = 1;
  const keep = LOGI.capPerCitySize; LOGI.capPerCitySize = 0.3; // capacidade mínima
  const { depotCapacity: dc } = await import("../src/logistics.ts"); const dkeep = LOGI.depotCapacity; LOGI.depotCapacity = 0;
  stepSupply(w, e, () => 0, () => 6, new Set());
  assert.ok(b.supply!.food >= a.supply!.food, "emergência primeiro");
  LOGI.capPerCitySize = keep; LOGI.depotCapacity = dkeep; void dc; void c1;
}
console.log("battle ok");
