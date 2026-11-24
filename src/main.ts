import { generateWorld, colorize, MAP_MODES, TERRAINS, RESOURCES, BIOME_FILES, CLIMATES, type World } from "./world.ts";
import {
  createEconomy, tick, build, buildCost, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel, settlersOf,
  BASE_PRICE, BUILDINGS, GOODS, RULES, techFor, type Economy,
} from "./economy.ts";
import { ERAS, ERA_WEEKS_PER_SECOND, REVOLUTIONS, TECHS, available } from "./tech.ts";
import { POP_TYPES, CLASSES, POP_RULES, politicalWeight, averageLoyalty, type Pops } from "./pops.ts";
import { GROUPS, LAWS, proposeLaw, cancelLaw, lawSupport, lawOf, type Politics, type Law } from "./politics.ts";
import { pixelToHex, wrapCol, hexCenter, SQRT3 } from "./hex.ts";
import { recruit, orderMove, declareWar, makePeace, warScore, atWar, disband, stepWar, settlerDistance, WAR } from "./war.ts";
import { createRenderer } from "./render.ts";
import { updateFog, buildInfo } from "./fog.ts";
import { runAI } from "./ai.ts";
import { saveGame, loadGame } from "./save.ts";

let hudMsg = "", hudMsgUntil = 0; // aviso rápido no topo (salvou, erro ao carregar...)
const notify = (m: string) => { hudMsg = m; hudMsgUntil = performance.now() + 5000; };

