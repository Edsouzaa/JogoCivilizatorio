// Bandeiras simples: 3 cores em faixas (ou cruz/canto) + um símbolo no meio. Criadas pelo jogador ou sorteadas.

export const FLAG_LAYOUTS = ["Faixas horizontais", "Faixas verticais", "Cruz", "Canto"];
export const FLAG_SYMBOLS = ["", "★", "☀", "☾", "✚", "♛", "▲", "●", "⚔", "✦"];
export type Flag = { layout: number; colors: [string, string, string]; symbol: string };

const HEX = /^#[0-9a-f]{6}$/i;
/** Bandeira vinda de outro jogador (comando/save): só aceita o formato esperado. */
export const validFlag = (f: unknown): f is Flag => {
  const x = f as Flag;
  return !!x && Number.isInteger(x.layout) && x.layout >= 0 && x.layout < FLAG_LAYOUTS.length &&
    Array.isArray(x.colors) && x.colors.length === 3 && x.colors.every((c) => typeof c === "string" && HEX.test(c)) &&
    FLAG_SYMBOLS.includes(x.symbol);
};

export const rgbHex = (c: readonly number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
export const hexRgb = (h: string): [number, number, number] => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)) as [number, number, number];

/** Bandeira sorteada (determinística por número), usando a cor do país como cor principal. */
export function randomFlag(seed: number, color: readonly number[]): Flag {
  const r = (k: number) => (((Math.imul(seed + 7, 2654435761) ^ Math.imul(k + 3, 374761393)) >>> 0) % 1000) / 1000;
  const pick = (k: number) => rgbHex([r(k) * 255, r(k + 1) * 255, r(k + 2) * 255]);
  return { layout: Math.floor(r(9) * FLAG_LAYOUTS.length), colors: [rgbHex(color), pick(1), r(5) < 0.5 ? "#ffffff" : pick(4)], symbol: FLAG_SYMBOLS[Math.floor(r(11) * FLAG_SYMBOLS.length)] };
}

export function drawFlag(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, f: Flag) {
  const [a, b, c] = f.colors;
  g.fillStyle = a; g.fillRect(x, y, w, h);
  g.fillStyle = b;
  if (f.layout === 0) { g.fillRect(x, y + h / 3, w, h / 3); g.fillStyle = c; g.fillRect(x, y + (2 * h) / 3, w, h / 3); }
  else if (f.layout === 1) { g.fillRect(x + w / 3, y, w / 3, h); g.fillStyle = c; g.fillRect(x + (2 * w) / 3, y, w / 3, h); }
  else if (f.layout === 2) { g.fillRect(x + w * 0.3, y, w * 0.18, h); g.fillRect(x, y + h * 0.41, w, h * 0.18); }
  else { g.fillRect(x, y, w * 0.45, h * 0.5); }
  if (f.symbol && h >= 8) {
    g.fillStyle = f.layout === 3 ? c : f.layout === 2 ? b : c === a ? b : c;
    g.font = `${Math.round(h * 0.6)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(f.symbol, f.layout === 3 ? x + w * 0.225 : x + w / 2, f.layout === 3 ? y + h * 0.25 : y + h / 2);
  }
  g.strokeStyle = "#000"; g.lineWidth = 1; g.strokeRect(x, y, w, h);
}
