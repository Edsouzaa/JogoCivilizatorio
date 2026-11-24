import { generateWorld, colorize, MAP_MODES, TERRAINS, RESOURCES, BIOME_FILES, type World } from "./world.ts";
import {
  createEconomy, tick, build, buildCost, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel,
  BASE_PRICE, BUILDINGS, GOODS, RULES, techFor, type Economy,
} from "./economy.ts";
import { ERAS, ERA_WEEKS_PER_SECOND, REVOLUTIONS, TECHS, available } from "./tech.ts";
import { POP_TYPES, CLASSES, politicalWeight, type Pops } from "./pops.ts";
import { GROUPS, LAWS, proposeLaw, cancelLaw, lawSupport, type Politics } from "./politics.ts";
import { pixelToHex, wrapCol, SQRT3 } from "./hex.ts";
import { createRenderer } from "./render.ts";

// 1600 × 640 = 1.024.000 hexágonos ≈ Terra com 500 km² por hex. Mude por ?w=&h= na URL para testar.
const params = new URLSearchParams(location.search);
const W = Number(params.get("w")) || 1600, H = Number(params.get("h")) || 640;
const WORLD_W = SQRT3 * W; // largura do mundo em unidades do mapa (uma volta)

const canvas = document.getElementById("map") as HTMLCanvasElement;
const hud = document.getElementById("hud")!;
const panel = document.getElementById("panel")!;
const renderer = createRenderer(canvas, W, H, BIOME_FILES.map((f) => `/biomas/${f}`));

let world: World, eco: Economy, mode = 0, genMs = 0, colorMs = 0, tickMs = 0, drawnVersion = -1;
const rgba = new Uint8Array(W * H * 4);
const cam = { x: WORLD_W / 2, y: (1.5 * H) / 2, zoom: 0 };
let hover: [number, number] = [-1, -1];
let selected = -1; // índice do hex clicado
let active = 0;    // país que o jogador está controlando (o último país clicado)
let message = "";

// Multiplicador sobre o ritmo da era (ERA_WEEKS_PER_SECOND). "Média" = 1×.
const SPEEDS = [0, 0.25, 0.5, 1, 2, 4];
// O ritmo segue a era do país mais avançado.
// shortcut: em multiplayer isso deve ser decidido pela sala (era mais comum ou votação), quando houver salas.
const worldEra = () => Math.max(...eco.countries.map((c) => c.research.era));
const PHASES = ["madrugada", "manhã", "tarde", "noite"];
function timeLabel() {
  if (worldEra() < REVOLUTIONS) return dateLabel(eco.week);
  const q = Math.floor(acc * 28); // 7 dias × 4 fases dentro da semana atual
  return `${dateLabel(eco.week)} · dia ${Math.floor(q / 4) + 1} · ${PHASES[q % 4]}`;
}
const SPEED_NAMES = ["", "Muito lenta", "Lenta", "Média", "Rápida", "Muito rápida"];
let speed = 3, lastSpeed = 3, acc = 0;

function newWorld(seed: number) {
  let t = performance.now();
  world = generateWorld(W, H, seed);
  genMs = performance.now() - t;
  eco = createEconomy(world);
  selected = -1; active = 0; message = "";
  recolor();
}
function recolor() {
  const t = performance.now();
  renderer.upload(colorize(world, mode, eco.urban, rgba));
  colorMs = performance.now() - t;
  drawnVersion = eco.version;
}
function setMode(m: number) { mode = m; recolor(); }

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  if (!(cam.zoom > 0)) fit(); // aba carregada escondida tem tamanho 0 e deixa zoom = 0
}
function fit() { cam.x = WORLD_W / 2; cam.y = (1.5 * H) / 2; cam.zoom = Math.min(canvas.width / WORLD_W, canvas.height / (1.5 * H)); }
const toWorld = (sx: number, sy: number): [number, number] => {
  const dpr = window.devicePixelRatio || 1;
  return [(sx * dpr - canvas.width / 2) / cam.zoom + cam.x, (sy * dpr - canvas.height / 2) / cam.zoom + cam.y];
};
const hexAt = (sx: number, sy: number): [number, number] => { const [c, r] = pixelToHex(...toWorld(sx, sy)); return [wrapCol(c, W), r]; };
const inMap = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H;
const cityOf = (i: number) => (eco.market[i] ? eco.cities[eco.market[i] - 1] : undefined);

