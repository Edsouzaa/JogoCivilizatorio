import assert from "node:assert/strict";
import { techLayout, techEdges, externalReqs, reqLabel, TL } from "../src/techlayout.ts";
import { ERAS, TECHS, areaOf } from "../src/tech.ts";
import { AREAS } from "../src/techvars.ts";

// cada aba (Produção, Militar, Social): pré-requisito à esquerda, sem cartões sobrepostos, nenhuma linha por dentro de um cartão,
// rótulos de requisito externo "Nome (Era)" no vão acima do card, sem bater em cartão nem na faixa das linhas
let total = 0;
for (const area of AREAS) {
  const L = techLayout(ERAS.length - 1, area), cards = L.ts.map((t) => ({ n: t.name, x: L.X(L.col.get(t.name)!), y: L.Y(t.name) }));
  total += L.ts.length;
  assert.ok(L.ts.every((t) => areaOf(t) === area));
  for (const t of L.ts) for (const q of t.requires) if (L.col.has(q)) assert.ok(L.col.get(q)! < L.col.get(t.name)!, `${q} antes de ${t.name}`);
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    assert.ok(Math.abs(a.x - b.x) >= TL.cw || Math.abs(a.y - b.y) >= TL.ch, `${a.n} sobre ${b.n}`);
  }
  for (const e of techEdges(L)) for (let k = 1; k < e.pts.length; k++) {
    const [x1, y1] = e.pts[k - 1], [x2, y2] = e.pts[k];
    for (const c of cards) {
      const inX = Math.max(x1, x2) > c.x + 0.5 && Math.min(x1, x2) < c.x + TL.cw - 0.5, inY = Math.max(y1, y2) > c.y + 0.5 && Math.min(y1, y2) < c.y + TL.ch - 0.5;
      assert.ok(!(inX && inY), `${area}: linha ${e.from} → ${e.to} cruza ${c.n}`);
    }
  }
  for (const t of L.ts) {
    const ext = externalReqs(t), y = L.Y(t.name);
    assert.ok(ext.every((p) => areaOf(p) !== area));
    assert.ok(y - 12 * ext.length - 2 > y - L.gy + 7 + 4, `${t.name}: ${ext.length} rótulos não cabem no vão`);
  }
}
assert.equal(total, TECHS.length, "toda tecnologia aparece numa aba");
const aviacao = TECHS.find((t) => t.name === "Aviação")!;
assert.ok(externalReqs(aviacao).some((p) => reqLabel(p) === "Motor a combustão (Grandes Guerras)"), "formato Nome (Era)");
console.log(`tech layout ok (${AREAS.length} abas, ${total} tecnologias)`);
