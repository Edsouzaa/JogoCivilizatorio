import { generateWorld, colorize, MAP_MODES, TERRAINS, RESOURCES, type World } from "./world.ts";
import { createEconomy, tick, build, buildCost, buildingsFor, dateLabel, BASE_PRICE, BUILDINGS, RULES, type Economy } from "./economy.ts";
import { pixelToHex, SQRT3 } from "./hex.ts";
import { createRenderer } from "./render.ts";

// 1600 × 640 = 1.024.000 hexágonos ≈ Terra com 500 km² por hex. Mude por ?w=&h= na URL para testar.
const params = new URLSearchParams(location.search);
const W = Number(params.get("w")) || 1600, H = Number(params.get("h")) || 640;

const canvas = document.getElementById("map") as HTMLCanvasElement;
const hud = document.getElementById("hud")!;
const panel = document.getElementById("panel")!;
const renderer = createRenderer(canvas, W, H);

let world: World, eco: Economy, mode = 0, genMs = 0, colorMs = 0, tickMs = 0;
const rgba = new Uint8Array(W * H * 4);
const cam = { x: (SQRT3 * W) / 2, y: (1.5 * H) / 2, zoom: 0 };
let hover: [number, number] = [-1, -1];
let selected = -1; // índice do hex clicado
let message = "";

const SPEEDS = [0, 1, 4, 16, 52]; // semanas por segundo; 0 = pausado
let speed = 1, lastSpeed = 1, acc = 0;

function newWorld(seed: number) {
  let t = performance.now();
  world = generateWorld(W, H, seed);
  genMs = performance.now() - t;
  eco = createEconomy(world);
  selected = -1;
  setMode(mode);
}
function setMode(m: number) {
  mode = m;
  const t = performance.now();
  renderer.upload(colorize(world, mode, rgba));
  colorMs = performance.now() - t;
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  if (!(cam.zoom > 0)) fit(); // aba carregada escondida tem tamanho 0 e deixa zoom = 0
}
function fit() { cam.x = (SQRT3 * W) / 2; cam.y = (1.5 * H) / 2; cam.zoom = Math.min(canvas.width / (SQRT3 * W), canvas.height / (1.5 * H)); }
const toWorld = (sx: number, sy: number): [number, number] => {
  const dpr = window.devicePixelRatio || 1;
  return [(sx * dpr - canvas.width / 2) / cam.zoom + cam.x, (sy * dpr - canvas.height / 2) / cam.zoom + cam.y];
};
const inMap = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H;

let drag: { x: number; y: number; moved: number } | null = null;
canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointerup", (e) => {
  if (drag && drag.moved < 5) { // clique sem arrastar = selecionar hex
    const [c, r] = pixelToHex(...toWorld(e.clientX, e.clientY));
    selected = inMap(c, r) ? r * W + c : -1;
    message = "";
    updateUI();
  }
  drag = null;
});
canvas.addEventListener("pointermove", (e) => {
  if (drag) {
    const dpr = window.devicePixelRatio || 1;
    drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
    cam.x -= ((e.clientX - drag.x) * dpr) / cam.zoom; cam.y -= ((e.clientY - drag.y) * dpr) / cam.zoom;
    drag.x = e.clientX; drag.y = e.clientY;
  }
  hover = pixelToHex(...toWorld(e.clientX, e.clientY));
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const before = toWorld(e.clientX, e.clientY);
  cam.zoom = Math.min(200, Math.max(0.2, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
  const after = toWorld(e.clientX, e.clientY);
  cam.x += before[0] - after[0]; cam.y += before[1] - after[1]; // zoom em volta do cursor
}, { passive: false });

function togglePause() { if (speed) { lastSpeed = speed; speed = 0; } else speed = lastSpeed; }
function doBuild(b = buildingsFor(world.resource[selected])[0]) { // B sem escolha = extratora do hex
  if (selected < 0 || b === undefined) return;
  message = build(world, eco, selected, b) ?? "";
  updateUI();
}
window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= MAP_MODES.length) setMode(n - 1);
  if (e.key === "r" || e.key === "R") newWorld((Math.random() * 2 ** 31) | 0);
  if (e.key === "f" || e.key === "F") fit();
  if (e.key === "b" || e.key === "B") doBuild();
  if (e.key === " ") { e.preventDefault(); togglePause(); }
  if (e.key === "+" || e.key === "=") speed = Math.min(SPEEDS.length - 1, speed + 1);
  if (e.key === "-") speed = Math.max(1, speed - 1);
  updateUI();
});
// pointerdown, não click: o HUD é redesenhado a cada 500 ms e um click pode cair entre o down e o up.
document.addEventListener("pointerdown", (e) => {
  const d = (e.target as HTMLElement).dataset;
  if (d.build) { doBuild(Number(d.build)); return; }
  if (d.mode) setMode(Number(d.mode));
  if (d.act === "new") newWorld((Math.random() * 2 ** 31) | 0);
  if (d.act === "pause") togglePause();
  if (d.speed) speed = Number(d.speed);
  if (d.act) updateUI();
});
window.addEventListener("resize", resize);