async function doSave() {
  notify("Salvando...");
  const blob = await saveGame({ world, eco, ui: { active, cam: { ...cam }, mode, speed, explored: [...explored] } });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jogo-civilizatorio-${dateLabel(eco.week).replace(/[^0-9a-zA-Z]+/g, "-")}.save`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  notify(`Partida salva (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
}

async function doLoad(file: File) {
  try {
    const d = await loadGame(file);
    if (d.world.W !== W || d.world.H !== H) throw new Error(`Save de mapa ${d.world.W}×${d.world.H}: abra o jogo com ?w=${d.world.W}&h=${d.world.H}`);
    world = d.world; eco = d.eco; active = d.ui.active; mode = d.ui.mode; speed = d.ui.speed;
    Object.assign(cam, d.ui.cam);
    explored.clear(); for (const [k, v] of d.ui.explored) explored.set(k, v);
    selected = -1; selectedDiv = null; message = "";
    recolor();
    notify(`Partida carregada: ${dateLabel(eco.week)}`);
  } catch (err) {
    notify(`⚠ ${(err as Error).message}`);
  }
}
const fileInput = Object.assign(document.createElement("input"), { type: "file", accept: ".save" });
fileInput.addEventListener("change", () => { if (fileInput.files?.[0]) doLoad(fileInput.files[0]); fileInput.value = ""; });
import { snowAt } from "./world.ts";

// 1600 × 640 = 1.024.000 hexágonos ≈ Terra com 500 km² por hex. Mude por ?w=&h= na URL para testar.
const params = new URLSearchParams(location.search);
const W = Number(params.get("w")) || 1600, H = Number(params.get("h")) || 640;
const WORLD_W = SQRT3 * W; // largura do mundo em unidades do mapa (uma volta)

const canvas = document.getElementById("map") as HTMLCanvasElement;
const hud = document.getElementById("hud")!;
const panel = document.getElementById("panel")!;
const renderer = createRenderer(canvas, W, H, BIOME_FILES.map((f) => `/biomas/${f}`));
const unitsCanvas = document.getElementById("units") as HTMLCanvasElement;
const units = unitsCanvas.getContext("2d")!;

let world: World, eco: Economy, mode = 0, genMs = 0, colorMs = 0, tickMs = 0, drawnVersion = -1;
const rgba = new Uint8Array(W * H * 4), info = new Uint8Array(W * H * 4);
const visible = new Uint8Array(W * H);
const explored = new Map<number, Uint8Array>(); // por país: o que já foi visto
let fogAt = 0, fogKey = ""; // último cálculo da névoa (ms) e para quem
/** Recalcula a névoa do país ativo (no máximo 4× por segundo) e sobe a textura de dados. */
function refreshFog(force = false) {
  const key = `${active}:${eco.version}`;
  if (!force && key === fogKey && performance.now() - fogAt < 250) return;
  fogAt = performance.now(); fogKey = key;
  let ex: Uint8Array | null = null;
  if (active) {
    if (!explored.has(active)) explored.set(active, new Uint8Array(W * H));
    ex = explored.get(active)!;
    updateFog(world, eco, active, ex, visible);
  }
  renderer.uploadInfo(buildInfo(world, info, ex, active ? visible : null));
}
const canSee = (i: number) => !active || visible[i] === 1;
const cam = { x: WORLD_W / 2, y: (1.5 * H) / 2, zoom: 0 };
let hover: [number, number] = [-1, -1];
let selected = -1; // índice do hex clicado
let active = 0;    // país que o jogador está controlando (o último país clicado)
let message = "";
let selectedDiv: number | null = null; // divisão selecionada (id)

// Multiplicador sobre o ritmo da era (ERA_WEEKS_PER_SECOND). "Média" = 1×.
const SPEEDS = [0, 0.5, 1, 3, 10, 30];
// O ritmo segue a era do país mais avançado.
// shortcut: em multiplayer isso deve ser decidido pela sala (era mais comum ou votação), quando houver salas.
const worldEra = () => Math.max(...eco.countries.map((c) => c.research.era));
const PHASES = ["madrugada", "manhã", "tarde", "noite"];
function timeLabel() {
  if (worldEra() < REVOLUTIONS) return dateLabel(eco.week);
  const q = Math.floor(acc * 28); // 7 dias × 4 fases dentro da semana atual
  return `${dateLabel(eco.week)} · dia ${Math.floor(q / 4) + 1} · ${PHASES[q % 4]}`;
}
const SPEED_NAMES = ["", "Lenta", "Média", "Rápida", "Muito rápida", "Máxima"];
let speed = 2, lastSpeed = 2, acc = 0; // 2 = média (1×)

function newWorld(seed: number) {
  let t = performance.now();
  world = generateWorld(W, H, seed);
  genMs = performance.now() - t;
  eco = createEconomy(world);
  selected = -1; active = 0; message = ""; selectedDiv = null;
  explored.clear();
  recolor();
}
function recolor() {
  const t = performance.now();
  renderer.upload(colorize(world, mode, eco.urban, eco.occupier, rgba));
  colorMs = performance.now() - t;
  drawnVersion = eco.version;
  refreshFog(true);
}
function setMode(m: number) { mode = m; recolor(); }

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  unitsCanvas.width = canvas.width; unitsCanvas.height = canvas.height;
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
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return; // botão direito é ordem de movimento (contextmenu), não seleção nem arrasto
  drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", (e) => {
  if (drag && drag.moved < 5) { // clique sem arrastar = selecionar hex
    const [c, r] = hexAt(e.clientX, e.clientY);
    selected = inMap(c, r) ? r * W + c : -1;
    if (selected >= 0 && world.owner[selected]) active = world.owner[selected];
    // clicar num hex com divisões seleciona a próxima delas (cliques repetidos alternam)
    const here = eco.divisions.filter((d) => d.hex === selected);
    const k = here.findIndex((d) => d.id === selectedDiv);
    selectedDiv = here.length ? here[(k + 1) % here.length].id : null;
    if (selectedDiv) active = here[(k + 1) % here.length].country;
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
// botão direito = mandar a divisão selecionada andar até o hex
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const [c, r] = hexAt(e.clientX, e.clientY);
  if (selectedDiv && inMap(c, r)) act(orderMove(world, eco, selectedDiv, r * W + c));
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); doSave(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= MAP_MODES.length) setMode(n - 1);
  if (e.key === "r" || e.key === "R") newWorld((Math.random() * 2 ** 31) | 0);
  if (e.key === "f" || e.key === "F") fit();
  if (e.key === "b" || e.key === "B") doBuild();
  if ((e.key === "c" || e.key === "C") && selectedDiv) act(foundCity(world, eco, selectedDiv));
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
  if (d.act === "found" && selectedDiv) return act(foundCity(world, eco, selectedDiv));
  if (d.act === "settlers") return act(trainSettlers(world, eco, active));
  if (d.tech && active) { eco.countries[active - 1].research.researching = d.tech; return updateUI(); }
  if (d.law && active) {
    const [cat, name] = d.law.split("|"), c = eco.countries[active - 1];
    return act(proposeLaw(c.politics, cat, name, c.research.era));
  }
  if (d.act === "cancel-law" && active) { cancelLaw(eco.countries[active - 1].politics); return updateUI(); }
  if (d.act === "recruit") return act(recruit(world, eco, active, selected));
  if (d.act === "war") return act(declareWar(eco, active, world.owner[selected]));
  if (d.peace) return act(makePeace(world, eco, active, Number(d.peace)));
  if (d.act === "disband" && selectedDiv) { disband(world, eco, selectedDiv); selectedDiv = null; return updateUI(); }
  if (d.tab) { tab = Number(d.tab); return updateUI(); }
  if (d.mode) setMode(Number(d.mode));
  if (d.act === "save") doSave();
  if (d.act === "load") fileInput.click();
  if (d.act === "new") newWorld((Math.random() * 2 ** 31) | 0);
  if (d.act === "pause") togglePause();
  if (d.speed) speed = Number(d.speed);
  if (d.act || d.mode || d.speed) updateUI();
});
window.addEventListener("resize", resize);

