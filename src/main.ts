import { generateWorld, colorize, MAP_MODES, TERRAINS, RESOURCES, BIOME_FILES, CLIMATES, T, type World } from "./world.ts";
import {
  createEconomy, tick, build, buildCost, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel, settlersOf,
  proposePact, cancelPact, hasPact, INFAMY,
  BASE_PRICE, BUILDINGS, GOODS, RULES, techFor, type Economy,
} from "./economy.ts";
import { ERAS, ERA_WEEKS_PER_SECOND, DAY_PHASES_ERA, MAX_SPEED, TECHS, available } from "./tech.ts";
import { POP_TYPES, CLASSES, POP_RULES, politicalWeight, averageLoyalty, lowerClassQol, type Pops } from "./pops.ts";
import { GROUPS, LAWS, proposeLaw, cancelLaw, lawSupport, lawOf, type Politics, type Law } from "./politics.ts";
import { pixelToHex, wrapCol, hexCenter, SQRT3 } from "./hex.ts";
import { seaNodes, outline, zoneHexes, type SeaNodes } from "./regions.ts";
import { drawFlag, randomFlag, rgbHex, hexRgb, FLAG_LAYOUTS, FLAG_SYMBOLS, type Flag } from "./flags.ts";
import { recruit, orderMove, declareWar, makePeace, warScore, atWar, disband, stepWar, settlerDistance, buildFleet, buildAir, airSuperiority, airRegion, coastOf, WAR, NAVY, AIR } from "./war.ts";
import { createRenderer } from "./render.ts";
import { updateFog, buildInfo, buildBorders } from "./fog.ts";
import { applyCommand, type Cmd } from "./commands.ts";
import { advanceWeek, checksum } from "./sim.ts";
import { saveGame, loadGame } from "./save.ts";
import { listAutosaves, writeAutosave, readAutosave, autosaveClock, AUTOSAVE, type AutosaveMeta } from "./autosave.ts";
import { createState, addCityToState, removeCityFromState, setStateTax, statesOf, stateOfCity, statesLocked, STATES } from "./states.ts";

let hudMsg = "", hudMsgUntil = 0; // aviso rápido no topo (salvou, erro ao carregar...)
// Painel de notificações (canto de baixo): guarda as últimas, cada uma com a data do jogo; × apaga.
const notesBox = document.createElement("div");
notesBox.style.cssText = "position:fixed;bottom:8px;left:340px;width:300px;max-height:30vh;overflow-y:auto;font-size:12px;display:flex;flex-direction:column-reverse;gap:3px";
document.body.appendChild(notesBox);
const notify = (m: string) => {
  hudMsg = m; hudMsgUntil = performance.now() + 5000;
  const n = document.createElement("div");
  n.style.cssText = "background:#000c;border-radius:5px;padding:4px 22px 4px 8px;position:relative";
  const close = document.createElement("button");
  close.textContent = "×"; close.title = "Dispensar";
  close.style.cssText = "position:absolute;right:3px;top:2px;background:none;border:0;color:#aaa;cursor:pointer";
  close.onclick = () => n.remove();
  const when = document.createElement("small");
  when.style.opacity = ".6";
  try { when.textContent = dateLabel(eco.week) + " — "; } catch { /* antes do mundo existir */ }
  n.append(when, document.createTextNode(m), close);
  notesBox.prepend(n);
  while (notesBox.childElementCount > 30) notesBox.lastChild!.remove();
};
// eventos do país do jogador que viram notificação (comparando com o quadro anterior)
let seenTechs = -1, seenWars = "", seenActive = -1;
function watchEvents() {
  if (!active) return;
  const c = eco.countries[active - 1];
  const wars = [...eco.wars].filter((k) => k.split("-").includes(String(active))).sort().join(",");
  if (seenActive === active) {
    if (c.research.known.size > seenTechs) notify(`🔬 Tecnologia descoberta: ${[...c.research.known].at(-1)}`);
    for (const k of wars.split(",")) if (k && !seenWars.split(",").includes(k)) notify(`⚔ Guerra com ${world.countries[+k.split("-").find((x) => x !== String(active))! - 1].name}`);
    for (const k of seenWars.split(",")) if (k && !wars.split(",").includes(k)) notify(`🕊 Paz com ${world.countries[+k.split("-").find((x) => x !== String(active))! - 1].name}`);
  }
  seenActive = active; seenTechs = c.research.known.size; seenWars = wars;
}

const snapshot = () => saveGame({ world, eco, ui: { active, cam: { ...cam }, mode, speed, explored: [...explored] } });

// salvamento automático: a cada AUTOSAVE.everyMs de jogo rodando (?autosave=segundos na URL para testar)
const autoClock = autosaveClock(Number(new URLSearchParams(location.search).get("autosave")) * 1000 || AUTOSAVE.everyMs);
let lastAuto: AutosaveMeta | null = null, autosaving = false;
listAutosaves().then((m) => { lastAuto = m[0] ?? null; });
async function doAutosave() {
  if (autosaving) return;
  autosaving = true;
  try {
    lastAuto = await writeAutosave(await snapshot(), dateLabel(eco.week));
    notify(`Salvo automaticamente (${lastAuto.label})`);
  } catch {
    notify("⚠ Salvamento automático indisponível neste navegador (use 💾)");
  } finally { autosaving = false; }
}
async function continueAutosave() {
  const blob = lastAuto && (await readAutosave(lastAuto.slot));
  if (blob) doLoad(blob); else notify("⚠ Nenhum salvamento automático encontrado");
}

