import assert from "node:assert/strict";
import { generateWorld } from "../src/world.ts";
import { createEconomy, tick } from "../src/economy.ts";
import { setClassTax, setSpecificTax, TAX_KINDS } from "../src/budget.ts";
import { CLASSES, POP_TYPES } from "../src/pops.ts";

const w = generateWorld(200, 100, 5, 2), e = createEconomy(w), c = e.countries[0];
c.research.era = 5; for (const t of ["Moeda", "Escrita", "Direito escrito", "Economia política"]) c.research.known.add(t); // economia monetizada
for (let k = 0; k < 6; k++) tick(w, e);
const classIncome = (k: number) => POP_TYPES.reduce((s, t, i) => s + (t.cls === k ? c.pops.income[i] : 0), 0);
const taxable = (k: number) => POP_TYPES.reduce((s, t, i) => s + (t.cls === k ? c.pops.taxable![i] : 0), 0);

// imposto nunca passa da base tributável; o que é cobrado sai da renda da classe (nada é criado)
for (let k = 0; k < CLASSES.length; k++) assert.ok((c.taxByClass![k] ?? 0) <= taxable(k) + 1e-9);
const base = c.taxNext!;
// mais imposto na classe alta: arrecada mais e a renda disponível dela cai
assert.match(setClassTax(c, 2, { mode: "pct", v: 0.9 })!, /limite/);
const richBefore = classIncome(2);
assert.equal(setClassTax(c, 2, { mode: "pct", v: 0.5 }), null);
tick(w, e);
assert.ok(c.taxNext! > base, "arrecada mais");
assert.ok(classIncome(2) < richBefore || taxable(2) === 0, "renda disponível dos ricos cai");
// modo fixo: no máximo a renda tributável da classe
assert.equal(setClassTax(c, 0, { mode: "fixed", v: 100 }), null);
tick(w, e);
assert.ok(c.taxByClass![0] <= taxable(0) + 1e-9);
// tributo específico: custa pontos administrativos; sem pontos não cria
c.admin = 0;
assert.match(setSpecificTax(e, c, "alimentos", 0.1)!, /pontos administrativos/);
assert.match(setSpecificTax(e, c, "alimentos", 0.9)!, /entre 0/);
c.admin = 100;
assert.equal(setSpecificTax(e, c, "alimentos", 0.2), null);
assert.equal(c.admin, 100 - TAX_KINDS.find((t) => t.id === "alimentos")!.adminCost);
setClassTax(c, 0, { mode: "pct", v: 0 }); setClassTax(c, 2, { mode: "pct", v: 0 });
tick(w, e);
assert.ok((c.specificTaxWeek ?? 0) > 0, "tributo sobre alimentos arrecada");
// sem tecnologia, sem tributo
assert.match(setSpecificTax(e, c, "combustivel", 0.1)!, /Motor a combustão/);
// livro: receitas e despesas da semana por categoria
tick(w, e);
assert.ok(Object.keys(c.bookLast ?? {}).length > 0);
// sem pontos para manter: suspenso
c.admin = 0; tick(w, e);
assert.ok(c.taxes!.find((x) => x.id === "alimentos")!.suspended);
assert.equal(setSpecificTax(e, c, "alimentos", 0), null);
assert.ok(!c.taxes!.length, "0% revoga");
console.log("budget ok");
