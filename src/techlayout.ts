// Posições da árvore de tecnologia (uma aba por área: Produção, Militar, Social). Colunas pela profundidade dos
// pré-requisitos da MESMA área (dentro de cada era), faixas por subcategoria. Requisito de outra área não vira linha:
// vira rótulo "Nome (Era)" acima do card. As linhas correm só pelos corredores, nunca por cima de um cartão.
import { TECHS, ERAS, areaOf, subOf } from "./tech.ts";
import { SUBS, type Area } from "./techvars.ts";

type Tech = (typeof TECHS)[number];
export const TL = { cw: 184, ch: 76, gx: 46, gy: 18, gyExt: 50, lx: 120, hy: 34, band: 30 };

/** Requisitos de outra área (rótulos acima do card). */
export const externalReqs = (t: Tech) => t.requires.map((q) => TECHS.find((x) => x.name === q)!).filter((p) => p && areaOf(p) !== areaOf(t));
export const reqLabel = (p: Tech) => `${p.name} (${ERAS[p.era]})`;

export function techLayout(lastEra: number, area?: Area) {
  const ts = TECHS.filter((t) => t.era <= lastEra && (!area || areaOf(t) === area)), byName = new Map(ts.map((t) => [t.name, t]));
  const names = area ? SUBS[area] : [...new Set(ts.map(subOf))];
  const gy = area ? TL.gyExt : TL.gy; // espaço entre linhas: cabe os rótulos de requisitos externos
  const col = new Map<string, number>(), eraStart: number[] = [];
  let next = 0;
  for (let era = 0; era <= lastEra; era++) {
    eraStart[era] = next;
    const at = (t: Tech): number => {
      if (col.has(t.name)) return col.get(t.name)!;
      let c = eraStart[t.era];
      for (const q of t.requires) { const p = byName.get(q); if (p && p !== t) c = Math.max(c, at(p) + 1); }
      col.set(t.name, c); return c;
    };
    for (const t of ts) if (t.era === era) next = Math.max(next, at(t) + 1);
    if (next === eraStart[era]) next++; // era sem tecnologia ainda ocupa uma coluna
  }
  eraStart[lastEra + 1] = next;
  // linhas dentro de cada faixa (subcategoria): na ordem média dos pré-requisitos (menos cruzamentos)
  const row = new Map<string, number>(), band = new Map<string, number>(), bands: number[] = [];
  for (const t of ts) band.set(t.name, Math.max(0, names.indexOf(subOf(t))));
  for (let a = 0; a < names.length; a++) {
    let h = 0;
    for (let c = 0; c < next; c++) {
      const here = ts.filter((t) => band.get(t.name) === a && col.get(t.name) === c);
      const bary = (t: Tech) => { const rs = t.requires.filter((q) => band.get(q) === a && row.has(q)).map((q) => row.get(q)!); return rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : 99; };
      here.sort((x, y) => bary(x) - bary(y) || x.name.localeCompare(y.name)).forEach((t, k) => row.set(t.name, k));
      h = Math.max(h, here.length);
    }
    bands.push(h);
  }
  const bandTop: number[] = []; let y = TL.hy;
  for (const h of bands) { bandTop.push(y); y += TL.band + (h ? gy + h * (TL.ch + gy) : 0); }
  const X = (c: number) => TL.lx + c * (TL.cw + TL.gx), Y = (n: string) => bandTop[band.get(n)!] + TL.band + gy + row.get(n)! * (TL.ch + gy);
  return { ts, col, eraStart, bands, bandTop, bandNames: names, gy, X, Y, width: X(next) + 20, height: y };
}

/** Linhas de pré-requisito em ângulo reto (só da mesma aba): sai pela direita, desce no corredor, corre no topo do vão acima do destino. */
export function techEdges(L: ReturnType<typeof techLayout>) {
  const out: { from: string; to: string; pts: [number, number][] }[] = [];
  let k = 0;
  for (const t of L.ts) for (const q of t.requires) {
    if (!L.col.has(q)) continue;
    const off = ((k++ % 5) - 2) * 2; // linhas vizinhas não se sobrepõem
    const x1 = L.X(L.col.get(q)!) + TL.cw, y1 = L.Y(q) + TL.ch / 2, x2 = L.X(L.col.get(t.name)!), y2 = L.Y(t.name) + TL.ch / 2;
    const g1 = x1 + TL.gx / 2 + off, g2 = x2 - TL.gx / 2 + off, lane = L.Y(t.name) - L.gy + 7 + off; // topo do vão: os rótulos externos ficam embaixo, colados no card
    const pts: [number, number][] = L.col.get(t.name)! === L.col.get(q)! + 1 ? [[x1, y1], [g1, y1], [g1, y2], [x2, y2]] : [[x1, y1], [g1, y1], [g1, lane], [g2, lane], [g2, y2], [x2, y2]];
    out.push({ from: q, to: t.name, pts });
  }
  return out;
}