const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)} mi` : v >= 1e3 ? `${(v / 1e3).toFixed(1)} mil` : v.toFixed(0);

function updateUI() {
  const [hc, hr] = hover, hi = hr * W + hc;
  const info = inMap(hc, hr)
    ? `Hex (${hc}, ${hr}) · ${TERRAINS[world.terrain[hi]].name} · ${RESOURCES[world.resource[hi]]} · pop ${Math.round(world.pop[hi])}` +
      (world.owner[hi] ? ` · ${world.countries[world.owner[hi] - 1].name}` : "")
    : "—";
  hud.innerHTML =
    MAP_MODES.map((n, k) => `<button data-mode="${k}" class="${k === mode ? "on" : ""}">${k + 1} ${n}</button>`).join(" ") +
    ` <button data-act="new">R Novo mapa</button>` +
    `<br><b>${dateLabel(eco.week)}</b> <button data-act="pause">${speed ? "⏸ Pausar" : "▶ Continuar"}</button> ` +
    SPEEDS.slice(1).map((s, k) => `<button data-speed="${k + 1}" class="${speed === k + 1 ? "on" : ""}">${s}×</button>`).join(" ") +
    `<br>${(W * H).toLocaleString("pt-BR")} hexágonos · ${world.landCount.toLocaleString("pt-BR")} em terra · seed ${world.seed}` +
    `<br>${fps.toFixed(0)} FPS · pior frame ${worst.toFixed(1)} ms · gerar ${genMs.toFixed(0)} ms · colorir ${colorMs.toFixed(0)} ms · semana ${tickMs.toFixed(1)} ms` +
    `<br>${info}<br><small>Arraste = mover · roda = zoom · clique = selecionar · B = construir · Espaço = pausar · +/− = velocidade · F = ver tudo</small>`;

  const owner = selected >= 0 ? world.owner[selected] : 0;
  if (!owner) { panel.innerHTML = selected >= 0 ? `<h3>Sem dono</h3>${TERRAINS[world.terrain[selected]].name}` : ""; return; }
  const c = eco.countries[owner - 1], meta = world.countries[owner - 1];
  const res = world.resource[selected];
  const buildings = buildingsFor(res).map((b) => {
    const def = BUILDINGS[b], lv = eco.levels[b][selected];
    const tip = def.boosts !== undefined ? ` <small>(+${Math.round(def.mult! * 100)}% ${BUILDINGS[def.boosts].name}/nível)</small>` : "";
    return `<tr><td>${def.name}${tip}</td><td>nv ${lv}</td><td>${def.workers} 👷</td>` +
      `<td><button data-build="${b}">${lv ? "Melhorar" : "Construir"} ${buildCost(eco, b, selected)}</button></td></tr>`;
  });
  const goods = [];
  for (let g = 1; g < RESOURCES.length; g++) {
    if (!c.supply[g] && !c.demand[g]) continue;
    const pct = Math.round((c.price[g] - 1) * 100);
    goods.push(`<tr><td>${RESOURCES[g]}</td><td>${fmt(c.supply[g])}</td><td>${fmt(c.demand[g])}</td>` +
      `<td class="${pct > 0 ? "up" : pct < 0 ? "down" : ""}">${(BASE_PRICE[g] * c.price[g]).toFixed(1)} (${pct > 0 ? "+" : ""}${pct}%)</td></tr>`);
  }
  panel.innerHTML =
    `<h3 style="color:rgb(${meta.color})">${meta.name}</h3>` +
    `População ${fmt(c.pop)}<br>PIB anual <b>${fmt(c.gdpWeek * 52)}</b>` +
    `<canvas id="gdp" width="300" height="80" style="width:100%;background:#111;margin:4px 0"></canvas>` +
    `Tesouro ${fmt(c.treasury)} · Dívida <span class="${c.debt > 0 ? "up" : ""}">${fmt(c.debt)}</span>` +
    `<br>Manpower livre <b class="${c.manpower < 1000 ? "bad" : ""}">${fmt(c.manpower)}</b> de ${fmt(c.pop * RULES.manpowerShare)}` +
    `<br>Semana: +${fmt(c.income)} impostos (${Math.round(c.tax * 100)}%) − ${fmt(c.upkeep)} manutenção − ${fmt(c.interest)} juros` +
    (c.bankruptWeeks ? `<br><span class="bad">FALIDO: produção −${Math.round((1 - RULES.bankruptPenalty) * 100)}% por mais ${c.bankruptWeeks} semanas</span>` : "") +
    `<hr><b>Hex selecionado</b>: ${TERRAINS[world.terrain[selected]].name} · ${RESOURCES[res]}` +
    ` · pop ${fmt(world.pop[selected])}` +
    (buildings.length ? `<table>${buildings.join("")}</table>` : "<br>Sem construções possíveis") +
    (message ? `<br><span class="bad">${message}</span>` : "") +
    `<hr><table><tr><td><b>Bem</b></td><td><b>Oferta</b></td><td><b>Demanda</b></td><td><b>Preço</b></td></tr>${goods.join("")}</table>`;
  drawChart(document.getElementById("gdp") as HTMLCanvasElement, c.gdpHistory);
}

function drawChart(cv: HTMLCanvasElement, data: number[]) {
  const g = cv.getContext("2d")!;
  g.clearRect(0, 0, cv.width, cv.height);
  if (data.length < 2) return;
  const max = Math.max(...data) * 1.1 || 1;
  g.strokeStyle = "#6c6"; g.lineWidth = 1.5; g.beginPath();
  data.forEach((v, k) => {
    const x = (k / (data.length - 1)) * cv.width, y = cv.height - (v / max) * cv.height;
    k ? g.lineTo(x, y) : g.moveTo(x, y);
  });
  g.stroke();
  g.fillStyle = "#aaa"; g.font = "10px sans-serif"; g.fillText(fmt(max / 1.1), 4, 12);
}

let frames = 0, fps = 0, last = performance.now(), worst = 0, prev = last;
function frame(now: number) {
  const dt = now - prev;
  worst = Math.max(worst, dt); prev = now;
  acc += (Math.min(dt, 250) / 1000) * SPEEDS[speed];
  for (let n = 0; acc >= 1 && n < 10; n++, acc--) { // no máximo 10 semanas por frame
    const t = performance.now();
    tick(world, eco);
    tickMs = performance.now() - t;
  }
  renderer.draw(cam.x, cam.y, cam.zoom, hover[0], hover[1]);
  frames++;
  if (now - last >= 500) {
    fps = (frames * 1000) / (now - last);
    updateUI();
    frames = 0; last = now; worst = 0;
  }
  requestAnimationFrame(frame);
}

resize();
newWorld(Number(params.get("seed")) || 12345);
requestAnimationFrame(frame);