let drag: { x: number; y: number; moved: number } | null = null;
canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointerup", (e) => {
  if (drag && drag.moved < 5) { // clique sem arrastar = selecionar hex
    const [c, r] = hexAt(e.clientX, e.clientY);
    selected = inMap(c, r) ? r * W + c : -1;
    if (selected >= 0 && world.owner[selected]) active = world.owner[selected];
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
    cam.x = ((cam.x % WORLD_W) + WORLD_W) % WORLD_W; // o mundo é redondo: andar para o lado dá a volta
    cam.y = Math.min(1.5 * H, Math.max(0, cam.y));
    drag.x = e.clientX; drag.y = e.clientY;
  }
  hover = hexAt(e.clientX, e.clientY);
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const before = toWorld(e.clientX, e.clientY);
  cam.zoom = Math.min(200, Math.max(0.2, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
  const after = toWorld(e.clientX, e.clientY);
  cam.x += before[0] - after[0]; cam.y += before[1] - after[1]; // zoom em volta do cursor
}, { passive: false });

function togglePause() { if (speed) { lastSpeed = speed; speed = 0; } else speed = lastSpeed; }
function act(result: string | null) { message = result ?? ""; if (eco.version !== drawnVersion) recolor(); updateUI(); }
function doBuild(b = buildingsFor(world.resource[selected], !!eco.urban[selected])[0]) { // B sem escolha = 1ª construção do hex
  if (selected >= 0 && b !== undefined) act(build(world, eco, selected, b));
}
window.addEventListener("keydown", (e) => {
  const n = Number(e.key);
  if (n >= 1 && n <= MAP_MODES.length) setMode(n - 1);
  if (e.key === "r" || e.key === "R") newWorld((Math.random() * 2 ** 31) | 0);
  if (e.key === "f" || e.key === "F") fit();
  if (e.key === "b" || e.key === "B") doBuild();
  if ((e.key === "c" || e.key === "C") && active && selected >= 0) act(foundCity(world, eco, selected, active));
  if (e.key === " ") { e.preventDefault(); togglePause(); }
  if (e.key === "+" || e.key === "=") speed = Math.min(SPEEDS.length - 1, speed + 1);
  if (e.key === "-") speed = Math.max(1, speed - 1);
  updateUI();
});
// pointerdown, não click: o HUD é redesenhado a cada 500 ms e um click pode cair entre o down e o up.
document.addEventListener("pointerdown", (e) => {
  const d = (e.target as HTMLElement).dataset;
  if (d.build) return doBuild(Number(d.build));
  if (d.transfer) return act(transferSize(world, eco, eco.market[selected] - 1, Number(d.transfer)));
  if (d.act === "found") return act(foundCity(world, eco, selected, active));
  if (d.act === "settlers") return act(trainSettlers(world, eco, active));
  if (d.tech && active) { eco.countries[active - 1].research.researching = d.tech; return updateUI(); }
  if (d.law && active) {
    const [cat, name] = d.law.split("|"), c = eco.countries[active - 1];
    return act(proposeLaw(c.politics, cat, name, c.research.era));
  }
  if (d.act === "cancel-law" && active) { cancelLaw(eco.countries[active - 1].politics); return updateUI(); }
  if (d.mode) setMode(Number(d.mode));
  if (d.act === "new") newWorld((Math.random() * 2 ** 31) | 0);
  if (d.act === "pause") togglePause();
  if (d.speed) speed = Number(d.speed);
  if (d.act || d.mode || d.speed) updateUI();
});
window.addEventListener("resize", resize);