const fmt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1)} mi` : v >= 1e3 ? `${(v / 1e3).toFixed(1)} mil` : v.toFixed(0);

const TABS = ["Hex", "Economia", "Pesquisa", "Sociedade", "Política", "Mercado"] as const;
let tab = 0; // aba aberta no painel
const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}`;

function updateUI() {
  const [hc, hr] = hover, hi = hr * W + hc;
  const hcity = inMap(hc, hr) ? cityOf(hi) : undefined;
  const hidden = inMap(hc, hr) && active > 0 && !explored.get(active)?.[hi];
  const info = hidden ? "Inexplorado" : inMap(hc, hr)
    ? `(${hc}, ${hr}) ${TERRAINS[world.terrain[hi]].name}${world.river[hi] ? (world.navigable[hi] ? " · rio navegável" : " · rio") : ""}${snowAt(world, hi, eco.week) ? " · ❄ neve" : ""} · ${CLIMATES[world.climate[hi]]} · ${RESOURCES[world.resource[hi]]} · pop ${Math.round(world.pop[hi])}` +
      (world.owner[hi] ? ` · ${world.countries[world.owner[hi] - 1].name}` : "") + (hcity ? ` · mercado de ${hcity.name}` : "")
    : "—";
  const help = "Arraste = mover · roda = zoom · clique = selecionar · botão direito = mover unidade · B = construir · C = colonos fundam cidade · Espaço = pausar · +/− = velocidade · F = ver tudo · 1–4 = modo de mapa · R = mapa novo";
  hud.innerHTML =
    MAP_MODES.map((n, k) => `<button data-mode="${k}" class="${k === mode ? "on" : ""}">${k + 1} ${n}</button>`).join(" ") +
    ` <button data-act="new" title="Gera um mapa novo">R Novo</button> <button data-act="save" title="Salvar partida em arquivo (Ctrl+S)">💾</button> <button data-act="load" title="Carregar partida de arquivo">📂</button> <span title="${help}" style="cursor:help">❓</span>` +
    `<br><b>${timeLabel()}</b> · ${ERAS[worldEra()]} <button data-act="pause">${speed ? "⏸" : "▶"}</button> ` +
    SPEEDS.slice(1).map((s, k) => `<button data-speed="${k + 1}" class="${speed === k + 1 ? "on" : ""}" title="${SPEED_NAMES[k + 1]}: ${+(s * ERA_WEEKS_PER_SECOND[worldEra()]).toFixed(3)} semana(s)/s">${s}×</button>`).join(" ") +
    `<br><small>${info}</small>` + (performance.now() < hudMsgUntil ? `<br><b>${hudMsg}</b>` : "") +
    `<br><small style="opacity:.6">${fps.toFixed(0)} FPS · semana ${tickMs.toFixed(1)} ms · ${eco.cities.length} cidades · seed ${world.seed}</small>`;
  if (selectedDiv && !eco.divisions.some((d) => d.id === selectedDiv)) selectedDiv = null; // destruída
  const show = selected >= 0 || selectedDiv;
  panel.innerHTML = show ? divisionHtml() + headerHtml() + tabsHtml() + [hexHtml, economyHtml, researchTab, societyHtml, politicsTab, marketHtml][tab]() : "";
  const chart = document.getElementById("gdp") as HTMLCanvasElement | null;
  if (chart && active) drawChart(chart, eco.countries[active - 1].gdpHistory);
}

