// Posições da árvore de tecnologia: colunas pela profundidade dos pré-requisitos (dentro de cada era), faixas por área.
// As linhas correm só pelos corredores entre colunas e entre linhas, então nunca passam por cima de um cartão.
import { TECHS } from "./tech.ts";
import { BUILDINGS } from "./economy.ts";

type Tech = (typeof TECHS)[number];
export const TECH_AREAS: [string, (t: Tech) => boolean][] = [
  ["Militar", (t) => !!(t.army || t.fleet || t.air || t.manpower)],
  ["Ciência", (t) => !!(t.research || t.unrest)],
  ["Comércio", (t) => !!t.trade],
  ["Indústria", (t) => !!(t.unlocks?.some((b) => BUILDINGS.find((x) => x.name === b)?.industry) || t.bonus?.some(([b]) => b !== "Fazenda" && b !== "Pasto"))],
  ["Agricultura", () => true],
];
export const techArea = (t: Tech) => TECH_AREAS.findIndex(([, f]) => f(t));
export const TL = { cw: 184, ch: 76, gx: 46, gy: 18, lx: 120, hy: 34, band: 30 };

export function techLayout(lastEra: number) {
  const ts = TECHS.filter((t) => t.era <= lastEra), byName = new Map(ts.map((t) => [t.name, t]));
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
  // linhas dentro de cada faixa: na ordem média dos pré-requisitos (menos cruzamentos)
  const row = new Map<string, number>(), area = new Map<string, number>(), bands: number[] = [];
  for (const t of ts) area.set(t.name, techArea(t));
  for (let a = 0; a < TECH_AREAS.length; a++) {
    let h = 1;
    for (let c = 0; c < next; c++) {
      const here = ts.filter((t) => area.get(t.name) === a && col.get(t.name) === c);
      const bary = (t: Tech) => { const rs = t.requires.filter((q) => area.get(q) === a && row.has(q)).map((q) => row.get(q)!); return rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : 99; };
      here.sort((x, y) => bary(x) - bary(y) || x.name.localeCompare(y.name)).forEach((t, k) => row.set(t.name, k));
      h = Math.max(h, here.length);
    }
    bands.push(h);
  }
  const bandTop: number[] = []; let y = TL.hy;
  for (const h of bands) { bandTop.push(y); y += TL.band + h * (TL.ch + TL.gy); }
  const X = (c: number) => TL.lx + c * (TL.cw + TL.gx), Y = (n: string) => bandTop[area.get(n)!] + TL.band + row.get(n)! * (TL.ch + TL.gy);
  return { ts, col, eraStart, bands, bandTop, X, Y, width: X(next) + 20, height: y };
}

/** Linhas de pré-requisito em ângulo reto: sai pela direita, desce no corredor, corre no vão acima do cartão de destino. */
export function techEdges(L: ReturnType<typeof techLayout>) {
  const out: { from: string; to: string; pts: [number, number][] }[] = [];
  let k = 0;
  for (const t of L.ts) for (const q of t.requires) {
    if (!L.col.has(q)) continue;
    const off = ((k++ % 5) - 2) * 3; // linhas vizinhas não se sobrepõem
    const x1 = L.X(L.col.get(q)!) + TL.cw, y1 = L.Y(q) + TL.ch / 2, x2 = L.X(L.col.get(t.name)!), y2 = L.Y(t.name) + TL.ch / 2;
    const g1 = x1 + TL.gx / 2 + off, g2 = x2 - TL.gx / 2 + off, lane = L.Y(t.name) - TL.gy / 2 + off;
    const pts: [number, number][] = L.col.get(t.name)! === L.col.get(q)! + 1 ? [[x1, y1], [g1, y1], [g1, y2], [x2, y2]] : [[x1, y1], [g1, y1], [g1, lane], [g2, lane], [g2, y2], [x2, y2]];
    out.push({ from: q, to: t.name, pts });
  }
  return out;
}