const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)} mi` : v >= 1e3 ? `${(v / 1e3).toFixed(1)} mil` : v.toFixed(0);

function updateUI() {
  const [hc, hr] = hover, hi = hr * W + hc;
  const hcity = inMap(hc, hr) ? cityOf(hi) : undefined;
  const info = inMap(hc, hr)
    ? `Hex (${hc}, ${hr}) · ${TERRAINS[world.terrain[hi]].name} · ${RESOURCES[world.resource[hi]]} · pop ${Math.round(world.pop[hi])}` +
      (world.owner[hi] ? ` · ${world.countries[world.owner[hi] - 1].name}` : "") + (hcity ? ` · mercado de ${hcity.name}` : "")
    : "—";
  hud.innerHTML =
    MAP_MODES.map((n, k) => `<button data-mode="${k}" class="${k === mode ? "on" : ""}">${k + 1} ${n}</button>`).join(" ") +
    ` <button data-act="new">R Novo mapa</button>` +
    `<br><b>${timeLabel()}</b> · Era ${ERAS[worldEra()]} <button data-act="pause">${speed ? "⏸ Pausar" : "▶ Continuar"}</button> ` +
    SPEEDS.slice(1).map((s, k) => `<button data-speed="${k + 1}" class="${speed === k + 1 ? "on" : ""}" title="${+(s * ERA_WEEKS_PER_SECOND[worldEra()]).toFixed(3)} semana(s)/s">${SPEED_NAMES[k + 1]}</button>`).join(" ") +
    `<br>${(W * H).toLocaleString("pt-BR")} hexágonos · ${world.landCount.toLocaleString("pt-BR")} em terra · ${eco.cities.length} cidades · seed ${world.seed}` +
    `<br>${fps.toFixed(0)} FPS · pior frame ${worst.toFixed(1)} ms · gerar ${genMs.toFixed(0)} ms · colorir ${colorMs.toFixed(0)} ms · semana ${tickMs.toFixed(1)} ms` +
    `<br>${info}<br><small>Arraste = mover · roda = zoom · clique = selecionar · B = construir · C = fundar cidade · Espaço = pausar · +/− = velocidade · F = ver tudo</small>`;
  panel.innerHTML = selected >= 0 ? countryHtml() + hexHtml() + marketHtml() : "";
  const chart = document.getElementById("gdp") as HTMLCanvasElement | null;
  if (chart && active) drawChart(chart, eco.countries[active - 1].gdpHistory);
}

function countryHtml() {
  if (!active) return "<i>Clique num país para controlá-lo.</i><hr>";
  const c = eco.countries[active - 1], meta = world.countries[active - 1];
  return `<h3 style="color:rgb(${meta.color})">${meta.name} <small>(você)</small></h3>` +
    `População ${fmt(c.pop)} · ${eco.cities.filter((k) => k.country === active).length} cidade(s)<br>PIB anual <b>${fmt(c.gdpWeek * 52)}</b>` +
    `<canvas id="gdp" width="300" height="80" style="width:100%;background:#111;margin:4px 0"></canvas>` +
    `Tesouro ${fmt(c.treasury)} · Dívida <span class="${c.debt > 0 ? "up" : ""}">${fmt(c.debt)}</span>` +
    `<br>Manpower livre <b class="${c.manpower < 20 ? "bad" : ""}">${fmt(c.manpower)}</b>` +
    `<br>Semana: +${fmt(c.income)} impostos (${Math.round(c.tax * 100)}%) − ${fmt(c.upkeep)} manutenção − ${fmt(c.interest)} juros` +
    (c.bankruptWeeks ? `<br><span class="bad">FALIDO: produção −${Math.round((1 - RULES.bankruptPenalty) * 100)}% por mais ${c.bankruptWeeks} semanas</span>` : "") +
    `<br>Colonos: <b>${c.settlers}</b> <button data-act="settlers">Treinar (${RULES.settlerCost} + ${RULES.settlerPop} pessoas)</button>` +
    researchHtml(c.research, c.researchWeek) + popsHtml(c.pops) + politicsHtml(c.politics, c.research.era) + "<hr>";
}

function politicsHtml(p: Politics, era: number) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const groups = GROUPS.map((g, k) => [g, k] as const).filter(([, k]) => p.political[k] > 0.005 || p.popular[k] > 0.005)
    .sort(([, a], [, b]) => p.political[b] - p.political[a])
    .map(([g, k]) => `<tr><td>${p.government.includes(k) ? "🏛 " : ""}${k === p.rival ? "⚠ " : ""}${g.name}</td><td>${pct(p.political[k])}</td><td>${pct(p.popular[k])}</td></tr>`);
  const laws = Object.entries(LAWS).map(([cat, list]) => {
    const opts = list.filter((l) => l.era <= era && l.name !== p.laws[cat]).map((l) => {
      const s = lawSupport(p, l);
      return `<button data-law="${cat}|${l.name}" title="Gostam: ${l.likes.join(", ") || "—"} · Não gostam: ${l.dislikes.join(", ") || "—"}">${l.name} <small class="${s > 0 ? "down" : "up"}">${s > 0 ? "+" : ""}${pct(s)}</small></button>`;
    });
    return `<tr><td>${cat}</td><td><b>${p.laws[cat]}</b></td></tr>` + (opts.length && !p.enacting ? `<tr><td></td><td>${opts.join(" ")}</td></tr>` : "");
  });
  const voting = p.enacting
    ? `<br>Votando <b>${p.enacting.law}</b> · apoio <span class="${p.support > 0 ? "down" : "up"}">${pct(p.support)}</span>${p.support > 0 ? "" : " <span class='bad'>(travada)</span>"} <button data-act="cancel-law">Cancelar</button>` +
      `<div style="background:#333;height:6px;border-radius:3px"><div style="background:#fa6;height:6px;border-radius:3px;width:${Math.min(100, p.enacting.progress * 100)}%"></div></div>` : "";
  return `<details id="politics" ${politicsOpen ? "open" : ""}><summary><b>Política</b> · legitimidade <span class="${p.legitimacy < 0.4 ? "up" : "down"}">${pct(p.legitimacy)}</span>` +
    (p.rival >= 0 ? ` <span class="bad">⚠ ${GROUPS[p.rival].name} tem mais apoio popular que o governo</span>` : "") + `</summary>` +
    `<table><tr><td><b>Grupo</b> <small>(🏛 governo)</small></td><td><b title="decide leis e governo">Político</b></td><td><b title="dá legitimidade">Popular</b></td></tr>${groups.join("")}</table>` +
    `<b>Leis</b> <small>(número = apoio do Poder Político)</small><table>${laws.join("")}</table>${voting}</details>`;
}

let popsOpen = false; // o painel é redesenhado a cada 500 ms; lembra se a lista estava aberta
let politicsOpen = false;
document.addEventListener("toggle", (e) => {
  const d = e.target as HTMLDetailsElement;
  if (d.id === "pops") popsOpen = d.open;
  if (d.id === "politics") politicsOpen = d.open;
}, true);

function popsHtml(p: Pops) {
  const qolColor = (q: number) => (q < 15 ? "up" : q >= 30 ? "down" : "");
  const rows = POP_TYPES.map((t, k) => [t, k] as const).filter(([, k]) => p.count[k] >= 0.5)
    .sort(([a], [b]) => a.cls - b.cls)
    .map(([t, k]) => `<tr><td>${t.name}</td><td>${CLASSES[t.cls]}</td><td>${fmt(p.count[k])}</td>` +
      `<td>${(p.income[k] / p.count[k]).toFixed(2)}</td><td class="${qolColor(p.qol[k])}">${Math.round(p.qol[k])}</td></tr>`);
  const weight = politicalWeight(p), total = weight.reduce((s, v) => s + v, 0) || 1;
  return `<details id="pops" ${popsOpen ? "open" : ""}><summary><b>População por classe</b></summary>` +
    `<table><tr><td><b>POP</b></td><td><b>Classe</b></td><td><b>Pessoas</b></td><td><b title="renda semanal por pessoa">Renda</b></td><td><b title="Qualidade de vida, 1 a 50">QV</b></td></tr>${rows.join("")}</table>` +
    `<small>Peso político: ${CLASSES.map((c, k) => `${c} ${Math.round((weight[k] / total) * 100)}%`).join(" · ")}</small></details>`;
}

function researchHtml(r: Economy["countries"][number]["research"], perWeek: number) {
  const cur = TECHS.find((t) => t.name === r.researching);
  const pct = cur ? Math.min(100, ((r.progress.get(cur.name) ?? 0) / cur.cost) * 100) : 0;
  const effect = (t: (typeof TECHS)[number]) => [
    ...(t.unlocks ?? []).map((b) => `libera ${b}`),
    ...(t.bonus ?? []).map(([b, v]) => `+${Math.round(v * 100)}% ${b}`),
    ...(t.research ? [`+${Math.round(t.research * 100)}% pesquisa`] : []),
  ].join(", ");
  const opts = available(r).map((t) => `<button data-tech="${t.name}" class="${t.name === r.researching ? "on" : ""}" title="${effect(t)}">${t.name} (${t.cost})</button>`);
  return `<br><b>Era ${ERAS[r.era]}</b> · ${r.known.size}/${TECHS.length} tecnologias · ${perWeek.toFixed(1)} pesquisa/semana` +
    (cur ? `<br>Pesquisando <b>${cur.name}</b> <small>(${effect(cur)})</small>` +
      `<div style="background:#333;height:6px;border-radius:3px"><div style="background:#6af;height:6px;border-radius:3px;width:${pct}%"></div></div>` : "<br>Nada para pesquisar nesta era") +
    (opts.length ? `<small>Escolher:</small> ${opts.join(" ")}` : "");
}

function hexHtml() {
  const i = selected, res = world.resource[i], city = cityOf(i);
  let h = `<b>Hex selecionado</b>: ${TERRAINS[world.terrain[i]].name} · ${RESOURCES[res]} · pop ${fmt(world.pop[i])}`;
  if (eco.urban[i]) h += " · <b>urbano</b>";
  if (world.owner[i] !== active || !active) {
    h += world.owner[i] ? `<br>Pertence a ${world.countries[world.owner[i] - 1].name}` : "<br>Sem dono";
    if (active && !world.owner[i]) h += `<br><button data-act="found">C Fundar cidade aqui</button>`;
    return h + (message ? `<br><span class="bad">${message}</span>` : "") + "<hr>";
  }
  const rows = buildingsFor(res, !!eco.urban[i]).map((b) => {
    const def = BUILDINGS[b], lv = eco.levels[b][i];
    const tip = def.boosts !== undefined ? ` <small>(+${Math.round(def.mult! * 100)}% ${BUILDINGS[def.boosts].name}/nível)</small>`
      : def.industry ? ` <small>(${def.industry.inputs.map(([g, q]) => `${q} ${GOODS[g]}`).join(" + ")} → ${def.industry.outputs.map(([g, q]) => `${q} ${GOODS[g]}`).join(" + ")})</small>` : "";
    const tech = techFor(b), locked = tech && !eco.countries[active - 1].research.known.has(tech);
    return `<tr><td>${def.name}${tip}</td><td>nv ${lv}</td><td>${def.workers} 👷</td>` +
      `<td>${locked ? `<small>🔒 ${tech}</small>` : `<button data-build="${b}">${lv ? "Melhorar" : "Construir"} ${buildCost(eco, b, i)}</button>`}</td></tr>`;
  });
  h += rows.length ? `<table>${rows.join("")}</table>` : "<br>Sem construções possíveis";
  if (!eco.urban[i]) h += `<br><button data-act="found">C Fundar cidade aqui</button>`;
  if (city && eco.urban[i]) {
    const others = eco.cities.map((k, idx) => [k, idx] as const).filter(([k]) => k.country === city.country && k !== city);
    h += `<br><b>${city.name}</b> · tamanho ${city.size} · pop urbana ${fmt(city.urban.reduce((s, j) => s + world.pop[j], 0))}` +
      ` (cresce com ${fmt(city.size * RULES.cityGrowthPop)})` +
      (others.length && city.size > 1 ? `<br>Passar 1 de tamanho para: ${others.map(([k, idx]) => `<button data-transfer="${idx}">${k.name}</button>`).join(" ")}` : "");
  }
  return h + (message ? `<br><span class="bad">${message}</span>` : "") + "<hr>";
}

function marketHtml() {
  const city = cityOf(selected);
  if (!city) return "";
  const m = city.market, rows = [];
  for (let gi = 1; gi < GOODS.length; gi++) {
    if (!m.supply[gi] && !m.demand[gi]) continue;
    const pct = Math.round((m.price[gi] - 1) * 100), tr = m.trade[gi];
    const trade = Math.abs(tr) < 0.05 ? "" : tr > 0 ? `<span class="down">+${fmt(tr)}</span>` : `<span class="up">−${fmt(-tr)}</span>`;
    rows.push(`<tr><td>${GOODS[gi]}</td><td>${fmt(m.supply[gi])}</td><td>${trade}</td><td>${fmt(m.demand[gi])}</td>` +
      `<td class="${pct > 0 ? "up" : pct < 0 ? "down" : ""}">${(BASE_PRICE[gi] * m.price[gi]).toFixed(1)} (${pct > 0 ? "+" : ""}${pct}%)</td></tr>`);
  }
  return `<b>Mercado de ${city.name}</b> · ${fmt(m.pop)} pessoas` +
    `<table><tr><td><b>Bem</b></td><td><b>Oferta</b></td><td><b title="+ importado de outras cidades do país, − exportado">Comércio</b></td><td><b>Demanda</b></td><td><b>Preço</b></td></tr>${rows.join("")}</table>`;
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
  acc = Math.min(acc + (Math.min(dt, 250) / 1000) * SPEEDS[speed] * ERA_WEEKS_PER_SECOND[worldEra()], 10);
  for (; acc >= 1; acc--) {
    const t = performance.now();
    tick(world, eco);
    tickMs = performance.now() - t;
  }
  if (eco.version !== drawnVersion || (mode === 2 && eco.week % 4 === 0 && frames === 0)) recolor(); // cidades cresceram / população mudou
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