/** Resumo do país sempre visível no topo do painel. */
function headerHtml() {
  if (!active) return "<i>Clique num país para controlá-lo.</i>";
  const c = eco.countries[active - 1], meta = world.countries[active - 1], p = c.politics;
  const net = c.income - c.upkeep - c.interest;
  return `<h3 style="color:rgb(${meta.color})">${meta.name} <small style="color:#aaa">(você) · Era ${ERAS[c.research.era]}</small></h3>` +
    `<div class="stats">` +
    `<span title="População">👥 ${fmt(c.pop)}</span>` +
    `<span title="PIB anual">📈 ${fmt(c.gdpWeek * 52)}</span>` +
    `<span title="Tesouro e saldo por semana">💰 ${fmt(c.treasury)} <small class="${net < 0 ? "up" : "down"}">${signed(net)}/sem</small></span>` +
    `<span title="Dívida">🏦 <span class="${c.debt > 0 ? "up" : ""}">${fmt(c.debt)}</span></span>` +
    `<span title="Legitimidade do governo">🏛 <span class="${p.legitimacy < 0.4 ? "up" : "down"}">${pct(p.legitimacy)}</span></span>` +
    `<span title="Lealdade média · radicais">❤ ${Math.round(averageLoyalty(c.pops))} · <span class="${c.radicals > 0.1 ? "bad" : ""}">${pct(c.radicals)} rad.</span></span>` +
    `<span title="Manpower livre (só para o exército)">🪖 ${fmt(c.manpower)}</span>` +
    `<span title="Grupos de colonos">⛺ ${settlersOf(eco, active)}</span>` +
    `</div>` +
    (c.bankruptWeeks ? `<div class="bad">FALIDO: produção −${Math.round((1 - RULES.bankruptPenalty) * 100)}% por mais ${c.bankruptWeeks} semanas</div>` : "") +
    (p.rival >= 0 ? `<div class="bad">⚠ ${GROUPS[p.rival].name} tem mais apoio popular que o governo</div>` : "");
}

function tabsHtml() {
  return `<div class="tabs">${TABS.map((t, k) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</div>`;
}

function economyHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1];
  return `<canvas id="gdp" width="300" height="70" style="width:100%;background:#111"></canvas>` +
    `<table><tr><td>Impostos (${pct(c.tax)})</td><td class="down">+${fmt(c.income)}</td></tr>` +
    `<tr><td>Manutenção</td><td class="up">−${fmt(c.upkeep)}</td></tr><tr><td>Juros</td><td class="up">−${fmt(c.interest)}</td></tr>` +
    `<tr><td><b>Saldo por semana</b></td><td><b>${signed(c.income - c.upkeep - c.interest)}</b></td></tr></table>` +
    warsHtml() +
    `<br><button data-act="settlers" title="Cria um grupo de colonos na capital">Treinar colonos (${RULES.settlerCost} + ${RULES.settlerPop} pessoas)</button>`;
}

const researchTab = () => (active ? researchHtml(eco.countries[active - 1].research, eco.countries[active - 1].researchWeek) : "");
const politicsTab = () => (active ? politicsHtml(eco.countries[active - 1].politics, eco.countries[active - 1].research.era) : "");

function societyHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1], p = c.pops;
  const qolColor = (q: number) => (q < 15 ? "up" : q >= 30 ? "down" : "");
  const rows = POP_TYPES.map((t, k) => [t, k] as const).filter(([, k]) => p.count[k] >= 0.5)
    .sort(([a], [b]) => a.cls - b.cls)
    .map(([t, k]) => `<tr><td>${t.name}</td><td>${CLASSES[t.cls]}</td><td>${fmt(p.count[k])}</td>` +
      `<td>${(p.income[k] / p.count[k]).toFixed(2)}</td><td class="${qolColor(p.qol[k])}">${Math.round(p.qol[k])}</td>` +
      `<td class="${p.loyalty[k] < POP_RULES.radicalBelow ? "bad" : ""}">${Math.round(p.loyalty[k])}</td></tr>`);
  const weight = politicalWeight(p), total = weight.reduce((s, v) => s + v, 0) || 1;
  return `<table><tr><td><b>POP</b></td><td><b>Classe</b></td><td><b>Pessoas</b></td><td><b title="renda semanal por pessoa">Renda</b></td><td><b title="Qualidade de vida, 1 a 50">QV</b></td><td><b title="Lealdade, 0 a 100 (abaixo de 30 = radical)">Leal</b></td></tr>${rows.join("")}</table>` +
    `<small>Peso político: ${CLASSES.map((cl, k) => `${cl} ${pct(weight[k] / total)}`).join(" · ")}` +
    ` · migração no mês <span class="${c.migration < 0 ? "up" : c.migration > 0 ? "down" : ""}">${signed(c.migration)}</span></small>`;
}

