import assert from "node:assert/strict";
import { techLayout, techEdges, TL } from "../src/techlayout.ts";
import { ERAS } from "../src/tech.ts";

// árvore inteira: pré-requisito sempre à esquerda, cartões sem sobreposição e nenhuma linha passa por dentro de um cartão
const L = techLayout(ERAS.length - 1), cards = L.ts.map((t) => ({ n: t.name, x: L.X(L.col.get(t.name)!), y: L.Y(t.name) }));
for (const t of L.ts) for (const q of t.requires) if (L.col.has(q)) assert.ok(L.col.get(q)! < L.col.get(t.name)!, `${q} antes de ${t.name}`);
for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
  const a = cards[i], b = cards[j];
  assert.ok(Math.abs(a.x - b.x) >= TL.cw || Math.abs(a.y - b.y) >= TL.ch, `${a.n} sobre ${b.n}`);
}
let segs = 0;
for (const e of techEdges(L)) for (let k = 1; k < e.pts.length; k++) {
  const [x1, y1] = e.pts[k - 1], [x2, y2] = e.pts[k];
  segs++;
  for (const c of cards) {
    const inX = Math.max(x1, x2) > c.x + 0.5 && Math.min(x1, x2) < c.x + TL.cw - 0.5, inY = Math.max(y1, y2) > c.y + 0.5 && Math.min(y1, y2) < c.y + TL.ch - 0.5;
    assert.ok(!(inX && inY), `linha ${e.from} → ${e.to} cruza ${c.n}`);
  }
}
assert.ok(segs > 100);
console.log("tech layout ok", L.width, "x", L.height);
