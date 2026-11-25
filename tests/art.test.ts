import assert from "node:assert/strict";
import "../src/economy.ts";
import { artOf, artSVG, artId, GLYPHS, ALL_ART } from "../src/art.ts";

// todo recurso/bem, construção e tecnologia tem ícone com forma existente; ids estáveis e sem repetição dentro do tipo
const all = ALL_ART();
for (const [kind, names] of [["good", all.goods], ["building", all.buildings], ["tech", all.techs]] as const) {
  const ids = new Set<string>();
  for (const n of names) {
    const [g, color] = artOf(kind, n);
    assert.ok(GLYPHS[g], `${kind} ${n}: forma ${g}`);
    assert.match(color, /^#[0-9a-f]{6}$/i);
    const id = artId(n);
    assert.ok(id && !ids.has(id), `${kind} ${n}: id ${id} repetido`);
    ids.add(id);
    const svg = artSVG(kind, n);
    assert.ok(svg.startsWith("<svg") && !/<text/.test(svg), "sem texto dentro do ícone");
  }
}
// recursos e construções têm ícone próprio (não o genérico), e elemento desconhecido usa o genérico
for (const n of all.goods) assert.notEqual(artOf("good", n)[1], "#9a978e", `bem sem ícone próprio: ${n}`);
for (const n of all.buildings) assert.notEqual(artOf("building", n)[1], "#9a978e", `construção sem ícone próprio: ${n}`);
assert.deepEqual(artOf("good", "Coisa nova"), ["nugget", "#9a978e"]);
assert.equal(artId("Fábrica de máquinas"), "fabrica_de_maquinas");
console.log("art ok");
