// Gera uma imagem 128×128 por bioma em public/biomas/<nome>.png (arte provisória, procedural).
// Rodar: npm run biomas. Para trocar a arte, substitua os PNGs mantendo o nome do arquivo.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { TERRAINS, BIOME_FILES, mulberry32 } from "../src/world.ts";

const S = 128;

function png(rgba: Uint8Array) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) Buffer.from(rgba.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function biome(t: number) {
  const img = new Uint8Array(S * S * 4), rand = mulberry32(1000 + t);
  const [br, bg, bb] = TERRAINS[t].color;
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    x = ((x % S) + S) % S; y = ((y % S) + S) % S; const i = (y * S + x) * 4;
    img[i] = r; img[i + 1] = g; img[i + 2] = b;
  };
  const shade = (k: number, f: number) => Math.max(0, Math.min(255, k * f));
  // fundo: cor do bioma com granulado
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const n = 0.9 + rand() * 0.2;
    set(x, y, shade(br, n), shade(bg, n), shade(bb, n)); img[(y * S + x) * 4 + 3] = 255;
  }
  const disc = (cx: number, cy: number, rad: number, f: number) => {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue;
      const light = 1 + (-dx - dy) / (rad * 4); // luz vindo de cima-esquerda
      set(cx + dx, cy + dy, shade(br, f * light), shade(bg, f * light), shade(bb, f * light));
    }
  };
  const name = TERRAINS[t].name;
  if (name === "Oceano") {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++)
      if (Math.sin(x * 0.25 + Math.sin(y * 0.15) * 2 + y * 0.6) > 0.93) set(x, y, 70, 110, 160);
  } else if (name === "Deserto") {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.sin(y * 0.18 + Math.sin(x * 0.07) * 3);
      if (d > 0.6) set(x, y, shade(br, 1.1), shade(bg, 1.1), shade(bb, 1.05)); else if (d < -0.85) set(x, y, shade(br, 0.85), shade(bg, 0.85), shade(bb, 0.8));
    }
  } else if (name === "Planície" || name === "Pradaria") {
    const blades = name === "Pradaria" ? 900 : 450;
    for (let k = 0; k < blades; k++) {
      const x = (rand() * S) | 0, y = (rand() * S) | 0, f = 0.7 + rand() * 0.2;
      for (let h = 0; h < 3; h++) set(x + (h === 2 ? 1 : 0), y - h, shade(br, f), shade(bg, f), shade(bb, f));
    }
  } else if (name === "Floresta" || name === "Selva") {
    const trees = name === "Selva" ? 160 : 90;
    for (let k = 0; k < trees; k++) disc((rand() * S) | 0, (rand() * S) | 0, 4 + ((rand() * (name === "Selva" ? 5 : 3)) | 0), 0.75 + rand() * 0.4);
  } else if (name === "Savana") { // capim seco e algumas árvores esparsas
    for (let k = 0; k < 400; k++) { const x = (rand() * S) | 0, y = (rand() * S) | 0; set(x, y, shade(br, 0.85), shade(bg, 0.85), shade(bb, 0.8)); set(x, y - 1, shade(br, 0.85), shade(bg, 0.85), shade(bb, 0.8)); }
    for (let k = 0; k < 9; k++) disc((rand() * S) | 0, (rand() * S) | 0, 5, 0.55);
  } else if (name === "Estepe") { // capim baixo em faixas
    for (let k = 0; k < 260; k++) { const x = (rand() * S) | 0, y = (rand() * S) | 0, f = rand() < 0.5 ? 0.85 : 1.1; for (let d = 0; d < 4; d++) set(x + d, y, shade(br, f), shade(bg, f), shade(bb, f)); }
  } else if (name === "Taiga") { // pinheiros
    for (let k = 0; k < 70; k++) {
      const cx = (rand() * S) | 0, cy = (rand() * S) | 0, hgt = 7 + ((rand() * 5) | 0);
      for (let dy = 0; dy < hgt; dy++) for (let dx = -((dy / 2) | 0); dx <= ((dy / 2) | 0); dx++) set(cx + dx, cy - hgt + dy, shade(br, dx < 0 ? 1.3 : 0.8), shade(bg, dx < 0 ? 1.3 : 0.8), shade(bb, dx < 0 ? 1.3 : 0.8));
    }
  } else if (name === "Colinas") {
    for (let k = 0; k < 14; k++) disc((rand() * S) | 0, (rand() * S) | 0, 10 + ((rand() * 8) | 0), 0.85 + rand() * 0.25);
  } else if (name === "Montanha") {
    for (let k = 0; k < 7; k++) {
      const cx = (rand() * S) | 0, cy = 30 + ((rand() * S) | 0), hgt = 22 + ((rand() * 18) | 0);
      for (let dy = 0; dy < hgt; dy++) for (let dx = -dy; dx <= dy; dx++) {
        const snow = dy < hgt * 0.3, f = dx < 0 ? 1.15 : 0.75;
        if (snow) set(cx + dx, cy - hgt + dy, 240, 240, 245); else set(cx + dx, cy - hgt + dy, shade(br, f), shade(bg, f), shade(bb, f));
      }
    }
  } else if (name === "Tundra") {
    for (let k = 0; k < 500; k++) { const v = rand() < 0.5 ? 1.25 : 0.75; set((rand() * S) | 0, (rand() * S) | 0, shade(br, v), shade(bg, v), shade(bb, v)); }
  } else if (name === "Gelo") {
    for (let k = 0; k < 12; k++) {
      let x = rand() * S, y = rand() * S, a = rand() * Math.PI * 2;
      for (let s = 0; s < 40; s++) { set(x | 0, y | 0, 170, 195, 225); a += (rand() - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); }
    }
  }
  return img;
}

mkdirSync("public/biomas", { recursive: true });
TERRAINS.forEach((_, t) => {
  writeFileSync(`public/biomas/${BIOME_FILES[t]}`, png(biome(t)));
  console.log(`public/biomas/${BIOME_FILES[t]}`);
});