function divisionHtml() {
  const d = eco.divisions.find((x) => x.id === selectedDiv);
  if (!d) return "";
  const t = d.target === null ? "parada" : `indo para (${d.target % W}, ${(d.target / W) | 0})`;
  if (d.kind === "settler") {
    const dist = settlerDistance(world, eco, d), out = dist > RULES.settlerSupplyRange;
    return `<div class="unit"><b>⛺ Colonos</b> · ${t} · ${Math.round(d.strength)} pessoas · ${dist} hex da cidade` +
      (out ? ` <span class="bad">sem suprimentos (máx. ${RULES.settlerSupplyRange}): morrendo</span>` : "") +
      `<br><button data-act="found">C Fundar cidade aqui</button> <button data-act="disband">Voltar para casa</button>${message ? ` <span class="bad">${message}</span>` : ""}</div>`;
  }
  return `<div class="unit"><b>⚔ Divisão ${d.id}</b> · ${t}` +
    `<br>Soldados ${Math.round(d.strength)}/${WAR.divisionSize} · org. ${pct(d.org)} · armas ${pct(d.equip)} <button data-act="disband">Desfazer</button></div>`;
}

function warsHtml() {
  const enemies = world.countries.map((_, k) => k + 1).filter((b) => atWar(eco, active, b));
  const n = eco.divisions.filter((d) => d.country === active && d.kind === "army").length;
  return `Exército: ${n} divisão(ões)` + (enemies.length ? " · <span class='bad'>Em guerra com</span> " + enemies.map((b) => {
    const s = warScore(world, eco, active, b);
    return `${world.countries[b - 1].name} (${s >= 0 ? "+" : ""}${Math.round(s * 100)}) <button data-peace="${b}">Paz</button>`;
  }).join(" ") : "");
}

/** O que a lei muda, em texto, comparando com a lei em vigor. */
function lawEffect(l: Law, cat: string, p: Politics) {
  const c = eco.countries[active - 1], cur = lawOf(p, cat), parts: string[] = [];
  if (l.tax !== undefined) {
    const delta = c.gdpWeek * (l.tax - cur.tax!) * (RULES.taxBaseEfficiency + p.legitimacy);
    parts.push(`imposto ${pct(l.tax)} do PIB (agora ${pct(cur.tax!)}): <b class="${delta >= 0 ? "down" : "up"}">${signed(delta)}/semana</b>`);
  }
  if (l.tradeShare !== undefined) parts.push(`cidades trocam ${pct(l.tradeShare)} da sobra por semana (agora ${pct(cur.tradeShare!)})`);
  return `${l.desc ?? ""}${parts.length ? "<br>" + parts.join(" · ") : ""}`;
}