async function doSave() {
  notify("Salvando...");
  const blob = await snapshot();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jogo-civilizatorio-${dateLabel(eco.week).replace(/[^0-9a-zA-Z]+/g, "-")}.save`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  notify(`Partida salva (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
}

async function doLoad(file: Blob) {
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
const rgba = new Uint8Array(W * H * 4), info = new Uint8Array(W * H * 4), borders = new Uint8Array(W * H * 4);
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
const SPEEDS = [0, 0.5, 1, 3, 10, MAX_SPEED];
// O ritmo segue a era do país mais avançado.
// shortcut: em multiplayer isso deve ser decidido pela sala (era mais comum ou votação), quando houver salas.
const worldEra = () => Math.max(...eco.countries.map((c) => c.research.era));
const PHASES = ["noite", "manhã", "tarde"];
function timeLabel() {
  if (worldEra() < DAY_PHASES_ERA) return dateLabel(eco.week);
  const q = Math.floor(acc * 21); // 7 dias × 3 fases dentro da semana atual
  return `${dateLabel(eco.week)} · dia ${Math.floor(q / 3) + 1} · ${PHASES[q % 3]}`;
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
  renderer.uploadBorders(buildBorders(world, eco, borders)); // fronteiras mudam junto com o mapa político
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

// Botão esquerdo: clique seleciona, arrastar faz a caixa de seleção de tropas. Direito ou meio: arrasta o mapa; clique direito = ordem.
let drag: { x: number; y: number; x0: number; y0: number; moved: number; box: boolean } | null = null;
let group: number[] = []; // divisões selecionadas pela caixa (todas do mesmo país)
let lastPan = 0;          // quanto o último arrasto com o botão direito andou (contextmenu não vira ordem se arrastou)
canvas.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, box: e.button === 0 }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", (e) => {
  if (drag && !drag.box) lastPan = drag.moved;
  if (drag?.box && drag.moved >= 5) { // caixa: pega as tropas do país dentro dela
    const dpr = window.devicePixelRatio || 1;
    const [x0, x1] = [drag.x0, e.clientX].map((v) => v * dpr).sort((a, b) => a - b), [y0, y1] = [drag.y0, e.clientY].map((v) => v * dpr).sort((a, b) => a - b);
    const inside = eco.divisions.filter((d) => { const [x, y] = divScreen(d.hex); return x >= x0 && x <= x1 && y >= y0 && y <= y1 && (d.country === active || canSee(d.hex)); });
    const who = inside.some((d) => d.country === active) ? active : inside[0]?.country ?? 0;
    group = inside.filter((d) => d.country === who && (!net || who === active)).map((d) => d.id);
    selectedDiv = group[0] ?? null;
    if (who && !net) { active = who; eco.humans = [active]; }
    message = ""; updateUI();
  } else if (drag?.box && drag.moved < 5) { // clique sem arrastar = selecionar hex
    const [c, r] = hexAt(e.clientX, e.clientY);
    selected = inMap(c, r) ? r * W + c : -1;
    if (!net && selected >= 0 && world.owner[selected]) { active = world.owner[selected]; eco.humans = [active]; }
    // clicar num hex com divisões seleciona a próxima delas (cliques repetidos alternam)
    const here = eco.divisions.filter((d) => d.hex === selected);
    const k = here.findIndex((d) => d.id === selectedDiv);
    selectedDiv = here.length ? here[(k + 1) % here.length].id : null;
    if (selectedDiv) active = here[(k + 1) % here.length].country;
    group = selectedDiv ? [selectedDiv] : [];
    message = "";
    updateUI();
  }
  drag = null;
});
canvas.addEventListener("pointermove", (e) => {
  if (drag) {
    const dpr = window.devicePixelRatio || 1;
    drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
    if (drag.box) { drag.x = e.clientX; drag.y = e.clientY; hover = hexAt(e.clientX, e.clientY); return; }
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
  if (lastPan >= 5) { lastPan = 0; return; } // foi arrasto do mapa, não ordem
  if (!inMap(c, r)) return;
  for (const id of group.length ? group : selectedDiv ? [selectedDiv] : []) cmd({ t: "move", id, target: r * W + c });
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const before = toWorld(e.clientX, e.clientY);
  cam.zoom = Math.min(200, Math.max(0.2, cam.zoom * Math.exp(-e.deltaY * 0.0015)));
  const after = toWorld(e.clientX, e.clientY);
  cam.x += before[0] - after[0]; cam.y += before[1] - after[1]; // zoom em volta do cursor
}, { passive: false });

function togglePause() {
  if (net) return net.send(JSON.stringify({ t: mp?.paused ? "unpause" : "pause" }));
  if (speed) { lastSpeed = speed; speed = 0; } else speed = lastSpeed;
}
function setSpeed(i: number) { if (net) net.send(JSON.stringify({ t: "speed", i })); else speed = i; }
/** Ação do jogador: no single-player vale na hora; no multiplayer vai para o servidor e volta para todos no próximo passo. */
function cmd(c: Cmd) {
  if (net) { net.send(JSON.stringify({ t: "cmd", cmd: c })); message = ""; return updateUI(); }
  act(applyCommand(world, eco, active, c));
}

// ---------------- identidade do país: nome, cor e bandeira ----------------
const idBox = document.createElement("div");
idBox.style.cssText = "display:none;position:fixed;top:120px;left:8px;background:#000d;padding:10px;border-radius:6px;width:300px;line-height:1.9;z-index:5";
idBox.innerHTML = `<b id="id-title">🏳 Identidade do país</b><br>
  Nome <input id="id-name" maxlength="30" style="width:200px"><br>
  <span id="id-colorrow">Cor no mapa <input id="id-color" type="color"><br></span>
  Bandeira <select id="id-layout">${FLAG_LAYOUTS.map((l, k) => `<option value="${k}">${l}</option>`).join("")}</select>
  <select id="id-symbol">${FLAG_SYMBOLS.map((s) => `<option value="${s}">${s || "sem símbolo"}</option>`).join("")}</select><br>
  Cores <input id="id-c0" type="color"> <input id="id-c1" type="color"> <input id="id-c2" type="color"><br>
  <canvas id="id-preview" width="120" height="80" style="border-radius:3px"></canvas><br>
  <button id="id-ok">Aplicar</button> <button id="id-cancel">Fechar</button>`;
document.body.appendChild(idBox);
const idIn = (k: string) => document.getElementById("id-" + k) as HTMLInputElement;
const idFlag = (): Flag => ({ layout: +idIn("layout").value, symbol: idIn("symbol").value, colors: [idIn("c0").value, idIn("c1").value, idIn("c2").value] });
const idPreview = () => { const g = (idIn("preview") as unknown as HTMLCanvasElement).getContext("2d")!; g.clearRect(0, 0, 120, 80); drawFlag(g, 1, 1, 118, 78, idFlag()); };
/** Mesma janela para país, cidade e estado: nome + bandeira (cor no mapa só no país). */
let idOk: () => void = () => {};
function openNamer(title: string, name: string, f: Flag, ok: () => void, color?: readonly number[]) {
  document.getElementById("id-title")!.textContent = title;
  (document.getElementById("id-colorrow") as HTMLElement).style.display = color ? "" : "none";
  idIn("name").value = name;
  if (color) idIn("color").value = rgbHex(color);
  idIn("layout").value = String(f.layout); idIn("symbol").value = f.symbol;
  f.colors.forEach((c, k) => (idIn("c" + k).value = c));
  idOk = ok; idBox.style.display = "block"; idPreview(); idIn("name").focus();
}
function openIdentity() {
  const meta = world.countries[active - 1];
  openNamer("🏳 Identidade do país", meta.name, flagOf(active), () => cmd({ t: "identity", name: idIn("name").value, color: hexRgb(idIn("color").value), flag: idFlag() }), meta.color);
}
const cityFlag = (k: number) => eco.cities[k].flag ?? flagOf(eco.cities[k].country);
const stateFlag = (id: number) => { const s = eco.states.find((x) => x.id === id)!; return s.flag ?? flagOf(s.country); };
/** Fundar cidade: pede nome e bandeira antes (a bandeira começa sendo a do país). */
function askFound(unit: number) {
  openNamer("🏙 Nova cidade", `Cidade ${eco.cities.length + 1}`, flagOf(active), () => cmd({ t: "found", unit, name: idIn("name").value, flag: idFlag() }));
}
idBox.addEventListener("input", idPreview);
idBox.addEventListener("keydown", (ev) => { if (ev.key === "Enter") idIn("ok").click(); if (ev.key === "Escape") idIn("cancel").click(); });
idIn("ok").onclick = () => { idOk(); idBox.style.display = "none"; };
idIn("cancel").onclick = () => (idBox.style.display = "none");

// ---------------- multiplayer (lockstep; ver server/server.ts) ----------------
type RoomStatus = { code: string; speed: number; paused: string | null; votes: number; needed: number; players: { id: number; name: string; country: number }[] };
let net: WebSocket | null = null, mp: RoomStatus | null = null, myId = 0, synced = false;
const pendingSteps: { week: number; cmds: [number, Cmd][] }[] = [];
const mpBox = document.createElement("div");
mpBox.id = "mpbox";
mpBox.style.cssText = "display:none;position:fixed;top:120px;left:8px;background:#000c;padding:10px;border-radius:6px;width:300px;line-height:1.8";
mpBox.innerHTML = `<b>🌐 Multiplayer</b> <small>(servidor: npm run server)</small><br>
  Servidor <input id="mp-url" style="width:200px"><br>Seu nome <input id="mp-name" maxlength="24" style="width:120px"><br>
  Senha <input id="mp-pass" type="password" maxlength="64" style="width:120px" placeholder="opcional"><br>
  <button id="mp-create">Criar sala (mapa deste tamanho)</button><br>
  Código <input id="mp-code" maxlength="4" style="width:60px;text-transform:uppercase"> <button id="mp-join">Entrar</button>`;
document.body.appendChild(mpBox);
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
$("mp-url").value = params.get("server") ?? `ws://${location.hostname || "localhost"}:8787`;
$("mp-name").value = params.get("name") ?? "";
$("mp-create").onclick = () => connect({ t: "create", name: $("mp-name").value, w: W, h: H, password: $("mp-pass").value });
$("mp-join").onclick = () => connect({ t: "join", code: $("mp-code").value.toUpperCase(), name: $("mp-name").value, password: $("mp-pass").value });

// chat da sala: mensagens viram texto (textContent), nunca HTML
const chatBox = document.createElement("div");
chatBox.style.cssText = "display:none;position:fixed;bottom:8px;left:8px;width:320px;background:#000b;border-radius:6px;padding:6px;font-size:12px";
chatBox.innerHTML = `<div id="chat-log" style="max-height:140px;overflow-y:auto;margin-bottom:4px"></div><input id="chat-in" maxlength="200" placeholder="Mensagem para a sala (Enter)" style="width:100%;box-sizing:border-box">`;
document.body.appendChild(chatBox);
const chatLog = document.getElementById("chat-log")!;
$("chat-in").addEventListener("keydown", (ev) => {
  if (ev.key !== "Enter" || !net || !$("chat-in").value.trim()) return;
  net.send(JSON.stringify({ t: "chat", text: $("chat-in").value }));
  $("chat-in").value = "";
});
function addChat(m: { from: string; country: number; week: number; text: string }) {
  const line = document.createElement("div");
  const who = document.createElement("b");
  who.textContent = m.from + (m.country ? ` (${world.countries[m.country - 1]?.name ?? "?"})` : "") + ": ";
  if (m.country) who.style.color = `rgb(${world.countries[m.country - 1]?.color ?? "255,255,255"})`;
  line.append(who, document.createTextNode(m.text));
  chatLog.appendChild(line);
  while (chatLog.childElementCount > 50) chatLog.firstChild!.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
}

function applyStep(m: { week: number; cmds: [number, Cmd][] }) {
  for (const [country, c] of m.cmds) applyCommand(world, eco, country, c);
  advanceWeek(world, eco);
  if (eco.week !== m.week) { synced = false; net?.send(JSON.stringify({ t: "resync" })); } // fora de passo: pede a foto
}

function connect(hello: object) {
  net?.close();
  let ws: WebSocket;
  try { ws = new WebSocket($("mp-url").value); } catch { return notify("⚠ Endereço de servidor inválido"); }
  ws.binaryType = "arraybuffer";
  net = ws; synced = false; pendingSteps.length = 0;
  ws.onopen = () => ws.send(JSON.stringify(hello));
  ws.onmessage = async (ev) => {
    if (ev.data instanceof ArrayBuffer) { // foto da partida
      try {
        const d = await loadGame(new Blob([ev.data]));
        world = d.world; eco = d.eco; synced = true;
        explored.clear(); selected = -1; selectedDiv = null;
        for (const st of pendingSteps.splice(0)) if (st.week > eco.week) applyStep(st);
        recolor();
        updateUI();
      } catch (err) { notify(`⚠ ${(err as Error).message}`); }
      return;
    }
    const m = JSON.parse(ev.data as string);
    if (m.t === "welcome") {
      if (m.w !== W || m.h !== H) { // a sala tem outro tamanho de mapa: recarrega a página no tamanho certo e entra de novo
        location.search = new URLSearchParams({ w: m.w, h: m.h, server: $("mp-url").value, room: m.code, name: $("mp-name").value }).toString();
        return;
      }
      myId = m.id; mpBox.style.display = "none"; chatBox.style.display = "block"; notify(`Na sala ${m.code}`);
    } else if (m.t === "step") { if (synced) applyStep(m); else pendingSteps.push(m); }
    else if (m.t === "check" && synced && checksum(eco) !== m.sum) { synced = false; notify("Fora de sincronia: recebendo a partida de novo..."); ws.send(JSON.stringify({ t: "resync" })); }
    else if (m.t === "status") {
      mp = m; speed = m.paused ? 0 : m.speed; lastSpeed = m.speed;
      active = m.players.find((p: { id: number }) => p.id === myId)?.country ?? 0;
    } else if (m.t === "err") notify(`⚠ ${m.msg}`);
    else if (m.t === "chat") addChat(m);
    updateUI();
  };
  ws.onclose = () => { if (net === ws) { net = null; mp = null; chatBox.style.display = "none"; notify("Desconectado do servidor (a partida continua só aqui)"); } };
}
if (params.get("server") && params.get("room")) setTimeout(() => connect({ t: "join", code: params.get("room"), name: params.get("name") ?? "" }), 0);

function act(result: string | null) { message = result ?? ""; if (eco.version !== drawnVersion) recolor(); updateUI(); }
function doBuild(b = buildingsFor(world.resource[selected], !!eco.urban[selected])[0]) { // B sem escolha = 1ª construção do hex
  if (selected >= 0 && b !== undefined) cmd({ t: "build", i: selected, b });
}
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); doSave(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= MAP_MODES.length) setMode(n - 1);
  if (e.key === "r" || e.key === "R") newWorld((Math.random() * 2 ** 31) | 0);
  if (e.key === "f" || e.key === "F") fit();
  if (e.key === "b" || e.key === "B") doBuild();
  if ((e.key === "c" || e.key === "C") && selectedDiv) askFound(selectedDiv);
  if (e.key === " ") { e.preventDefault(); togglePause(); }
  if (e.key === "+" || e.key === "=") setSpeed(Math.min(SPEEDS.length - 1, (speed || lastSpeed) + 1));
  if (e.key === "-") setSpeed(Math.max(1, (speed || lastSpeed) - 1));
  updateUI();
});
// pointerdown, não click: o HUD é redesenhado a cada 500 ms e um click pode cair entre o down e o up.
document.addEventListener("pointerdown", (e) => {
  const d = (e.target as HTMLElement).dataset;
  if (d.build) return doBuild(Number(d.build));
  if (d.transfer) return cmd({ t: "transfer", from: eco.market[selected] - 1, to: Number(d.transfer) });
  if (d.act === "found" && selectedDiv) return askFound(selectedDiv);
  if (d.groupKind) { group = eco.divisions.filter((x) => group.includes(x.id) && x.kind === d.groupKind).map((x) => x.id); selectedDiv = group[0] ?? null; return updateUI(); }
  if (d.act === "identity" && active) return openIdentity();
  if (d.rename) { // "city:3" ou "state:2"
    const [kind, id] = d.rename.split(":") as ["city" | "state", string];
    const cur = kind === "city" ? eco.cities[+id].name : eco.states.find((s) => s.id === +id)!.name;
    return openNamer(kind === "city" ? "🏙 Cidade" : "🗺 Estado", cur, kind === "city" ? cityFlag(+id) : stateFlag(+id), () => cmd({ t: "rename", kind, id: +id, name: idIn("name").value, flag: idFlag() }));
  }
  if (d.act === "settlers") return cmd({ t: "settlers" });
  if (d.tech && active) return cmd({ t: "tech", name: d.tech });
  if (d.law && active) {
    const [cat, name] = d.law.split("|"), c = eco.countries[active - 1];
    void c;
    return cmd({ t: "law", cat, name });
  }
  if (d.act === "cancel-law" && active) return cmd({ t: "cancelLaw" });
  if (d.act === "recruit") return cmd({ t: "recruit", hex: selected });
  if (d.act === "fleet") return cmd({ t: "fleet", hex: selected });
  if (d.stateNew) {
    const k = Number(d.stateNew);
    return openNamer("🗺 Novo estado", `Estado de ${eco.cities[k].name}`, cityFlag(k), () => cmd({ t: "stateNew", city: k, name: idIn("name").value, flag: idFlag() }));
  }
  if (d.stateJoin) { const [city, st] = d.stateJoin.split("|").map(Number); return cmd({ t: "stateJoin", city, state: st }); }
  if (d.stateLeave) return cmd({ t: "stateLeave", city: Number(d.stateLeave) });
  if (d.stateTax) { const [st, law] = d.stateTax.split("|"); return cmd({ t: "stateTax", state: Number(st), law: law || null }); }
  if (d.act === "air") return cmd({ t: "air", hex: selected });
  if (d.act === "war") return cmd({ t: "war", target: world.owner[selected] });
  if (d.peace) return cmd({ t: "peace", target: Number(d.peace) });
  if (d.act === "disband" && selectedDiv) { cmd({ t: "disband", id: selectedDiv }); selectedDiv = null; return updateUI(); }
  if (d.tab) { tab = Number(d.tab); return updateUI(); }
  if (d.mode) setMode(Number(d.mode));
  if (d.pact && active) return cmd({ t: "pact", target: Number(d.pact) });
  if (d.unpact && active) return cmd({ t: "unpact", target: Number(d.unpact) });
  if (d.act === "save") doSave();
  if (d.act === "load") fileInput.click();
  if (d.act === "continue") continueAutosave();
  if (d.act === "new") newWorld((Math.random() * 2 ** 31) | 0);
  if (d.act === "pause") togglePause();
  if (d.speed) setSpeed(Number(d.speed));
  if (d.act === "claim" && net) net.send(JSON.stringify({ t: "claim", country: world.owner[selected] }));
  if (d.act === "mp") mpBox.style.display = mpBox.style.display === "none" ? "block" : "none";
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
    ? `(${hc}, ${hr}) ${TERRAINS[world.terrain[hi]].name}${world.seaZone[hi] ? ` · zona marítima ${world.seaZone[hi]}` : ""}${world.river[hi] ? (world.navigable[hi] ? " · rio navegável" : " · rio") : ""}${snowAt(world, hi, eco.week) ? " · ❄ neve" : ""} · ${CLIMATES[world.climate[hi]]} · ${RESOURCES[world.resource[hi]]} · pop ${Math.round(world.pop[hi])}` +
      (world.owner[hi] ? ` · ${world.countries[world.owner[hi] - 1].name}` : "") + (hcity ? ` · mercado de ${hcity.name}` : "")
    : "—";
  const help = "Arraste = mover · roda = zoom · clique = selecionar · botão direito = mover unidade · B = construir · C = colonos fundam cidade · Espaço = pausar · +/− = velocidade · F = ver tudo · 1–4 = modo de mapa · R = mapa novo";
  hud.innerHTML =
    MAP_MODES.map((n, k) => `<button data-mode="${k}" class="${k === mode ? "on" : ""}">${k + 1} ${n}</button>`).join(" ") +
    ` <button data-act="new" title="Gera um mapa novo">R Novo</button> <button data-act="save" title="Salvar partida em arquivo (Ctrl+S)">💾</button> <button data-act="load" title="Carregar partida de arquivo">📂</button>` +
    (lastAuto ? ` <button data-act="continue" title="Continuar o último salvamento automático">↺ ${lastAuto.label}</button>` : "") + ` <button data-act="mp" title="Multiplayer">🌐</button> <span title="${help}" style="cursor:help">❓</span>` +
    (mp ? `<br>🌐 Sala <b>${mp.code}</b> · ${mp.players.map((p) => `${p.name}${p.country ? ` (${world.countries[p.country - 1].name})` : ""}`).join(", ")}` +
      (mp.paused ? ` · ⏸ pausado por ${mp.paused}${mp.votes ? ` (votos para continuar ${mp.votes}/${mp.needed})` : ""}` : "") : "") +
    `<br><b>${timeLabel()}</b> · ${ERAS[worldEra()]} <button data-act="pause">${speed ? "⏸" : "▶"}</button> ` +
    SPEEDS.slice(1).map((s, k) => `<button data-speed="${k + 1}" class="${speed === k + 1 ? "on" : ""}" title="${SPEED_NAMES[k + 1]}: ${+(s * ERA_WEEKS_PER_SECOND[worldEra()]).toFixed(3)} semana(s)/s">${s}×</button>`).join(" ") +
    `<br><small>${info}</small>` + (performance.now() < hudMsgUntil ? `<br><b>${hudMsg}</b>` : "") +
    `<br><small style="opacity:.6">${fps.toFixed(0)} FPS · semana ${tickMs.toFixed(1)} ms · ${eco.cities.length} cidades · seed ${world.seed}</small>`;
  group = group.filter((id) => eco.divisions.some((d) => d.id === id));
  if (selectedDiv && !eco.divisions.some((d) => d.id === selectedDiv)) selectedDiv = group[0] ?? null; // destruída
  const show = selected >= 0 || selectedDiv;
  panel.innerHTML = show ? divisionHtml() + headerHtml() + tabsHtml() + [hexHtml, economyHtml, researchTab, societyHtml, politicsTab, marketHtml][tab]() : "";
  const chart = document.getElementById("gdp") as HTMLCanvasElement | null;
  if (chart && active) drawChart(chart, eco.countries[active - 1].gdpHistory);
}

/** Resumo do país sempre visível no topo do painel. */
function headerHtml() {
  if (!active) return net ? "<i>Clique num país livre e use \"Assumir este país\".</i>" : "<i>Clique num país para controlá-lo.</i>";
  const c = eco.countries[active - 1], meta = world.countries[active - 1], p = c.politics;
  const weekly = c.income + c.tariffs - c.upkeep - c.interest;
  return `<h3 style="color:rgb(${meta.color})">${meta.name} <small style="color:#aaa">(você) · Era ${ERAS[c.research.era]}</small> <button data-act="identity" title="Nome, cor e bandeira">🏳</button></h3>` +
    `<div class="stats">` +
    `<span title="População">👥 ${fmt(c.pop)}</span>` +
    `<span title="PIB anual">📈 ${fmt(c.gdpWeek * 52)}</span>` +
    `<span title="Tesouro e saldo por semana">💰 ${fmt(c.treasury)} <small class="${weekly < 0 ? "up" : "down"}">${signed(weekly)}/sem</small></span>` +
    `<span title="Dívida">🏦 <span class="${c.debt > 0 ? "up" : ""}">${fmt(c.debt)}</span></span>` +
    `<span title="Legitimidade do governo">🏛 <span class="${p.legitimacy < 0.4 ? "up" : "down"}">${pct(p.legitimacy)}</span></span>` +
    `<span title="Lealdade média · radicais">❤ ${Math.round(averageLoyalty(c.pops))} · <span class="${c.radicals > 0.1 ? "bad" : ""}">${pct(c.radicals)} rad.</span></span>` +
    `<span title="Manpower livre (só para o exército)">🪖 ${fmt(c.manpower)}</span>` +
    `<span title="Grupos de colonos">⛺ ${settlersOf(eco, active)}</span>` +
    `<span title="Infâmia: reputação de agressor. ≥${INFAMY.noPacts} ninguém fecha acordo; ≥${INFAMY.pactsBreak} acordos caem e vizinhos podem se unir contra você. Cai ${INFAMY.decayWeek}/semana.">☠ <span class="${c.infamy >= INFAMY.pactsBreak ? "bad" : c.infamy >= INFAMY.noPacts ? "up" : ""}">${Math.round(c.infamy)}</span></span>` +
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
    `<tr><td>Tarifas (comércio exterior)</td><td class="down">+${fmt(c.tariffs)}</td></tr>` +
    `<tr><td>Manutenção</td><td class="up">−${fmt(c.upkeep)}</td></tr><tr><td>Juros</td><td class="up">−${fmt(c.interest)}</td></tr>` +
    `<tr><td><b>Saldo por semana</b></td><td><b>${signed(c.income + c.tariffs - c.upkeep - c.interest)}</b></td></tr></table>` +
    pactsHtml() +
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

const KIND_NAMES: Record<string, string> = { army: "⚔ Divisões", fleet: "⛵ Frotas", air: "✈ Esquadrões", settler: "⛺ Colonos" };
function groupHtml() {
  const ds = eco.divisions.filter((d) => group.includes(d.id));
  const kinds = Object.keys(KIND_NAMES).filter((k) => ds.some((d) => d.kind === k));
  return `<div class="unit"><b>${ds.length} unidades selecionadas</b> <small>(botão direito: todas vão)</small><table>` +
    kinds.map((k) => { const of = ds.filter((d) => d.kind === k); return `<tr><td><button data-group-kind="${k}">${KIND_NAMES[k]}</button></td><td>${of.length}</td><td>${fmt(of.reduce((s, d) => s + d.strength, 0))} homens</td></tr>`; }).join("") +
    `</table></div>`;
}

function divisionHtml() {
  if (group.length > 1) return groupHtml();
  const d = eco.divisions.find((x) => x.id === selectedDiv);
  if (!d) return "";
  const t = d.target === null ? "parada" : `indo para (${d.target % W}, ${(d.target / W) | 0})`;
  if (d.kind === "settler") {
    const dist = settlerDistance(world, eco, d), out = dist > RULES.settlerSupplyRange;
    return `<div class="unit"><b>⛺ Colonos</b> · ${t} · ${Math.round(d.strength)} pessoas · ${dist} hex da cidade` +
      (out ? ` <span class="bad">sem suprimentos (máx. ${RULES.settlerSupplyRange}): morrendo</span>` : "") +
      `<br><button data-act="found">C Fundar cidade aqui</button> <button data-act="disband">Voltar para casa</button>${message ? ` <span class="bad">${message}</span>` : ""}</div>`;
  }
  if (d.kind === "air") {
    const region = airRegion(eco, d.target ?? d.hex);
    const name = region >= STATES.regionBase ? eco.states.find((x) => x.id === region - STATES.regionBase)?.name ?? "—" : region >= 0 ? eco.cities[region].name : "—";
    return `<div class="unit"><b>✈ Esquadrão ${d.id}</b> · ${d.target === null ? "defendendo a base" : "missão"}: região de ${name}` +
      `<br>Pilotos ${Math.round(d.strength)}/${AIR.pilots} · org. ${pct(d.org)} · alcance ${AIR.range} hexes <small>(botão direito = região de missão)</small> <button data-act="disband">Desfazer</button></div>`;
  }
  if (d.kind === "fleet") return `<div class="unit"><b>⛵ Frota ${d.id}</b> · ${t} · zona marítima ${world.seaZone[d.hex]}` +
    `<br>Marinheiros ${Math.round(d.strength)}/${NAVY.sailors} · org. ${pct(d.org)} · <small>leva exércitos nessa zona</small> <button data-act="disband">Desfazer</button></div>`;
  return `<div class="unit"><b>⚔ Divisão ${d.id}</b> · ${t}` +
    `<br>Soldados ${Math.round(d.strength)}/${WAR.divisionSize} · org. ${pct(d.org)} · armas ${pct(d.equip)} <button data-act="disband">Desfazer</button></div>`;
}

function pactsHtml() {
  const c = eco.countries[active - 1];
  const infamy = c.infamy >= INFAMY.pactsBreak ? "<span class='bad'>Infâmia muito alta: sem acordos e vizinhos podem atacar</span><br>"
    : c.infamy >= INFAMY.noPacts ? "<span class='up'>Infâmia alta: ninguém fecha acordo novo</span><br>" : "";
  const partners = world.countries.map((_, k) => k + 1).filter((b) => hasPact(eco, active, b));
  return `<div>${infamy}Comércio exterior: exporta ${fmt(c.exports)} · importa ${fmt(c.imports)} por semana` +
    (partners.length ? `<br>Acordos: ${partners.map((b) => `${world.countries[b - 1].name} <button data-unpact="${b}">✕</button>`).join(" ")}` : "<br><small>Sem acordos: clique num hex de outro país para propor.</small>") + "</div>";
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
  const federal = !!lawOf(p, "Estados").federal;
  const states = statesOf(eco, active).map((x) => {
    const n = eco.cities.filter((k) => k.state === x.id).length;
    const taxes = federal ? `<br><small>Imposto: ` + [["", "Nacional"], ...LAWS["Impostos"].filter((l) => l.era <= era).map((l) => [l.name, l.name])]
      .map(([v, label]) => `<button data-state-tax="${x.id}|${v}" class="${(x.taxLaw ?? "") === v ? "on" : ""}">${label}</button>`).join(" ") + "</small>" : "";
    return `<tr><td>${x.name} <small>(${n} cidade${n > 1 ? "s" : ""})</small>${taxes}</td><td>${x.interest} ${x.happy ? "😊" : "<span class='bad'>😠</span>"}</td></tr>`;
  });
  const statesTable = `<b>Estados</b> <small>(${federal ? "Federação: cada estado escolhe o imposto" : `Centralizado: +${Math.round(STATES.adminPerState * 100)}% de arrecadação por estado`}; crie no hex de uma cidade)</small>` +
    (states.length ? `<table>${states.join("")}</table>` : "<br><small>Nenhum estado ainda.</small>");
  return voting +
    `<table><tr><td><b>Grupo</b> <small>(🏛 governo)</small></td><td><b title="decide leis e governo">Político</b></td><td><b title="dá legitimidade">Popular</b></td></tr>${groups.join("")}</table>` +
    `<table class="laws">${laws.join("")}</table>` + statesTable;
}

function researchHtml(r: Economy["countries"][number]["research"], perWeek: number) {
  const cur = TECHS.find((t) => t.name === r.researching);
  const done = cur ? (r.progress.get(cur.name) ?? 0) / cur.cost : 0;
  const effect = (t: (typeof TECHS)[number]) => [
    ...(t.unlocks ?? []).map((b) => `libera ${b}`),
    ...(t.bonus ?? []).map(([b, v]) => `+${Math.round(v * 100)}% ${b}`),
    ...(t.research ? [`+${Math.round(t.research * 100)}% pesquisa`] : []),
    ...(t.trade ? [`+${Math.round(t.trade * 100)}% comércio`] : []),
    ...(t.army ? [`+${Math.round(t.army * 100)}% força do exército`] : []),
    ...(t.manpower ? [`+${Math.round(t.manpower * 100)}% manpower`] : []),
    ...(t.unrest ? [t.unrest > 0 ? `−${t.unrest} lealdade (agita o povo)` : `+${-t.unrest} lealdade`] : []),
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
  const hst = city?.state !== undefined ? eco.states.find((s) => s.id === city.state) : undefined;
  if (hst) { // estado: população, PIB (valor do que os mercados oferecem) e qualidade de vida
    const cs = eco.cities.filter((k) => k.state === hst.id);
    const gdp = cs.reduce((s, k) => s + k.market.supply.reduce((a, q, g) => a + q * k.market.price[g], 0), 0);
    const pops = eco.countries[hst.country - 1].pops;
    h += `<br>🗺 <b>${hst.name}</b> · ${cs.length} cidade(s) · pop ${fmt(cs.reduce((s, k) => s + k.market.pop, 0))} · PIB ${fmt(gdp)}/sem · QV ${Math.round(lowerClassQol(pops))} <small>(do país)</small> · lealdade ${Math.round(averageLoyalty(pops))}`;
  }
  if (world.owner[i] !== active || !active) {
    h += world.owner[i] ? `<br>Pertence a ${world.countries[world.owner[i] - 1].name}` : "<br>Sem dono";
    if (net && world.owner[i] && !mp?.players.some((p) => p.country === world.owner[i])) h += ` <button data-act="claim">Assumir este país</button>`;
    if (active && world.owner[i] && !atWar(eco, active, world.owner[i])) {
      h += hasPact(eco, active, world.owner[i]) ? ` <button data-unpact="${world.owner[i]}">Cancelar acordo</button>` : ` <button data-pact="${world.owner[i]}">Propor acordo comercial</button>`;
      h += ` <button data-act="war">Declarar guerra</button>`;
    }
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
  for (let b = 1; b <= eco.countries.length; b++) if (atWar(eco, active, b)) {
    const s = airSuperiority(eco, airRegion(eco, i), active, b);
    h += `<br>✈ Céu desta região contra ${world.countries[b - 1].name}: <b class="${s >= 0.5 ? "down" : "up"}">${pct(s)}</b> <small>(batalhas aqui: ${s >= 0.5 ? "+" : "−"}${Math.round(Math.abs(2 * s - 1) * AIR.bonus * 100)}%)</small>`;
  }
  if (eco.urban[i] && !eco.occupier[i]) h += `<br><button data-act="recruit">Recrutar divisão (${WAR.recruitCost} + ${WAR.divisionSize} manpower)</button>`;
  if (eco.urban[i] && !eco.occupier[i] && coastOf(world, i) >= 0) h += eco.countries[active - 1].research.known.has(NAVY.tech)
    ? ` <button data-act="fleet">Construir frota (${NAVY.cost} + ${NAVY.sailors} manpower)</button>` : ` <small>🔒 frota: ${NAVY.tech}</small>`;
  if (eco.urban[i] && !eco.occupier[i]) h += eco.countries[active - 1].research.known.has(AIR.tech)
    ? ` <button data-act="air">Formar esquadrão (${AIR.cost} + ${AIR.pilots} manpower)</button>` : "";
  if (city && eco.urban[i]) {
    const ci = eco.market[i] - 1, st = stateOfCity(eco, ci), lock = statesLocked(eco, active);
    if (st) h += `<br>🗺 Estado: <b>${st.name}</b>${st.country === active ? ` <button data-rename="state:${st.id}" title="Renomear">✏</button>` : ""} · ${st.interest} ${st.happy ? "😊" : "<span class='bad'>😠 insatisfeito</span>"}` + (lock ? "" : ` <button data-state-leave="${ci}">Sair do estado</button>`);
    else if (!lock) h += `<br>🗺 Sem estado: <button data-state-new="${ci}">Criar estado</button>` +
      statesOf(eco, active).map((x) => ` <button data-state-join="${ci}|${x.id}">Juntar a ${x.name}</button>`).join("");
    if (lock && !st) h += `<br><small>🗺 ${lock}</small>`;
  }
  if (city?.blockaded) h += `<br><span class="bad">⚓ ${city.name} bloqueada por frota inimiga: sem comércio exterior</span>`;
  if (eco.occupier[i]) h += `<br><span class="bad">Ocupado por ${world.countries[eco.occupier[i] - 1].name}</span>`;
  if (city && eco.urban[i]) {
    const others = eco.cities.map((k, idx) => [k, idx] as const).filter(([k]) => k.country === city.country && k !== city);
    h += `<br><b>${city.name}</b>${city.country === active ? ` <button data-rename="city:${eco.cities.indexOf(city)}" title="Renomear">✏</button>` : ""} · tamanho ${city.size} · pop urbana ${fmt(city.urban.reduce((s, j) => s + world.pop[j], 0))}` +
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

const divScreen = (i: number): [number, number] => {
  let [x, y] = hexCenter(i % W, (i / W) | 0);
  x += Math.round((cam.x - x) / WORLD_W) * WORLD_W; // cópia mais perto da câmera (mundo dá a volta)
  return [(x - cam.x) * cam.zoom + unitsCanvas.width / 2, (y - cam.y) * cam.zoom + unitsCanvas.height / 2];
};
const flagOf = (k: number): Flag => world.countries[k - 1].flag ?? randomFlag(k, world.countries[k - 1].color);

// ---- nós marítimos e destaque da região clicada (estado ou zona marítima)
let nodes: SeaNodes | null = null, nodesWorld: unknown = null;
let hl: { key: string; segs: number[]; label: string; lx: number; ly: number; zone: number } | null = null;
/** Região do hex selecionado: zona marítima (no mar) ou estado (em terra, se a cidade dele tiver estado). */
function highlight() {
  const sea = selected >= 0 && world.terrain[selected] === T.OCEAN; // zona só muda com o mundo; estado muda com as cidades
  const key = sea ? `z${world.seaZone[selected]}:${world.seed}` : `${selected}:${eco.version}:${world.seed}`;
  if (hl?.key === key) return hl;
  hl = null;
  if (selected < 0) return null;
  if (world.seaZone[selected] && world.terrain[selected] === T.OCEAN) {
    const z = world.seaZone[selected], hexes = zoneHexes(world, z);
    const [lx, ly] = hexCenter(nodesOf().hex[z] % W, (nodesOf().hex[z] / W) | 0);
    hl = { key, segs: outline(world, hexes, (j) => world.seaZone[j] === z && world.terrain[j] === T.OCEAN), label: `Zona marítima ${z}`, lx, ly, zone: z };
  } else {
    const st = eco.market[selected] ? eco.cities[eco.market[selected] - 1].state : undefined;
    if (st === undefined) return null;
    const inState = (j: number) => !!eco.market[j] && eco.cities[eco.market[j] - 1].state === st;
    const hexes = [...eco.owned].filter(inState), s = eco.states.find((x) => x.id === st)!;
    let sx = 0, sy = 0, k = 0;
    for (const j of hexes) { const [x, y] = hexCenter(j % W, (j / W) | 0); if (!k || Math.abs(x - sx / k) < WORLD_W / 2) { sx += x; sy += y; k++; } }
    hl = { key, segs: outline(world, hexes, inState), label: s.name, lx: sx / k, ly: sy / k, zone: 0 };
  }
  return hl;
}
const nodesOf = () => { if (nodesWorld !== world) { nodes = seaNodes(world); nodesWorld = world; } return nodes!; };
/** Mundo → tela, na cópia do mundo mais perto da câmera. */
const worldToScreen = (x: number, y: number): [number, number] => {
  x += Math.round((cam.x - x) / WORLD_W) * WORLD_W;
  return [(x - cam.x) * cam.zoom + unitsCanvas.width / 2, (y - cam.y) * cam.zoom + unitsCanvas.height / 2];
};
function drawRegions() {
  const n = nodesOf(), h = highlight();
  if (h) { // borda brilhando: traço largo translúcido + traço fino
    for (const [width, color] of [[7, "#ffd76a55"], [2, "#ffe9a0"]] as const) {
      units.strokeStyle = color; units.lineWidth = width; units.beginPath();
      for (let s = 0; s < h.segs.length; s += 4) {
        const [x1, y1] = worldToScreen(h.segs[s], h.segs[s + 1]), dx = (h.segs[s + 2] - h.segs[s]) * cam.zoom, dy = (h.segs[s + 3] - h.segs[s + 1]) * cam.zoom;
        units.moveTo(x1, y1); units.lineTo(x1 + dx, y1 + dy);
      }
      units.stroke();
    }
  }
  if (cam.zoom >= 1.5) { // ligações pontilhadas e bolinhas dos nós
    units.strokeStyle = "#cfe3ff88"; units.lineWidth = 1.5; units.setLineDash([4, 5]); units.beginPath();
    for (const [a, b] of n.links) {
      const [ax, ay] = hexCenter(n.hex[a] % W, (n.hex[a] / W) | 0), [bx, by] = hexCenter(n.hex[b] % W, (n.hex[b] / W) | 0);
      const [x1, y1] = worldToScreen(ax, ay), bxNear = bx + Math.round((ax - bx) / WORLD_W) * WORLD_W;
      units.moveTo(x1, y1); units.lineTo(x1 + (bxNear - ax) * cam.zoom, y1 + (by - ay) * cam.zoom);
    }
    units.stroke(); units.setLineDash([]);
    const rr = Math.max(3, Math.min(cam.zoom * 0.5, 9));
    for (let z = 1; z < n.hex.length; z++) {
      if (n.hex[z] < 0) continue;
      const [x, y] = worldToScreen(...hexCenter(n.hex[z] % W, (n.hex[z] / W) | 0));
      if (x < -rr || y < -rr || x > unitsCanvas.width + rr || y > unitsCanvas.height + rr) continue;
      const gold = h?.zone === z;
      units.fillStyle = gold ? "#ffd700" : "#e8f1ff"; units.strokeStyle = gold ? "#7a5a00" : "#24456b"; units.lineWidth = 1.5;
      units.beginPath(); units.arc(x, y, gold ? rr * 1.4 : rr, 0, Math.PI * 2); units.fill(); units.stroke();
    }
  }
  if (h) { // nome
    const [x, y] = worldToScreen(h.lx, h.ly);
    units.font = "bold 14px sans-serif"; units.textAlign = "center"; units.textBaseline = "bottom";
    units.strokeStyle = "#000"; units.lineWidth = 4; units.strokeText(h.label, x, y - 10); units.fillStyle = "#ffe9a0"; units.fillText(h.label, x, y - 10);
  }
}

/** Divisões desenhadas por cima do mapa (canvas 2D): círculo na cor do país, com soldados e organização. */
function drawUnits() {
  units.clearRect(0, 0, unitsCanvas.width, unitsCanvas.height);
  { // linha do equador: meio das linhas do mapa
    const ey = (hexCenter(0, H / 2)[1] - cam.y) * cam.zoom + unitsCanvas.height / 2;
    if (ey > 0 && ey < unitsCanvas.height) {
      units.strokeStyle = "#ffd76a99"; units.lineWidth = 1.5; units.setLineDash([10, 6]);
      units.beginPath(); units.moveTo(0, ey); units.lineTo(unitsCanvas.width, ey); units.stroke(); units.setLineDash([]);
      units.fillStyle = "#ffd76acc"; units.font = "12px sans-serif"; units.textAlign = "left"; units.textBaseline = "bottom"; units.fillText("Equador", 8, ey - 2);
    }
  }
  const toScreen = divScreen;
  drawRegions();
  if (drag?.box && drag.moved >= 5) { // caixa de seleção
    const dpr = window.devicePixelRatio || 1;
    units.strokeStyle = "#fff"; units.lineWidth = 1; units.setLineDash([5, 3]);
    units.strokeRect(drag.x0 * dpr, drag.y0 * dpr, (drag.x - drag.x0) * dpr, (drag.y - drag.y0) * dpr); units.setLineDash([]);
  }
  const r = Math.max(4, Math.min(cam.zoom * 0.7, 30));
  if (r >= 8) eco.cities.forEach((city, k) => { // bandeira da cidade em cima do centro
    if (city.country !== active && !canSee(city.hex)) return;
    const [sx, sy] = toScreen(city.hex);
    if (sx < -2 * r || sy < -2 * r || sx > unitsCanvas.width + 2 * r || sy > unitsCanvas.height + 2 * r) return;
    drawFlag(units, sx + r * 0.6, sy - r * 1.6, r * 1.1, r * 0.75, cityFlag(k));
    if (r >= 12) { units.fillStyle = "#fff"; units.font = `bold ${Math.round(r * 0.55)}px sans-serif`; units.textAlign = "center"; units.textBaseline = "top"; units.strokeStyle = "#000"; units.lineWidth = 3; units.strokeText(city.name, sx, sy + r * 0.7); units.fillText(city.name, sx, sy + r * 0.7); }
  });
  const stack = new Map<number, number>();
  for (const d of eco.divisions) {
    if (d.country !== active && !canSee(d.hex)) continue;
    const [sx, sy] = toScreen(d.hex);
    if (sx < -r || sy < -r || sx > unitsCanvas.width + r || sy > unitsCanvas.height + r) continue;
    const n = stack.get(d.hex) ?? 0; stack.set(d.hex, n + 1);
    const x = sx + n * r * 0.6, y = sy - n * r * 0.6;
    const sel = d.id === selectedDiv || group.includes(d.id);
    if (d.target !== null && sel) {
      const [tx, ty] = toScreen(d.target);
      units.strokeStyle = "#fff"; units.setLineDash([4, 4]); units.beginPath(); units.moveTo(x, y); units.lineTo(tx, ty); units.stroke(); units.setLineDash([]);
    }
    units.fillStyle = `rgb(${world.countries[d.country - 1].color})`;
    units.strokeStyle = sel ? "#fff" : "#000"; units.lineWidth = sel ? 3 : 1.5;
    units.beginPath();
    if (d.kind === "settler") units.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
    else if (d.kind === "air") { units.moveTo(x - r, y); units.lineTo(x + r, y); units.moveTo(x, y - r); units.lineTo(x, y + r * 0.6); units.moveTo(x - r * 0.5, y + r * 0.6); units.lineTo(x + r * 0.5, y + r * 0.6); units.arc(x, y, r * 0.7, 0, Math.PI * 2); }
    else if (d.kind === "fleet") { units.moveTo(x, y - r); units.lineTo(x + r, y + r * 0.8); units.lineTo(x - r, y + r * 0.8); units.closePath(); }
    else units.arc(x, y, r, 0, Math.PI * 2);
    units.fill(); units.stroke();
    units.fillStyle = "#3c3"; units.fillRect(x - r, y + r + 2, 2 * r * d.org, 3); // barra de organização
    if (r >= 6) drawFlag(units, x - r * 1.1, y - r * 1.9, r * 1.2, r * 0.8, flagOf(d.country)); // bandeira do país
    if (r >= 10) { units.fillStyle = "#000"; units.font = `bold ${Math.round(r * 0.8)}px sans-serif`; units.textAlign = "center"; units.textBaseline = "middle"; units.fillText(String(Math.round(d.strength)), x, y); }
  }
}

let frames = 0, fps = 0, last = performance.now(), worst = 0, prev = last;
function frame(now: number) {
  const dt = now - prev;
  worst = Math.max(worst, dt); prev = now;
  acc = Math.min(acc + (Math.min(dt, 250) / 1000) * SPEEDS[speed] * ERA_WEEKS_PER_SECOND[worldEra()], 10);
  if (!net && autoClock.tick(Math.min(dt, 250), speed > 0 && active > 0)) doAutosave(); // no multiplayer quem guarda é o servidor
  for (; !net && acc >= 1; acc--) {
    const t = performance.now();
    advanceWeek(world, eco);
    tickMs = performance.now() - t;
  }
  if (eco.version !== drawnVersion || (mode === 2 && eco.week % 4 === 0 && frames === 0)) recolor(); // cidades cresceram / população mudou
  refreshFog();
  renderer.draw(cam.x, cam.y, cam.zoom, hover[0], hover[1], Math.cos((2 * Math.PI * (eco.week % 52)) / 52), active > 0);
  drawUnits();
  watchEvents();
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
