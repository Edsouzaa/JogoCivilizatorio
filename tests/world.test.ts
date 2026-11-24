import assert from "node:assert/strict";
import { generateWorld, across, snowAt, deepOcean, DEEP_OCEAN, C, T } from "../src/world.ts";
import { hexCenter, hexesInRadius } from "../src/hex.ts";

const w = generateWorld(400, 200, 7, 0);
const { W, H } = w;

// geometria das bordas: o vizinho da borda k fica do lado certo (centro a √3 na direção da borda)
const corner = (h: number, k: number): [number, number] => {
  const [x, y] = hexCenter(h % W, (h / W) | 0), a = ((60 * k - 90) * Math.PI) / 180;
  return [x + Math.cos(a), y + Math.sin(a)];
};
const near = (a: [number, number], b: [number, number]) => {
  let dx = Math.abs(a[0] - b[0]); dx = Math.min(dx, Math.abs(dx - Math.sqrt(3) * W)); // dá a volta
  return Math.hypot(dx, a[1] - b[1]) < 1e-6;
};
for (let t = 0; t < 2000; t++) {
  const h = W * (1 + ((t * 7919) % (H - 2))) + ((t * 104729) % W), k = t % 6;
  const n = across(W, H, h, k);
  // a borda k de h é a borda k+3 de n: os dois cantos coincidem
  assert.ok(near(corner(h, k), corner(n, (k + 4) % 6)) && near(corner(h, (k + 1) % 6), corner(n, (k + 3) % 6)), `borda ${k} de ${h}`);
}

// rios: toda borda com rio aparece igual nos dois hexes; navegável é sempre rio; existem rios e trechos navegáveis
let rivers = 0, nav = 0;
for (let h = 0; h < W * H; h++) {
  for (let k = 0; k < 6; k++) {
    if (!((w.river[h] >> k) & 1)) continue;
    rivers++;
    const n = across(W, H, h, k);
    if (n >= 0) assert.ok((w.river[n] >> ((k + 3) % 6)) & 1, "rio só de um lado da borda");
    if ((w.navigable[h] >> k) & 1) nav++;
  }
  assert.equal(w.navigable[h] & ~w.river[h], 0, "navegável sem rio");
}
assert.ok(rivers > 100 && nav > 0, `rios ${rivers}, navegáveis ${nav}`);

// neve: polar sempre; continental no inverno do seu hemisfério e não no verão; tropical nunca
const find = (c: number, north: boolean) => { for (let i = 0; i < W * H; i++) if (w.climate[i] === c && w.terrain[i] !== T.OCEAN && ((i / W) | 0) < H / 2 === north) return i; return -1; };
const cn = find(C.CONTINENTAL, true), cs = find(C.CONTINENTAL, false), tr = find(C.TROPICAL, true);
let po = -1; for (let i = 0; i < W * H && po < 0; i++) if (w.terrain[i] === T.TUNDRA && w.climate[i] === C.POLAR) po = i;
assert.ok(snowAt(w, cn, 0) && !snowAt(w, cn, 26), "continental norte: neve em janeiro, não em julho");
assert.ok(!snowAt(w, cs, 0) && snowAt(w, cs, 26), "continental sul: hemisfério invertido");
assert.ok(!snowAt(w, tr, 0) && !snowAt(w, tr, 26));
if (po >= 0) assert.ok(snowAt(w, po, 26));
// sem número de países: 1 tribo a cada 10.000 hexes de terra (mínimo 4)
const big = generateWorld(600, 300, 3);
assert.ok(big.owner instanceof Uint16Array && Math.abs(big.countries.length - Math.max(4, Math.round(big.landCount / 10000))) <= 2, `${big.countries.length} tribos`);
// jazida em cima de lavoura/floresta: dois produtos, nunca repetidos; a jazida é a que tem reserva
let two = 0;
for (let i = 0; i < big.W * big.H; i++) if (big.resource2[i]) { two++; assert.notEqual(big.resource2[i], big.resource[i]); }
assert.ok(two > 0, "nenhum hex com 2 produtos");
console.log("world ok");

// oceano profundo: longe da costa; o mar colado na terra nunca é profundo
{
  const deep = deepOcean(big);
  let n = 0;
  for (let i = 0; i < big.W * big.H; i++) {
    if (!deep[i]) continue;
    n++; assert.equal(big.terrain[i], T.OCEAN);
    for (const j of hexesInRadius(i, DEEP_OCEAN, big.W, big.H)) assert.equal(big.terrain[j], T.OCEAN, "profundo perto da terra");
    if (n > 200) break;
  }
  assert.ok(n > 0);
}
console.log("deep ok");

// mar aberto: zonas sem costa juntas (até OPEN_SEA_MAX) e numeração sem buracos
{
  const { OPEN_SEA_MAX, SEA_ZONE_SPACING, COAST_MIN } = await import("../src/world.ts");
  const size = new Map<number, number>(), shore = new Map<number, number>();
  for (let i = 0; i < big.W * big.H; i++) {
    const z = big.seaZone[i]; if (!z) continue;
    size.set(z, (size.get(z) ?? 0) + 1);
    if (hexesInRadius(i, 1, big.W, big.H).some((j) => big.terrain[j] !== T.OCEAN)) shore.set(z, (shore.get(z) ?? 0) + 1);
  }
  const ids = [...size.keys()].sort((a, b) => a - b);
  assert.equal(ids[ids.length - 1], ids.length, "ids de zona com buraco");
  const open = ids.filter((z) => (shore.get(z) ?? 0) < COAST_MIN);
  assert.ok(open.some((z) => size.get(z)! > SEA_ZONE_SPACING.cols * SEA_ZONE_SPACING.rows), "mar aberto deveria ter zonas juntadas");
  for (const z of open) assert.ok(size.get(z)! <= OPEN_SEA_MAX * SEA_ZONE_SPACING.cols * SEA_ZONE_SPACING.rows * 1.5, `zona ${z} grande demais`);
}
console.log("open sea ok");