function politicsHtml(p: Politics, era: number) {
  const groups = GROUPS.map((g, k) => [g, k] as const).filter(([, k]) => p.political[k] > 0.005 || p.popular[k] > 0.005)
    .sort(([, a], [, b]) => p.political[b] - p.political[a])
    .map(([g, k]) => `<tr><td>${p.government.includes(k) ? "🏛 " : ""}${k === p.rival ? "⚠ " : ""}${g.name}</td><td>${pct(p.political[k])}</td><td>${pct(p.popular[k])}</td></tr>`);
  const laws = Object.entries(LAWS).map(([cat, list]) => {
    const cur = lawOf(p, cat);
    const opts = list.filter((l) => l.name !== cur.name).map((l) => {
      if (l.era > era) return `<tr><td colspan="2"><small style="opacity:.55">🔒 ${l.name} — era ${ERAS[l.era]}</small></td></tr>`;
      const s = lawSupport(p, l);
      return `<tr><td>${p.enacting ? `<b>${l.name}</b>` : `<button data-law="${cat}|${l.name}">${l.name}</button>`}<br><small class="${s > 0 ? "down" : "up"}" title="Gostam: ${l.likes.join(", ") || "—"} · Não gostam: ${l.dislikes.join(", ") || "—"}">apoio ${s > 0 ? "+" : ""}${pct(s)}</small></td>` +
        `<td style="text-align:left"><small>${lawEffect(l, cat, p)}</small></td></tr>`;
    });
    return `<tr><td colspan="2" class="law-cat"><b>${cat}:</b> ${cur.name} <small style="opacity:.75">— ${cur.desc ?? ""}</small></td></tr>${opts.join("")}`;
  });
  const voting = p.enacting
    ? `<div>Votando <b>${p.enacting.law}</b> · apoio <span class="${p.support > 0 ? "down" : "up"}">${pct(p.support)}</span>${p.support > 0 ? "" : " <span class='bad'>(travada)</span>"} <button data-act="cancel-law">Cancelar</button>` +
      `<div class="bar"><div style="background:#fa6;width:${Math.min(100, p.enacting.progress * 100)}%"></div></div></div>` : "";
  return voting +
    `<table><tr><td><b>Grupo</b> <small>(🏛 governo)</small></td><td><b title="decide leis e governo">Político</b></td><td><b title="dá legitimidade">Popular</b></td></tr>${groups.join("")}</table>` +
    `<table class="laws">${laws.join("")}</table>`;
}

function researchHtml(r: Economy["countries"][number]["research"], perWeek: number) {
  const cur = TECHS.find((t) => t.name === r.researching);
  const done = cur ? (r.progress.get(cur.name) ?? 0) / cur.cost : 0;
  const effect = (t: (typeof TECHS)[number]) => [
    ...(t.unlocks ?? []).map((b) => `libera ${b}`),
    ...(t.bonus ?? []).map(([b, v]) => `+${Math.round(v * 100)}% ${b}`),
    ...(t.research ? [`+${Math.round(t.research * 100)}% pesquisa`] : []),
  ].join(", ");
  const weeks = cur ? Math.ceil(((1 - done) * cur.cost) / Math.max(perWeek, 1e-9)) : 0;
  const opts = available(r).map((t) => `<tr><td><button data-tech="${t.name}" class="${t.name === r.researching ? "on" : ""}">${t.name}</button></td><td style="text-align:left"><small>${effect(t)}</small></td><td>${fmt(t.cost)}</td></tr>`);
  return `${r.known.size}/${TECHS.length} tecnologias · ${perWeek.toFixed(1)} pontos/semana` +
    (cur ? `<br>Pesquisando <b>${cur.name}</b> · faltam ~${weeks} semanas<div class="bar"><div style="background:#6af;width:${done * 100}%"></div></div>` : "<br>Nada para pesquisar nesta era") +
    (opts.length ? `<table>${opts.join("")}</table>` : "");
}

