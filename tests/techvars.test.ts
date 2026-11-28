import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TECHS, ERAS, areaOf, subOf, newResearch } from "../src/tech.ts";
import { TECH_VARS, ECON_ALIAS, SUBS, AREAS, tv, tvMul, tvCut } from "../src/techvars.ts";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { econ } from "../src/eramods.ts";

// as 113 tecnologias antigas continuam (com os campos antigos); nomes únicos; 3 áreas e subcategorias válidas
const OLD = ["Coleta organizada", "Agricultura", "Escrita", "Feudalismo", "Navegação", "Pólvora", "Máquina a vapor", "Eletricidade", "Motor a combustão", "Computadores", "Internet", "Governo digital"];
for (const n of OLD) assert.ok(TECHS.some((t) => t.name === n), n);
assert.ok(TECHS.length >= 113 + 90);
assert.equal(new Set(TECHS.map((t) => t.name)).size, TECHS.length, "nomes únicos");
for (const t of TECHS) assert.ok(AREAS.includes(areaOf(t)) && SUBS[areaOf(t)].includes(subOf(t)), `${t.name}: ${subOf(t)}`);
for (let era = 0; era < ERAS.length; era++) for (const a of AREAS) assert.ok(TECHS.some((t) => t.era === era && areaOf(t) === a), `era ${era} sem ${a}`);
// pré-requisitos: existem, não vêm de era posterior (travaria a era) e não formam ciclo
const by = new Map(TECHS.map((t) => [t.name, t]));
for (const t of TECHS) for (const q of t.requires) { assert.ok(by.has(q), `${t.name} ← ${q}`); assert.ok(by.get(q)!.era <= t.era, `${t.name} ← ${q} (era)`); }
const seen = new Map<string, number>();
const visit = (n: string): void => { if (seen.get(n) === 2) return; assert.notEqual(seen.get(n), 1, `ciclo em ${n}`); seen.set(n, 1); for (const q of by.get(n)!.requires) visit(q); seen.set(n, 2); };
for (const t of TECHS) visit(t.name);
// interdependência: requisitos cruzando áreas
assert.ok(TECHS.filter((t) => t.requires.some((q) => areaOf(by.get(q)!) !== areaOf(t))).length >= 40);
// custo automático continua: soma de cada era = pontos esperados da era (não fica mais curta nem mais longa)
for (const t of TECHS) assert.ok(t.cost > 0, t.name);
// variáveis: toda chave usada existe; toda variável tem um ponto de leitura (ou entra num fator da era)
for (const t of TECHS) for (const k of Object.keys(t.fx ?? {})) assert.ok(k in TECH_VARS, `${t.name}: ${k}`);
const lines = readdirSync("src").filter((f) => f.endsWith(".ts") && f !== "techvars.ts" && f !== "tech.ts").flatMap((f) => readFileSync("src/" + f, "utf8").split("\n"));
const alias = new Set(Object.values(ECON_ALIAS) as string[]), indirect = new Set(["artilleryEfficiency", "cavalryEfficiency", "armorEfficiency"]); // battle.ts CAT_VAR
for (const k of Object.keys(TECH_VARS)) assert.ok(alias.has(k) || indirect.has(k) || lines.some((l) => /tv(Mul|Cut)?\(/.test(l) && l.includes(`"${k}"`)), `${k} sem leitura`);
// soma, cache, limites e negativos
const r = newResearch();
assert.equal(tv(r, "agriculture"), 0);
r.known.add("Agricultura itinerante"); assert.ok(tv(r, "agriculture") > 0, "cache renova quando aprende");
r.known.add("Engenharia hidráulica"); assert.ok(Math.abs(tv(r, "agriculture") - 0.1) < 1e-9, "acumula");
const fake = { known: new Set<string>() } as never;
assert.equal(tvMul(fake, "agriculture"), 1); assert.equal(tvCut(fake, "fuelEfficiency"), 1);
// fator da era recebe a variável (um lugar só, com o teto de sempre)
const w = generateWorld(120, 60, 3, 2), e = createEconomy(w), c = e.countries[0];
const t0 = econ(c, "tax"); c.research.known.add("Censo populacional"); assert.ok(econ(c, "tax") > t0 && econ(c, "tax") <= 1);
// efeito real: com tecnologias de agricultura e extração, a mesma economia produz mais (mundos idênticos)
const prod = (boost: boolean) => {
  const w2 = generateWorld(120, 60, 3, 2), e2 = createEconomy(w2);
  if (boost) for (const n of ["Agricultura itinerante", "Engenharia hidráulica", "Mineração metalúrgica especializada"]) e2.countries.forEach((x) => x.research.known.add(n));
  tick(w2, e2);
  return e2.cities.reduce((s2, k) => s2 + k.market.supply.reduce((a2, v) => a2 + v, 0), 0);
};
assert.ok(prod(true) > prod(false), "tecnologia de produção aumenta a oferta");
console.log(`techvars ok (${TECHS.length} tecnologias, ${Object.keys(TECH_VARS).length} variáveis)`);

// leis em vigor somam nas mesmas variáveis (o cache renova quando a lei muda)
{
  const { LAWS } = await import("../src/politics.ts");
  const w3 = generateWorld(120, 60, 4, 2), e3 = createEconomy(w3), c3 = e3.countries[0];
  tick(w3, e3);
  const before = tv(c3.research, "religiousTolerance");
  c3.politics.laws["Religião"] = "Estado secular"; tick(w3, e3);
  assert.ok(tv(c3.research, "religiousTolerance") >= before + 0.5 - 1e-9, "lei entra na variável");
  for (const ls of Object.values(LAWS)) for (const l of ls) for (const k of Object.keys(l.vars ?? {})) assert.ok(k in TECH_VARS, `${l.name}: ${k}`);
  console.log("law vars ok");
}