function hexHtml() {
  if (selected < 0) return "<i>Clique num hexágono.</i>";
  const i = selected, res = world.resource[i], city = cityOf(i);
  let h = `<b>Hex selecionado</b>: ${TERRAINS[world.terrain[i]].name} · ${RESOURCES[res]} · pop ${fmt(world.pop[i])}`;
  if (eco.urban[i]) h += " · <b>urbano</b>";
  if (world.owner[i] !== active || !active) {
    h += world.owner[i] ? `<br>Pertence a ${world.countries[world.owner[i] - 1].name}` : "<br>Sem dono";
    if (active && world.owner[i] && !atWar(eco, active, world.owner[i])) h += ` <button data-act="war">Declarar guerra</button>`;
    if (eco.occupier[i]) h += `<br>Ocupado por ${world.countries[eco.occupier[i] - 1].name}`;
    return h + (message ? `<br><span class="bad">${message}</span>` : "");
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
  if (eco.urban[i] && !eco.occupier[i]) h += `<br><button data-act="recruit">Recrutar divisão (${WAR.recruitCost} + ${WAR.divisionSize} manpower)</button>`;
  if (eco.occupier[i]) h += `<br><span class="bad">Ocupado por ${world.countries[eco.occupier[i] - 1].name}</span>`;
  if (city && eco.urban[i]) {
    const others = eco.cities.map((k, idx) => [k, idx] as const).filter(([k]) => k.country === city.country && k !== city);
    h += `<br><b>${city.name}</b> · tamanho ${city.size} · pop urbana ${fmt(city.urban.reduce((s, j) => s + world.pop[j], 0))}` +
      ` (cresce com ${fmt(city.size * RULES.cityGrowthPop)})` +
      (others.length && city.size > 1 ? `<br>Passar 1 de tamanho para: ${others.map(([k, idx]) => `<button data-transfer="${idx}">${k.name}</button>`).join(" ")}` : "");
  }
  return h + (message ? `<br><span class="bad">${message}</span>` : "");
}

function marketHtml() {
  if (selected < 0) return "<i>Clique num hexágono do país para ver o mercado da cidade dele.</i>";
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

/** Divisões desenhadas por cima do mapa (canvas 2D): círculo na cor do país, com soldados e organização. */
function drawUnits() {
  units.clearRect(0, 0, unitsCanvas.width, unitsCanvas.height);
  const toScreen = (i: number): [number, number] => {
    let [x, y] = hexCenter(i % W, (i / W) | 0);
    x += Math.round((cam.x - x) / WORLD_W) * WORLD_W; // cópia mais perto da câmera (mundo dá a volta)
    return [(x - cam.x) * cam.zoom + unitsCanvas.width / 2, (y - cam.y) * cam.zoom + unitsCanvas.height / 2];
  };
  const r = Math.max(4, Math.min(cam.zoom * 0.7, 30));
  const stack = new Map<number, number>();
  for (const d of eco.divisions) {
    if (d.country !== active && !canSee(d.hex)) continue;
    const [sx, sy] = toScreen(d.hex);
    if (sx < -r || sy < -r || sx > unitsCanvas.width + r || sy > unitsCanvas.height + r) continue;
    const n = stack.get(d.hex) ?? 0; stack.set(d.hex, n + 1);
    const x = sx + n * r * 0.6, y = sy - n * r * 0.6;
    if (d.target !== null && d.id === selectedDiv) {
      const [tx, ty] = toScreen(d.target);
      units.strokeStyle = "#fff"; units.setLineDash([4, 4]); units.beginPath(); units.moveTo(x, y); units.lineTo(tx, ty); units.stroke(); units.setLineDash([]);
    }
    units.fillStyle = `rgb(${world.countries[d.country - 1].color})`;
    units.strokeStyle = d.id === selectedDiv ? "#fff" : "#000"; units.lineWidth = d.id === selectedDiv ? 3 : 1.5;
    units.beginPath();
    if (d.kind === "settler") units.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); else units.arc(x, y, r, 0, Math.PI * 2);
    units.fill(); units.stroke();
    units.fillStyle = "#3c3"; units.fillRect(x - r, y + r + 2, 2 * r * d.org, 3); // barra de organização
    if (r >= 10) { units.fillStyle = "#000"; units.font = `bold ${Math.round(r * 0.8)}px sans-serif`; units.textAlign = "center"; units.textBaseline = "middle"; units.fillText(String(Math.round(d.strength)), x, y); }
  }
}

let frames = 0, fps = 0, last = performance.now(), worst = 0, prev = last;
function frame(now: number) {
  const dt = now - prev;
  worst = Math.max(worst, dt); prev = now;
  acc = Math.min(acc + (Math.min(dt, 250) / 1000) * SPEEDS[speed] * ERA_WEEKS_PER_SECOND[worldEra()], 10);
  for (; acc >= 1; acc--) {
    const t = performance.now();
    tick(world, eco);
    stepWar(world, eco);
    // shortcut: só o país ativo é humano; com multiplayer, todos os países com jogador ficam fora da IA
    if (eco.week % 4 === 0) for (let k = 1; k <= eco.countries.length; k++) if (k !== active) runAI(world, eco, k);
    tickMs = performance.now() - t;
  }
  if (eco.version !== drawnVersion || (mode === 2 && eco.week % 4 === 0 && frames === 0)) recolor(); // cidades cresceram / população mudou
  refreshFog();
  renderer.draw(cam.x, cam.y, cam.zoom, hover[0], hover[1], Math.cos((2 * Math.PI * (eco.week % 52)) / 52), active > 0);
  drawUnits();
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
