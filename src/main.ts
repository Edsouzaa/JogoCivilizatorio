import { holdsMouth } from "./navigation.ts";
import { weatherAt } from "./world.ts";
import { CLIMATE_COLORS } from "./world.ts";
import { generateWorld, colorize, MAP_MODES, TERRAINS, RESOURCES, RES_COLORS, BIOME_FILES, CLIMATES, T, isLand, deepOcean, generateContinents, generateRiverSystems, HEX_MODES, type World } from "./world.ts";
import {
  createEconomy, tick, build, buildCost, buildingsFor, foundCity, trainSettlers, transferSize, dateLabel, settlersOf,
  proposePact, cancelPact, hasPact, INFAMY, popCap, jobsAt, outputOf, cityName, cityReach, maxRoad, maxHarbor,
  BASE_PRICE, BUILDINGS, GOODS, RULES, techFor, canBuild, SECTOR, type Economy, type Division,
} from "./economy.ts";
import { WAR_ECONOMY, WAR_ECON, CONVERSIONS } from "./wareconomy.ts";
import { MILITARY } from "./wareconomy.ts";
import { BUDGET_IN, TAX_KINDS, classTaxOf, canTax } from "./budget.ts";
import { econ, debtCap, ERA_ECON, ECON_TECH, ECON_LAW, type EconKey } from "./eramods.ts";
import { artSVG } from "./art.ts";
import { subsistAt, SUBSIST } from "./subsistence.ts";
import { TECH_AREAS, TL, techLayout, techEdges } from "./techlayout.ts";
import { eventsOfCountry, eventsOfCharacter, type Ev } from "./chronicle.ts";
import { POLICIES, policyOf, MARKET, commerceOf, complexityImpact, complexityCost } from "./markets.ts";
import { deploy, widthOf, BATTLE, type Battle } from "./battle.ts";
import { levelName, depotHexes, PRIORITIES } from "./logistics.ts";
import { NAVAL_MISSIONS, missionOfFleet, seaWeather } from "./seawar.ts";
import { AIR_MISSIONS, airMissionOf } from "./airwar.ts";
import { navalQueueOf, yardTier, YARDS, SHIP_YARD, NAVAL } from "./naval.ts";
import { methodsOf, activeMethods, methodKey, combine, CATEGORIES, type Method } from "./methods.ts";
import { ledgerOf, FIRM } from "./firms.ts";
import { queueOf, queuedLevels, cpCost, baseCp, privateShare, etaWeeks, sectorMethod, CONSTRUCTION_METHODS, CONSTRUCT } from "./construction.ts";
import { ERAS, ERA_WEEKS_PER_SECOND, DAY_PHASES_ERA, MAX_SPEED, ERA_YEARS, START_YEAR, TECHS, available } from "./tech.ts";
import { POP_TYPES, CLASSES, POP_RULES, politicalWeight, averageLoyalty, lowerClassQol, type Pops } from "./pops.ts";
import { GROUPS, LAWS, proposeLaw, cancelLaw, lawSupport, lawOf, lawPhase, LAW_PHASES, POLITICS_RULES, type Politics, type Law } from "./politics.ts";
import { pixelToHex, wrapCol, hexCenter, hexDistance, forNeighbors, SQRT3 } from "./hex.ts";
import { countryMix, cultureName, languageName, RELIGIONS, acceptedShare } from "./culture.ts";
import { SERIES } from "./history.ts";
import { relation, prestige, DIPLO } from "./diplomacy.ts";
import { subjectOf, SUBJECT_KINDS, SUBJ, type SubjectKind } from "./subjects.ts";
import { personality, desires, claimsOf, hasClaimOn } from "./claims.ts";
import { proposalsTo, PROPOSAL_WEEKS } from "./proposals.ts";
import { EVENT_LIST, CHOICES, type Effects } from "./choices.ts";
import { INCENTIVES, hasIncentive, adminCap, countrySocialComplexity, socialComplexity, incentiveCost, canIncentive, progressOf, citiesOf, type IncentiveKind } from "./admin.ts";
import { icon, hydrateIcons } from "./icons.ts";
import { foundingCost, distanceLabel, hexPrice, EXPAND } from "./expansion.ts";
import { rulerOf, ageOf, lifeText, CHAR, skill, TRAIT_FX, styleOf, STYLES, PERSONALITIES, TRAIT_CAT, COMMAND_NAME, WEEKDAYS, generalCandidates, titlesOf, epithet, diplomatOf, diplomatBonus, diplomatCandidates, DIPLOMAT } from "./characters.ts";
import { unitOf, statsOf, unitsFor, craftsFor, craftOf, SHIPS, PLANES } from "./units.ts";
import { portraitSVG } from "./portrait.ts";
import { seaNodes, outline, zoneHexes, type SeaNodes } from "./regions.ts";
import { drawFlag, randomFlag, rgbHex, hexRgb, FLAG_LAYOUTS, FLAG_SYMBOLS, type Flag } from "./flags.ts";
import { recruit, orderMove, declareWar, makePeace, warScore, atWar, disband, stepWar, settlerDistance, buildFleet, buildAir, airSuperiority, airRegion, coastOf, siegeWeeks, warSupport, depotDistance, supplyRange, WAR, NAVY, AIR } from "./war.ts";
import { createRenderer } from "./render.ts";
import { updateFog, buildInfo, buildBorders } from "./fog.ts";
import { applyCommand, ACCEPT_COST, type Cmd } from "./commands.ts";
import { advanceWeek, checksum } from "./sim.ts";
import { saveGame, loadGame } from "./save.ts";
import { listAutosaves, writeAutosave, readAutosave, autosaveClock, AUTOSAVE, type AutosaveMeta } from "./autosave.ts";
import { createState, addCityToState, removeCityFromState, setStateTax, statesOf, stateOfCity, statesLocked, STATES } from "./states.ts";

let hudMsg = "", hudMsgUntil = 0; // aviso rápido no topo (salvou, erro ao carregar...)
// Notificações por categoria: contador na barra inferior; clicar abre a lista. A última aparece um instante no meio.
const NOTE_CATS = ["Diplomacia", "Militar", "Economia", "Política", "Sociedade", "Geral"] as const;
const NOTE_ICON: Record<string, string> = { Diplomacia: "diplomacy", Militar: "military", Economia: "economy", Política: "politics", Sociedade: "society", Geral: "bell" };
const notes: { cat: string; text: string; date: string }[] = [];
const unread: Record<string, number> = {};
let noteFilter: string | null = null;
const NOTE_BY_ICON: Record<string, string> = {
  military: "Militar", peace: "Militar", fort: "Militar", soldier: "Militar", diplomacy: "Diplomacia", globe: "Diplomacia",
  pick: "Economia", bread: "Economia", treasury: "Economia", news: "Política", admin: "Política", politics: "Política",
  skull: "Sociedade", mask: "Sociedade", tech: "Sociedade",
};
/** Categoria pelo ícone do começo da mensagem; o ícone sai do texto (notificação é texto puro). */
const noteSplit = (m: string): [string, string] => {
  const r = /^<i class=i-([a-z]+)><\/i>\s*/.exec(m);
  const clean = (t: string) => t.replace(/<i class=i-[a-z]+><\/i>\s*/g, ""); // ícones no meio do texto também saem
  return r ? [NOTE_BY_ICON[r[1]] ?? "Geral", clean(m.slice(r[0].length))] : ["Geral", clean(m)];
};
const notify = (raw: string) => {
  const [cat, m] = noteSplit(raw);
  hudMsg = m; hudMsgUntil = performance.now() + 5000;
  let date = "";
  try { date = dateLabel(eco.week); } catch { /* antes do mundo existir */ }
  notes.unshift({ cat, text: m, date });
  if (notes.length > 60) notes.pop();
  unread[cat] = (unread[cat] ?? 0) + 1;
  const toast = document.getElementById("toast")!;
  toast.textContent = m; toast.style.display = "block";
};
/** Lista aberta (ou fechada) das notificações de uma categoria. */
function showNotes(cat: string | null) {
  const box = document.getElementById("notelist")!;
  noteFilter = noteFilter === cat ? null : cat;
  if (noteFilter === null) { box.style.display = "none"; return; }
  unread[noteFilter] = 0;
  const list = notes.filter((n) => n.cat === noteFilter);
  box.innerHTML = `<h3>${noteFilter}</h3>` + (list.length ? "" : "<small>Nada por aqui.</small>");
  for (const n of list) { // texto como texto (nomes vêm de jogadores)
    const d = document.createElement("div"); d.className = "n";
    const s = document.createElement("small"); s.textContent = n.date + " — ";
    d.append(s, document.createTextNode(n.text)); box.appendChild(d);
  }
  box.style.display = "block";
}

/** Depois de cada semana simulada: avisos que só existem naquela semana. */
function afterWeek() {
  for (const k of eco.freed ?? []) if (k === active) notify(`<i class=i-diplomacy></i> Você se libertou do seu soberano`);
  for (const o of eco.obituaries ?? []) if (o.country === active) notify(`<i class=i-politics></i> Morreu ${o.name}, aos ${o.age} anos. Um novo governante assumiu.`);
  for (const n of eco.news ?? []) if (eco.cities[n.city]?.country === active) notify(n.kind === "fome" ? `<i class=i-bread></i> Fome em ${eco.cities[n.city].name}: falta comida no mercado, o povo está morrendo` : `<i class=i-skull></i> Peste em ${eco.cities[n.city].name}`);
  for (const i of eco.exhausted) if (world.owner[i] === active) notify(`<i class=i-pick></i> Jazida esgotada em (${i % W}, ${(i / W) | 0}): a mina fechou e os trabalhadores ficaram sem emprego`);
}
// eventos do país do jogador que viram notificação (comparando com o quadro anterior)
let seenTechs = -1, seenWars = "", seenActive = -1, seenLawEvent: string | undefined, seenProposal = 0, seenVote = 0;
function watchEvents() {
  if (!active) return;
  const c = eco.countries[active - 1];
  const wars = [...eco.wars].filter((k) => k.split("-").includes(String(active))).sort().join(",");
  if (seenActive === active) {
    if (c.research.known.size > seenTechs) notify(`<i class=i-tech></i> Tecnologia descoberta: ${[...c.research.known].at(-1)}`);
    for (const k of wars.split(",")) if (k && !seenWars.split(",").includes(k)) notify(`<i class=i-military></i> Guerra com ${world.countries[+k.split("-").find((x) => x !== String(active))! - 1].name}`);
    for (const k of seenWars.split(",")) if (k && !wars.split(",").includes(k)) notify(`<i class=i-peace></i> Paz com ${world.countries[+k.split("-").find((x) => x !== String(active))! - 1].name}`);
  }
  if (seenActive === active && c.politics.lawEvent && c.politics.lawEvent !== seenLawEvent) notify(`<i class=i-news></i> ${c.politics.lawEvent}`);
  for (const p of proposalsTo(eco, active)) if (p.id > seenProposal) { seenProposal = p.id; notify(`<i class=i-diplomacy></i> ${world.countries[p.from - 1].name} mandou uma proposta (aba Diplomacia)`); }
  for (const v of eco.votes ?? []) if (v.id > seenVote) { seenVote = v.id; if (!v.yes.includes(active)) notify(`<i class=i-diplomacy></i> Votação: renomear ${v.river ? "um rio" : "um continente"} para ${v.name} (aba Diplomacia)`); }
  seenActive = active; seenTechs = c.research.known.size; seenWars = wars; seenLawEvent = c.politics.lawEvent;
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
    notify("<i class=i-warn></i> Salvamento automático indisponível neste navegador (use <i class=i-save></i>)");
  } finally { autosaving = false; }
}
async function continueAutosave() {
  const blob = lastAuto && (await readAutosave(lastAuto.slot));
  if (blob) doLoad(blob); else notify("<i class=i-warn></i> Nenhum salvamento automático encontrado");
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
    notify(`<i class=i-warn></i> ${(err as Error).message}`);
  }
}
const fileInput = Object.assign(document.createElement("input"), { type: "file", accept: ".save" });
document.addEventListener("change", (ev) => { // construção em massa: escolhas mudam o cálculo
  const t = ev.target as HTMLInputElement;
  queueMicrotask(() => t.blur()); // escolheu: o painel volta a se atualizar
  if (t.id === "mb-b") mbB = +t.value; else if (t.id === "mb-city") mbCity = +t.value;
  else if (t.dataset?.mission) { cmd({ t: "mission", id: +t.dataset.mission, m: t.value }); return; }
  else if (t.dataset?.hexcity) { cmd({ t: "assignHex", hex: +t.dataset.hexcity, city: +t.value }); return; }
  else if (t.dataset?.tpol) { cmd({ t: "tradePolicy", good: t.dataset.tpol, policy: t.value }); return; }
  else if (t.id === "tariff") { cmd({ t: "tariff", rate: Math.max(0, +t.value) / 100 }); return; }
  else if (t.dataset?.prio) { cmd({ t: "priority", id: +t.dataset.prio, p: +t.value }); return; }
  else if (t.dataset?.ctaxmode) { const k = +t.dataset.ctaxmode; cmd({ t: "classTax", cls: k, mode: t.value as "pct" | "fixed", v: t.value === "pct" ? eco.countries[active - 1].tax : 1 }); return; }
  else if (t.dataset?.ctax) { const k = +t.dataset.ctax, mode = classTaxOf(eco.countries[active - 1], k).mode; cmd({ t: "classTax", cls: k, mode, v: mode === "pct" ? Math.max(0, +t.value) / 100 : Math.max(0, +t.value) }); return; }
  else if (t.dataset?.stax) { cmd({ t: "tax", id: t.dataset.stax, rate: Math.max(0, +t.value) / 100 }); return; }
  else if (t.dataset?.meth) { const [hex, b, cat] = t.dataset.meth.split("|").map(Number); cmd({ t: "method", hex, b, cat, k: +t.value }); return; }
  else if (t.id === "mb-levels") mbLevels = Math.max(1, Math.min(50, Math.round(+t.value) || 1)); else if (t.id === "mb-priv") mbPriv = t.checked;
  else if (t.id === "bp-cat") { bpCat = +t.value; bpK = -1; } else if (t.id === "bp-k") bpK = +t.value; else return;
  if (mode === 14) recolor();
  updateUI();
});
fileInput.addEventListener("change", () => { if (fileInput.files?.[0]) doLoad(fileInput.files[0]); fileInput.value = ""; });
import { snowAt } from "./world.ts";

// 1600 × 640 = 1.024.000 hexágonos ≈ Terra com 500 km² por hex. Mude por ?w=&h= na URL para testar.
const params = new URLSearchParams(location.search);
const W = Number(params.get("w")) || 1600, H = Number(params.get("h")) || 640;
const WORLD_W = SQRT3 * W; // largura do mundo em unidades do mapa (uma volta)

const canvas = document.getElementById("map") as HTMLCanvasElement;
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
let selectedChar: number | null = null; // personagem aberto no painel da direita

// Multiplicador sobre o ritmo da era (ERA_WEEKS_PER_SECOND). "Média" = 1×.
const SPEEDS = [0, 0.5, 1, 3, 10, MAX_SPEED];
// O ritmo segue a era do país mais avançado.
// shortcut: em multiplayer isso deve ser decidido pela sala (era mais comum ou votação), quando houver salas.
const worldEra = () => Math.max(...eco.countries.map((c) => c.research.era));
const PHASES = ["noite", "manhã", "tarde"];
function timeLabel() {
  const q = Math.min(20, Math.floor(acc * 21)); // 7 dias × 3 fases dentro da semana atual (a simulação continua semanal)
  return `${dateLabel(eco.week)} · ${WEEKDAYS[Math.floor(q / 3)].split("-")[0]}${worldEra() < DAY_PHASES_ERA ? "" : ` · ${PHASES[q % 3]}`}`;
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
/** Cor estável para um id (cultura, língua...): espalha o matiz pelo círculo de cores, com tons sóbrios. */
const idColor = (id: number): [number, number, number] => {
  const h = (id * 137.508) % 360, s = 0.45, l = 0.5, f = (n: number) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round) as [number, number, number];
};
const RELIGION_COLORS: [number, number, number][] = [[176, 138, 92], [110, 140, 190], [120, 160, 100], [200, 110, 80], [90, 160, 170]];
/** Camadas que dependem da economia (modo ≥ HEX_MODES): cor por hex a partir da cidade (mercado) do hex. */
function hexLayer(): ((i: number) => readonly number[] | null) | undefined {
  if (mode < HEX_MODES) return undefined;
  const top = (m: Record<number, number> | undefined) => (m ? +Object.entries(m).sort((a, b) => b[1] - a[1])[0][0] : -1);
  const perCity = eco.cities.map((k): readonly number[] | null => {
    const id = k.identity, c = eco.countries[k.country - 1];
    if (mode === 8) return id ? idColor(top(id.culture)) : null;
    if (mode === 9) return id ? idColor(100 + top(id.language)) : null;
    if (mode === 10) return id ? RELIGION_COLORS[top(id.religion)] ?? null : null;
    if (mode === 11) { const v = Math.min(1, (c.literacy ?? 0) / 0.6); return [40 + 60 * v, 60 + 100 * v, 90 + 150 * v]; } // azul: mais letrados
    const v = Math.min(1, ((k.road ?? 0) + (k.harbor ?? 0)) / 6); return [70 + 150 * v, 70 + 110 * v, 60 + 30 * v]; // dourado: mais estrada e porto
  });
  if (mode === 14) { // construção em massa: verde elegível, amarelo limite/já existe, vermelho inválido, cinza fora
    const ok = new Set(active ? massTargets() : []);
    return (i) => {
      if (!active || world.owner[i] !== active || !isLand(world.terrain[i])) return null;
      if (mbCity >= 0 && eco.market[i] - 1 !== mbCity) return [95, 95, 95];
      if (ok.has(i)) return [70, 170, 80];
      if (eco.levels[mbB][i] || queuedLevels(eco, i, mbB)) return [200, 70, 60]; // limite atingido
      return [110, 110, 110]; // não serve aqui
    };
  }
  if (mode === 15 && active) { // suprimento: distância (por caminho no país e vizinhança) ao depósito mais perto, pelo alcance
    const range = supplyRange(eco, active), dist = new Int16Array(world.W * world.H).fill(-1);
    let queue = [...eco.cities.filter((k) => k.country === active || eco.occupier[k.hex] === active).map((k) => k.hex), ...depotHexes(world, eco, active), ...(eco.outposts ?? []).filter((o) => o.country === active).map((o) => o.hex)];
    for (const q of queue) dist[q] = 0;
    for (let step = 1; queue.length && step <= range + 3; step++) {
      const next: number[] = [];
      for (const i of queue) forNeighbors(i % world.W, (i / world.W) | 0, world.W, world.H, (j) => { if (dist[j] < 0 && isLand(world.terrain[j])) { dist[j] = step; next.push(j); } });
      queue = next;
    }
    return (i) => { const d = dist[i]; if (d < 0) return null; const f = d / range; return f <= 0.34 ? [70, 170, 80] : f <= 0.67 ? [210, 190, 60] : f <= 1 ? [220, 130, 50] : [180, 60, 50]; };
  }
  if (mode === 16) { // subsistência: no país, pressão sobre a terra (verde folgado → vermelho apertado); fora, o potencial
    const need = 1 / 200, ref = eco.countries[(active || 1) - 1];
    return (i) => {
      if (!isLand(world.terrain[i])) return null;
      const own = world.owner[i], s = subsistAt(world, eco, i, own ? eco.countries[own - 1] : ref, need, own ? jobsAt(eco, i) : 0, BUILDINGS);
      if (!own) { const v = Math.min(1, s.capacity / SUBSIST.capacity); return [60 + 40 * v, 70 + 110 * v, 60 + 30 * v]; }
      const p = s.pressure;
      return p < 0.5 ? [70, 170, 80] : p < 0.8 ? [170, 190, 70] : p < 1 ? [220, 170, 50] : p < 1.2 ? [220, 110, 50] : [180, 50, 45];
    };
  }
  if (mode === 17) return (i) => { // estados: cor de cada estado; cidade sem estado em cinza; fora do país, apagado
    const k = eco.market[i]; if (!world.owner[i]) return null;
    const city = k ? eco.cities[k - 1] : undefined;
    if (!city) return world.countries[world.owner[i] - 1].color.map((v) => (v + 2 * 80) / 3);
    return city.state !== undefined ? stateColor(city.state) : [120, 120, 120];
  };
  if (mode === 18) return (i) => (world.owner[i] && active ? diploClass(world.owner[i])[0] : null); // diplomacia
  if (mode === 19) return (i) => (world.owner[i] ? world.countries[world.owner[i] - 1].color.map((v) => (v + 2 * 75) / 3) : null); // militar: países apagados, tropas em destaque
  if (mode === 13) return (i) => { // expansão: território, área de influência (claro) e cidades isoladas (vermelho)
    if (world.owner[i]) { const k = eco.market[i]; return k && eco.cities[k - 1].isolated ? [200, 70, 60] : world.countries[world.owner[i] - 1].color; }
    const f = eco.influence?.[i]; return f ? world.countries[f - 1].color.map((v) => (v + 70 * 2) / 3) : null;
  };
  return (i) => (world.owner[i] && eco.market[i] ? perCity[eco.market[i] - 1] : null);
}
function recolor() {
  const t = performance.now();
  renderer.upload(colorize(world, mode, eco.urban, eco.occupier, rgba, eco.control, mode === 6 ? eco.countries.map((c) => c.research.known.size / TECHS.length) : mode === 7 ? eco.countries.map((c) => averageLoyalty(c.pops) / 100) : undefined, hexLayer(), eco.influence));
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
  } else if (drag?.box && drag.moved < 5 && special) { // modos especiais: um clique, uma ação (cada modo escolhe o que seleciona)
    const [c, r] = hexAt(e.clientX, e.clientY), i = inMap(c, r) ? r * W + c : -1;
    message = "";
    if (i >= 0) {
      if (special === "build") buildClick(i, e.shiftKey, e.ctrlKey);
      else if (special === "state") selected = i;
      else if (special === "diplo") pickedCountry = world.owner[i];
      else { // militar: só tropas (as do jogador primeiro)
        const here = eco.divisions.filter((d) => d.hex === i && (d.country === active || canSee(i))).sort((a, b) => +(b.country === active) - +(a.country === active));
        const k = here.findIndex((d) => d.id === selectedDiv);
        selectedDiv = here.length ? here[(k + 1) % here.length].id : selectedDiv;
        group = selectedDiv ? [selectedDiv] : [];
      }
    }
    updateUI();
  } else if (drag?.box && drag.moved < 5) { // clique sem arrastar = selecionar hex
    const [c, r] = hexAt(e.clientX, e.clientY);
    selected = inMap(c, r) ? r * W + c : -1; selectedChar = null;
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
idBox.style.cssText = "display:none;position:fixed;top:90px;left:calc(var(--menu) + 16px);background:var(--panel);border:1px solid var(--gold);padding:12px;width:300px;line-height:1.9;z-index:7";
idBox.innerHTML = `<b id="id-title"><i class=i-flag></i> Identidade do país</b><br>
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
  document.getElementById("id-title")!.innerHTML = title; hydrateIcons(idBox); // títulos são nossos (com ícone), não do jogador
  (document.getElementById("id-colorrow") as HTMLElement).style.display = color ? "" : "none";
  idIn("name").value = name;
  if (color) idIn("color").value = rgbHex(color);
  idIn("layout").value = String(f.layout); idIn("symbol").value = f.symbol;
  f.colors.forEach((c, k) => (idIn("c" + k).value = c));
  idOk = ok; idBox.style.display = "block"; idPreview(); idIn("name").focus();
}
function openIdentity() {
  const meta = world.countries[active - 1];
  openNamer("<i class=i-flag></i> Identidade do país", meta.name, flagOf(active), () => cmd({ t: "identity", name: idIn("name").value, color: hexRgb(idIn("color").value), flag: idFlag() }), meta.color);
}
const cityFlag = (k: number) => eco.cities[k].flag ?? flagOf(eco.cities[k].country);
const stateFlag = (id: number) => { const s = eco.states.find((x) => x.id === id)!; return s.flag ?? flagOf(s.country); };
/** Fundar cidade: pede nome e bandeira antes (a bandeira começa sendo a do país). */
function askFound(unit: number) {
  openNamer("<i class=i-city></i> Nova cidade", cityName(world, eco, active), flagOf(active), () => cmd({ t: "found", unit, name: idIn("name").value, flag: idFlag() }));
}
idBox.addEventListener("input", idPreview);
idBox.addEventListener("keydown", (ev) => { if (ev.key === "Enter") idIn("ok").click(); if (ev.key === "Escape") idIn("cancel").click(); });
idIn("ok").onclick = () => { idOk(); idBox.style.display = "none"; };
idIn("cancel").onclick = () => (idBox.style.display = "none");

// ---------------- evento com escolha: janela no meio da tela, pausa o jogo, 2 minutos ----------------
const evBox = document.createElement("div");
evBox.className = "doc"; // documento histórico (estilo no index.html)
document.body.appendChild(evBox);
// arrastar a caixa pelo cabeçalho (o resto dela continua clicável)
evBox.addEventListener("pointerdown", (ev) => {
  if (!(ev.target as HTMLElement).closest(".doc-head, .doc-art")) return;
  const r = evBox.getBoundingClientRect(), dx = ev.clientX - r.left, dy = ev.clientY - r.top;
  evBox.style.transform = "none"; evBox.style.left = `${r.left}px`; evBox.style.top = `${r.top}px`;
  const move = (m: PointerEvent) => {
    evBox.style.left = `${Math.max(0, Math.min(innerWidth - r.width, m.clientX - dx))}px`;
    evBox.style.top = `${Math.max(0, Math.min(innerHeight - 40, m.clientY - dy))}px`;
  };
  const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
  ev.stopPropagation();
});
let evShown = "", evSince = 0;
function watchChoice() {
  const ev = active ? eco.choices?.[active] : undefined;
  const key = ev ? `${active}:${ev.week}` : "";
  if (!ev) { evBox.style.display = "none"; evShown = ""; return; }
  if (key !== evShown) { // evento novo: pausa (no multiplayer quem pausa é o servidor) e mostra
    evShown = key; evSince = performance.now();
    if (!net && speed) togglePause();
    const def = EVENT_LIST[ev.id];
    const meta = world.countries[active - 1];
    evBox.innerHTML = `<div class="doc-head"><img src="${flagURL(flagOf(active))}" alt=""><div><div class="doc-date">${dateLabel(ev.week)} · ${meta.name}</div><h2>${def.title}</h2></div></div>` +
      `<div class="doc-art">${icon(def.art, 56)}</div><p class="doc-text">${def.text}</p><div class="doc-k">Decisão</div>` +
      def.options.map((o, k) => `<button class="doc-opt" data-choose="${k}">${o.label}<br><small>${fxText(o.fx)}</small></button>`).join("") +
      `<small id="ev-timer" style="opacity:.6"></small>`;
    hydrateIcons(evBox); evBox.style.display = "block";
    notify(`<i class=i-admin></i> ${def.title}`);
  }
  const left = Math.max(0, CHOICES.timeoutMs - (performance.now() - evSince));
  const t = document.getElementById("ev-timer");
  if (t) t.textContent = `Escolha em ${Math.ceil(left / 1000)} s (depois vale a primeira opção)`;
  if (!net && left <= 0) cmd({ t: "choose", option: 0 }); // no multiplayer o servidor faz isso
}
const fxText = (fx: Effects) => [
  fx.treasury ? `${fx.treasury > 0 ? "+" : ""}${Math.round(fx.treasury * 100)}% do tesouro` : "",
  fx.legitimacy ? `legitimidade ${fx.legitimacy > 0 ? "+" : ""}${Math.round(fx.legitimacy * 100)}` : "",
  fx.research ? "pesquisa adiantada" : "", fx.admin ? `${fx.admin > 0 ? "+" : ""}${fx.admin} pontos adm.` : "",
  fx.pop ? `${Math.round(fx.pop * 100)}% da população` : "", fx.infamy ? `+${fx.infamy} infâmia` : "",
].filter(Boolean).join(" · ") || "nada muda";

// ---------------- multiplayer (lockstep; ver server/server.ts) ----------------
type RoomStatus = { code: string; speed: number; paused: string | null; votes: number; needed: number; players: { id: number; name: string; country: number }[] };
let net: WebSocket | null = null, mp: RoomStatus | null = null, myId = 0, synced = false;
const pendingSteps: { t?: string; week: number; cmds: [number, Cmd][] }[] = [];
const mpBox = document.createElement("div");
mpBox.id = "mpbox";
mpBox.style.cssText = "display:none;position:fixed;top:90px;left:calc(var(--menu) + 16px);background:var(--panel);border:1px solid var(--gold);padding:12px;width:300px;line-height:1.8;z-index:7";
mpBox.innerHTML = `<b><i class=i-globe></i> Multiplayer</b> <small>(servidor: npm run server)</small><br>
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
chatBox.style.cssText = "display:none;position:fixed;bottom:calc(var(--bottom) + 8px);left:calc(var(--menu) + 8px);width:320px;background:var(--panel);border:1px solid var(--line);padding:6px;font-size:12px;z-index:4";
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

function applyStep(m: { t?: string; week: number; cmds: [number, Cmd][] }) {
  for (const [country, c] of m.cmds) applyCommand(world, eco, country, c);
  if (m.t === "cmds") return updateUI(); // resposta a evento com a sala pausada: não avança a semana
  advanceWeek(world, eco); afterWeek();
  if (eco.week !== m.week) { synced = false; net?.send(JSON.stringify({ t: "resync" })); } // fora de passo: pede a foto
}

function connect(hello: object) {
  net?.close();
  let ws: WebSocket;
  try { ws = new WebSocket($("mp-url").value); } catch { return notify("<i class=i-warn></i> Endereço de servidor inválido"); }
  ws.binaryType = "arraybuffer";
  net = ws; synced = false; pendingSteps.length = 0;
  ws.onopen = () => ws.send(JSON.stringify(hello));
  ws.onmessage = async (ev) => {
    if (ev.data instanceof ArrayBuffer) { // foto da partida
      try {
        const d = await loadGame(new Blob([ev.data]));
        world = d.world; eco = d.eco; synced = true;
        explored.clear(); selected = -1; selectedDiv = null;
        for (const st of pendingSteps.splice(0)) if (st.week > eco.week || (st.t === "cmds" && st.week === eco.week)) applyStep(st); // "cmds" repetido é inofensivo: o evento já resolvido só dá erro
        recolor();
        updateUI();
      } catch (err) { notify(`<i class=i-warn></i> ${(err as Error).message}`); }
      return;
    }
    const m = JSON.parse(ev.data as string);
    if (m.t === "welcome") {
      if (m.w !== W || m.h !== H) { // a sala tem outro tamanho de mapa: recarrega a página no tamanho certo e entra de novo
        location.search = new URLSearchParams({ w: m.w, h: m.h, server: $("mp-url").value, room: m.code, name: $("mp-name").value }).toString();
        return;
      }
      myId = m.id; mpBox.style.display = "none"; chatBox.style.display = "block"; notify(`Na sala ${m.code}`);
    } else if (m.t === "step" || m.t === "cmds") { if (synced) applyStep(m); else pendingSteps.push(m); }
    else if (m.t === "check" && synced && checksum(eco) !== m.sum) { synced = false; notify("Fora de sincronia: recebendo a partida de novo..."); ws.send(JSON.stringify({ t: "resync" })); }
    else if (m.t === "status") {
      mp = m; speed = m.paused ? 0 : m.speed; lastSpeed = m.speed;
      active = m.players.find((p: { id: number }) => p.id === myId)?.country ?? 0;
    } else if (m.t === "err") notify(`<i class=i-warn></i> ${m.msg}`);
    else if (m.t === "chat") addChat(m);
    updateUI();
  };
  ws.onclose = () => { if (net === ws) { net = null; mp = null; chatBox.style.display = "none"; notify("Desconectado do servidor (a partida continua só aqui)"); } };
}
if (params.get("server") && params.get("room")) setTimeout(() => connect({ t: "join", code: params.get("room"), name: params.get("name") ?? "" }), 0);

function act(result: string | null) { message = result ?? ""; if (eco.version !== drawnVersion) recolor(); updateUI(); }
function doBuild(b = buildingsFor(world.resource[selected], !!eco.urban[selected], world.resource2[selected])[0]) { // B sem escolha = 1ª construção do hex
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
  // o clique pode cair num filho (ícone, texto do cartão): sobe até o primeiro elemento com data-*
  let el = e.target as HTMLElement | null;
  while (el && !(el.dataset && Object.keys(el.dataset).length)) el = el.parentElement;
  if (!el || el.dataset.tnode && !el.dataset.tech) return;
  const d = el.dataset;
  if (d.build) return doBuild(Number(d.build));
  if (d.transfer) return cmd({ t: "transfer", from: eco.market[selected] - 1, to: Number(d.transfer) });
  if (d.act === "found" && selectedDiv) return askFound(selectedDiv);
  if (d.act === "outpost" && selectedDiv) return cmd({ t: "outpost", unit: selectedDiv });
  if (d.closeriver) return cmd({ t: "closeRiver", id: +d.closeriver });
  if (d.river) {
    const name = prompt("Nome do rio", world.rivers![+d.river - 1].name);
    if (name) cmd({ t: "river", id: +d.river, name });
    return;
  }
  if (d.continent) {
    const name = prompt("Nome do continente", world.continents![+d.continent - 1].name);
    if (name) cmd({ t: "continent", id: +d.continent, name });
    return;
  }
  if (d.book) return openBook(Number(d.book));
  if (d.char) { selectedChar = Number(d.char); selected = -1; selectedDiv = null; return updateUI(); }
  if (d.saveChar) return cmd({ t: "saveCharacter", id: Number(d.saveChar) });
  if (d.vote) { const [id, ok] = d.vote.split("|"); return cmd({ t: "vote", id: +id, yes: ok === "1" }); }
  if (d.respond) { const [id, ok] = d.respond.split("|"); return cmd({ t: "respond", id: +id, accept: ok === "1" }); }
  if (d.subject) { const [k, kind] = d.subject.split("|"); return cmd({ t: "subject", target: +k, kind: kind as SubjectKind }); }
  if (d.free) return cmd({ t: "freeSubject", target: Number(d.free) });
  if (d.act === "independence") return cmd({ t: "independence" });
  if (d.improve) return cmd({ t: "improve", target: Number(d.improve) });
  if (d.chart) { chartKey = d.chart; return updateUI(); }
  if (d.rank) { rankKey = d.rank; return updateUI(); }
  if (d.choose) return cmd({ t: "choose", option: Number(d.choose) });
  if (d.accept) { const [id, mode] = d.accept.split("|"); return cmd({ t: "acceptCulture", culture: +id, off: mode === "off" }); }
  if (d.incentive) {
    const [kind, where, mode] = d.incentive.split("|"), st = where.startsWith("s:");
    return cmd({ t: "incentive", kind: kind as IncentiveKind, ...(st ? { state: +where.slice(2) } : { city: +where.replace("c:", "") }), off: mode === "off" });
  }
  if (d.inccat !== undefined) { incCat = d.inccat; return updateUI(); }
  if (d.harbor) return cmd({ t: "harbor", city: Number(d.harbor) });
  if (d.road) return cmd({ t: "road", city: Number(d.road) });
  if (d.groupKind) { group = eco.divisions.filter((x) => group.includes(x.id) && x.kind === d.groupKind).map((x) => x.id); selectedDiv = group[0] ?? null; return updateUI(); }
  if (d.act === "identity" && active) return openIdentity();
  if (d.rename) { // "city:3" ou "state:2"
    const [kind, id] = d.rename.split(":") as ["city" | "state", string];
    const cur = kind === "city" ? eco.cities[+id].name : eco.states.find((s) => s.id === +id)!.name;
    return openNamer(kind === "city" ? "<i class=i-city></i> Cidade" : "<i class=i-map></i> Estado", cur, kind === "city" ? cityFlag(+id) : stateFlag(+id), () => cmd({ t: "rename", kind, id: +id, name: idIn("name").value, flag: idFlag() }));
  }
  if (d.act === "settlers") return cmd({ t: "settlers" });
  if (d.act === "massmap") { setMode(14); return updateUI(); }
  if (d.btab !== undefined) { bTab = +d.btab; return updateUI(); }
  if (d.mtab !== undefined) { mTab = +d.mtab; return updateUI(); }
  if (d.bfilter !== undefined) { bFilter = +d.bfilter; bSel.clear(); return updateUI(); }
  if (d.bsort) { bSort = bSort === d.bsort ? `-${d.bsort}` : d.bsort; return updateUI(); }
  if (d.bsel) { if (bSel.has(d.bsel)) bSel.delete(d.bsel); else bSel.add(d.bsel); return updateUI(); }
  if (d.act === "bselall") { for (const r of buildingRows()) bSel.add(r.key); return updateUI(); }
  if (d.act === "bselnone") { bSel.clear(); return updateUI(); }
  if (d.act === "bapply") { for (const key of bSel) { const [hex, b] = key.split(":").map(Number); cmd({ t: "method", hex, b, cat: bpCat, k: bpK }); } return; }
  if (d.act === "massbuild") return cmd({ t: "buildMany", hexes: massTargets(), b: mbB, levels: mbLevels, priv: mbPriv });
  if (d.cancelbuild) return cmd({ t: "cancelBuild", id: +d.cancelbuild });
  if (d.cancelship) return cmd({ t: "cancelShip", id: +d.cancelship });
  if (d.wareco) return cmd({ t: "warEconomy", level: +d.wareco });
  if (d.battle !== undefined) { openBattle = +d.battle; return updateUI(); }
  if (d.conversion) return cmd({ t: "conversion", on: !eco.countries[active - 1].conversion });
  if (d.sheet) { openSheet = openSheet === d.sheet ? "" : d.sheet; return updateUI(); }
  if (d.methall) { const [b, cat, k] = d.methall.split("|").map(Number); return cmd({ t: "method", hex: -1, b, cat, k, all: true }); }
  if (d.privatize) { const [hex, b] = d.privatize.split("|").map(Number); return cmd({ t: "privatize", hex, b, n: 1 }); }
  if (d.nationalize) { const [hex, b] = d.nationalize.split("|").map(Number); return cmd({ t: "nationalize", hex, b, n: 1 }); }
  if (d.pausebuild) return cmd({ t: "pauseBuild", id: +d.pausebuild });
  if (d.tech && active) return cmd({ t: "tech", name: d.tech });
  if (d.law && active) {
    const [cat, name] = d.law.split("|"), c = eco.countries[active - 1];
    void c;
    return cmd({ t: "law", cat, name });
  }
  if (d.act === "cancel-law" && active) return cmd({ t: "cancelLaw" });
  if (d.front) { const [k, mode, ids] = d.front.split("|"); return cmd({ t: "front", enemy: +k, mode: mode as "defend" | "attack", ids: ids.split(",").map(Number) }); }
  if (d.recruit) return cmd({ t: "recruit", hex: selected, unit: d.recruit });
  if (d.act === "hire-dip") { hiringDip = !hiringDip; return updateUI(); }
  if (d.hiredip !== undefined) { hiringDip = false; return cmd({ t: "diplomat", pick: Number(d.hiredip) }); }
  if (d.chronf !== undefined) { chronFilter = d.chronf; return updateUI(); }
  if (d.act === "hire-general" && selectedDiv) { hiring = hiring === selectedDiv ? 0 : selectedDiv; return updateUI(); }
  if (d.hire !== undefined && selectedDiv) { hiring = 0; return cmd({ t: "general", id: selectedDiv, pick: Number(d.hire) }); }
  if (d.fleet) return cmd({ t: "fleet", hex: selected, unit: d.fleet });
  if (d.stateNew) {
    const k = Number(d.stateNew);
    return openNamer("<i class=i-map></i> Novo estado", `Estado de ${eco.cities[k].name}`, cityFlag(k), () => cmd({ t: "stateNew", city: k, name: idIn("name").value, flag: idFlag() }));
  }
  if (d.stateJoin) { const [city, st] = d.stateJoin.split("|").map(Number); return cmd({ t: "stateJoin", city, state: st }); }
  if (d.stateLeave) return cmd({ t: "stateLeave", city: Number(d.stateLeave) });
  if (d.stateTax) { const [st, law] = d.stateTax.split("|"); return cmd({ t: "stateTax", state: Number(st), law: law || null }); }
  if (d.air) return cmd({ t: "air", hex: selected, unit: d.air });
  if (d.act === "war") return cmd({ t: "war", target: world.owner[selected] });
  if (d.peace) return cmd({ t: "peace", target: Number(d.peace) });
  if (d.buyhex) return cmd({ t: "buyHex", hex: Number(d.buyhex) });
  if (d.special !== undefined) return setSpecial((d.special || null) as Special | null);
  if (d.mbpick !== undefined) { mbB = Number(d.mbpick); message = ""; recolor(); return updateUI(); }
  if (d.act === "disband" && selectedDiv) { cmd({ t: "disband", id: selectedDiv }); selectedDiv = null; return updateUI(); }
  if (d.tab) { tab = Number(d.tab); return updateUI(); }
  if (d.econ) { econTab = Number(d.econ); goodDetail = null; return updateUI(); }
  if (d.good !== undefined) { goodDetail = d.good || null; return updateUI(); }
  if (d.goto) { selected = Number(d.goto); if (d.sheetkey) openSheet = d.sheetkey; const [x, y] = hexCenter(selected % W, (selected / W) | 0); cam.x = x; cam.y = y; cam.zoom = Math.max(cam.zoom, 8); return updateUI(); }
  if (d.menu) { menuCat = menuCat === d.menu ? null : d.menu; if (menuCat) { selected = -1; selectedDiv = null; group = []; } return updateUI(); } // abrir um menu tira o painel do hex da frente
  if (d.notes) return showNotes(d.notes);
  if (d.selectDiv) { selectedDiv = Number(d.selectDiv); group = [selectedDiv]; const u = eco.divisions.find((x) => x.id === selectedDiv); if (u) selected = u.hex; return updateUI(); }
  if (d.act === "close-panel") { selected = -1; selectedDiv = null; selectedChar = null; group = []; return updateUI(); }
  if (d.act === "merge") { const ids = eco.divisions.filter((x) => group.includes(x.id) && x.kind === "army" && x.country === active).map((x) => x.id); cmd({ t: "merge", ids }); group = [ids[0]]; selectedDiv = ids[0]; return updateUI(); }
  if (d.act === "split" && selectedDiv) { cmd({ t: "split", id: selectedDiv }); return updateUI(); }
  if (d.act === "maps") { mapsOpen = !mapsOpen; return updateUI(); }
  if (d.mode) { setMode(Number(d.mode)); mapsOpen = false; }
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

const TABS = ["Hex", "Economia", "Pesquisa", "Sociedade", "Política", "Mercado", "Gráficos"] as const;
/** Aba Gráficos: série escolhida do país ao longo do tempo (1 ponto por mês) e ranking mundial. */
let chartKey = "PIB";
let rankKey = "PIB";
function chartsHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1], h = c.history ?? {};
  const keys = Object.keys(SERIES);
  const btn = (k: string, cur: string, attr: string) => `<button data-${attr}="${k}" class="${k === cur ? "on" : ""}" style="margin:1px">${k}</button>`;
  const ranked = eco.countries.map((x, i) => [i + 1, SERIES[rankKey](x, i + 1, eco)] as const).sort((a, b) => b[1] - a[1]);
  const mine = ranked.findIndex(([k]) => k === active);
  return keys.map((k) => btn(k, chartKey, "chart")).join("") +
    `<canvas id="series" width="600" height="160" style="width:100%;height:160px;background:#111;margin-top:4px"></canvas>` +
    `<small>${(h[chartKey]?.length ?? 0)} meses · agora ${fmt(SERIES[chartKey](c, active, eco))}</small>` +
    `<br><b><i class=i-prestige></i> Ranking mundial</b> ` + ["Prestígio", "PIB", "População", "Tecnologias", "Cidades"].map((k) => btn(k, rankKey, "rank")).join("") +
    `<table>${ranked.slice(0, 10).map(([k, v], n) => `<tr${k === active ? ' style="color:#fd6"' : ""}><td>${n + 1}º ${world.countries[k - 1].name}</td><td>${fmt(v)}</td></tr>`).join("")}` +
    (mine >= 10 ? `<tr style="color:#fd6"><td>${mine + 1}º ${world.countries[active - 1].name}</td><td>${fmt(ranked[mine][1])}</td></tr>` : "") + `</table>`;
}

let tab = 0; // aba aberta no painel
const pct = (v: number) => `${Math.round(v * 100)}%`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}`;

// ---------------- layout: barra superior, camadas do mapa, menu lateral, painéis e barra inferior ----------------
const MENU = [
  ["overview", "Visão Geral"], ["people", "População"], ["economy", "Economia"], ["build", "Construções"], ["trade", "Comércio"],
  ["diplomacy", "Diplomacia"], ["politics", "Política"], ["tech", "Tecnologia"], ["military", "Militar"], ["admin", "Administração"],
  ["society", "Sociedade"], ["charts", "Gráficos"],
] as const;
let menuCat: string | null = null; // item do menu lateral aberto (null = só o mapa)
const LAYERS: [string, [number, string][]][] = [
  ["Geografia", [[0, "Terreno"], [5, "Clima"], [3, "Recursos"]]],
  ["Território", [[1, "Político"], [4, "Controle"], [13, "Expansão"]]],
  ["Sociedade", [[2, "População"], [7, "Satisfação"], [8, "Cultura"], [9, "Língua"], [10, "Religião"], [11, "Alfabetização"]]],
  ["Economia", [[12, "Infraestrutura"], [14, "Construção"], [16, "Subsistência"]]],
  ["Militar", [[15, "Suprimento"]]],
  ["Ciência", [[6, "Tecnologia"]]],
];
const flagCache = new Map<string, string>();
/** Bandeira como imagem (data URL), guardada enquanto não mudar. */
function flagURL(f: Flag) {
  const key = JSON.stringify(f);
  let u = flagCache.get(key);
  if (!u) { const cv = document.createElement("canvas"); cv.width = 60; cv.height = 40; drawFlag(cv.getContext("2d")!, 0, 0, 60, 40, f); u = cv.toDataURL(); flagCache.set(key, u); }
  return u;
}
const stat = (ic: string, title: string, value: string, extra = "") => `<span class="stat" title="${title}">${icon(ic)} <b class="num">${value}</b>${extra ? ` <small class="num">${extra}</small>` : ""}</span>`;

function topbarHtml() {
  const era = worldEra(), y0 = ERA_YEARS[era], y1 = ERA_YEARS[era + 1], year = START_YEAR + eco.week / 52;
  const when = `<div class="when"><div class="date">${timeLabel()}</div><div class="sub">Era ${ERAS[era]}</div><div class="bar"><div style="width:${Math.min(100, Math.max(0, ((year - y0) / (y1 - y0)) * 100))}%"></div></div></div>`;
  if (!active) return `<div class="who"><div><div class="name">Jogo Civilizatório</div><div class="sub">Clique num país no mapa para governá-lo</div></div></div>${when}<div class="stats"></div>`;
  const c = eco.countries[active - 1], meta = world.countries[active - 1], p = c.politics, ruler = rulerOf(eco, active);
  const weekly = c.income + c.tariffs - c.upkeep - c.interest;
  return `<div class="who">${ruler ? portraitSVG(ruler, c.research.era, 44) : ""}<img src="${flagURL(flagOf(active))}" alt=""><div><div class="name">${meta.name}</div><div class="sub">${ruler ? `<a data-char="${ruler.id}" style="cursor:pointer;text-decoration:underline dotted">${ruler.name}</a> (${ageOf(ruler, eco.week)}) · ` : ""}${lawOf(p, "Governo").name} · ${p.government.map((g) => GROUPS[g].name).join(", ") || "sem governo"}</div></div></div>` + when +
    `<div class="stats">` +
    stat("treasury", "Tesouro nacional e saldo por semana", fmt(c.treasury), `<span class="${weekly < 0 ? "up" : "down"}">${signed(weekly)}</span>`) +
    stat("prestige", "Prestígio nacional (média do mundo = 100)", String(prestige(eco, active))) +
    stat("stability", "Estabilidade: lealdade média da população (radicais ao lado)", String(Math.round(averageLoyalty(c.pops))), c.radicals > 0.05 ? `<span class="up">${pct(c.radicals)} rad.</span>` : "") +
    stat("legitimacy", "Legitimidade do governo", pct(p.legitimacy)) +
    stat("admin", "Pontos administrativos (por semana ao lado)", `${Math.floor(c.admin ?? 0)}`, signed(c.adminWeek ?? 0)) +
    `</div>`;
}

let mapsOpen = false;
// ---- modos especiais (barra inferior): o mesmo mapa e a mesma seleção, com camada, clique e painel da direita próprios
type Special = "build" | "state" | "diplo" | "military";
const SPECIALS: [Special, string, string, string, number][] = [
  ["build", "build", "Construção", "Onde dá para construir: escolha um edifício à direita; clique constrói no hex, Shift+clique na cidade, Ctrl+clique no estado", 14],
  ["state", "map", "Estado", "Divisão administrativa: estados e cidades, população, economia e incentivos", 17],
  ["diplo", "diplomacy", "Diplomacia", "Relação de cada país com o seu: aliado, amigo, neutro, tenso, hostil, em guerra", 18],
  ["military", "military", "Militar", "Só tropas: clique seleciona exércitos, frotas e esquadrões", 19],
];
let special: Special | null = null, modeBeforeSpecial = 0, pickedCountry = 0;
function setSpecial(s: Special | null) {
  if (s === special) s = null; // clicar no ativo volta ao normal
  if (!special) modeBeforeSpecial = mode;
  special = s; selected = -1; selectedDiv = null; selectedChar = null; group = []; pickedCountry = 0; menuCat = null;
  if (s === "build") mbCity = -1;
  setMode(s ? SPECIALS.find((x) => x[0] === s)![4] : modeBeforeSpecial);
  updateUI();
}
const modebarHtml = () => SPECIALS.map(([k, ic, n, tip]) => `<button data-special="${k}" class="${special === k ? "on" : ""}" title="${n}: ${tip}">${icon(ic)} <span class="lbl">${n}</span></button>`).join("") +
  `<button data-special="" title="Voltar ao mapa normal"${special ? "" : " disabled"}>${icon("close")} <span class="lbl">Normal</span></button>`;

const stateColor = (id: number) => { const h = (Math.imul(id + 7, 2654435761) >>> 0) % 360; return hsl(h, 0.45, 0.5); };
function hsl(h: number, s: number, l: number): number[] { const f = (n: number) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; }
/** Classe diplomática do país k para o jogador: [cor, nome]. Aliança (suserano/súdito) > guerra > relação (com reivindicações pesando). */
function diploClass(k: number): [number[], string] {
  if (k === active) return [[200, 200, 200], "Você"];
  if (atWar(eco, active, k)) return [[45, 8, 8], "Em guerra"];
  const sa = subjectOf(eco, k), sb = subjectOf(eco, active);
  if (sa?.overlord === active || sb?.overlord === k) return [[50, 100, 200], "Aliado (súdito ou suserano)"];
  let r = relation(eco, active, k);
  if ((eco.claims ?? []).some((c) => c.country === k && eco.cities[c.city]?.country === active)) r -= 25; // reivindica terra sua: ameaça
  if (hasPact(eco, active, k)) r += 10;
  return r > 50 ? [[30, 120, 50], "Muito amigável"] : r > 20 ? [[70, 165, 80], "Amigável"] : r > 5 ? [[140, 200, 130], "Levemente positiva"]
    : r >= -5 ? [[215, 200, 90], "Neutra"] : r >= -20 ? [[230, 160, 80], "Tensa"] : r >= -50 ? [[215, 90, 50], "Hostil"] : [[150, 30, 30], "Muito hostil"];
}

/** Painel do modo Construção: edifícios conhecidos em cartões por categoria; o escolhido pinta o mapa. */
function buildCatOf(b: number) {
  const d = BUILDINGS[b];
  return d.depot ? "Militares" : d.industry?.commerce ? "Comércio" : d.industry?.naval ? "Estaleiros" : d.industry?.admin ? "Administrativas" : d.industry?.construction ? "Infraestrutura" : d.industry ? "Indústrias" : d.boosts !== undefined ? "Melhorias" : "Extratoras";
}
function buildPanelHtml() {
  if (!active) return "<small>Escolha um país.</small>";
  const known = eco.countries[active - 1].research.known, cats = new Map<string, number[]>();
  BUILDINGS.forEach((_, b) => { const t = techFor(b); if (!t || known.has(t)) { const k = buildCatOf(b); if (!cats.has(k)) cats.set(k, []); cats.get(k)!.push(b); } });
  const card = (b: number) => {
    const d = BUILDINGS[b], ind = d.industry;
    const fx = d.boosts !== undefined ? `+${Math.round(d.mult! * 100)}% ${BUILDINGS[d.boosts].name}` : ind?.commerce ? `estoque +${ind.commerce.storage}, acesso +${Math.round(ind.commerce.access * 100)}%, poder +${ind.commerce.power}`
      : ind?.admin ? `${ind.admin} pontos adm.` : ind ? ind.outputs.map(([g, q]) => `${q} ${GOODS[g]}`).join(" + ") || "pontos de construção" : d.depot ? "suprimento do exército" : `${RULES.outputPerLevel} do recurso`;
    const where = d.depot ? "qualquer terra do país" : ind ? "hex de cidade" + (ind.naval ? " no litoral" : "") : d.for.map((g) => RESOURCES[g]).join(", ");
    return `<div class="bcard ${mbB === b ? "on" : ""}" data-mbpick="${b}" title="Precisa de: ${where}"><b>${artSVG("building", d.name, 16)} ${d.name}</b><small>custo ${RULES.buildCost}+ · ${cpCost(b)} PC · manut. ${RULES.upkeepPerLevel}/sem</small>` +
      `<small>${d.workers} trabalhadores · ${fx}</small><small>Onde: ${where}${techFor(b) ? ` · ${techFor(b)}` : ""}</small></div>`;
  };
  return `<h3>${icon("build")} Construção</h3><small>Escolha um edifício. No mapa: <b style="color:rgb(70,170,80)">verde</b> pode, <b style="color:rgb(200,70,60)">vermelho</b> limite atingido, cinza não serve. Clique = este hex · Shift = cidade inteira · Ctrl = estado inteiro (com confirmação).</small>` +
    (buildHover() ? `<div class="card">${buildHover()}</div>` : "") + (message ? `<div class="bad">${message}</div>` : "") +
    [...cats].map(([k, bs]) => `<h3>${k}</h3><div class="bcards">${bs.map(card).join("")}</div>`).join("");
}
/** Prévia do edifício escolhido no hex sob o mouse: produção, receita e insumos pelos preços da cidade (nada muda no jogo). */
function buildHover() {
  const [hc, hr] = hover; if (!inMap(hc, hr) || !active) return "";
  const i = hr * W + hc, d = BUILDINGS[mbB], city = cityOf(i);
  if (world.owner[i] !== active) return "";
  const err = canBuild(world, eco, i, mbB, queuedLevels(eco, i, mbB));
  if (err) return `<small>${d.name} aqui: ${err}</small>`;
  if (!city) return `<small>${d.name}: hex sem cidade (sem mercado para estimar receita)</small>`;
  const m = city.market, c = eco.countries[active - 1], price = (g: number) => BASE_PRICE[g] * m.price[g];
  let rev = 0, cost = 0, out = "", lack: string[] = [];
  if (d.industry) {
    for (const [g, q] of d.industry.outputs) { rev += q * price(g); out += `${q} ${GOODS[g]} `; }
    for (const [g, q] of d.industry.inputs) { cost += q * price(g); if (m.supply[g] - m.used[g] < q) lack.push(GOODS[g]); }
  } else if (d.boosts === undefined && !d.depot) { const g = outputOf(world, mbB, i), q = RULES.outputPerLevel * (1 + c.bonus[mbB]); rev = q * price(g); out = `${q.toFixed(1)} ${GOODS[g]}`; }
  const up = RULES.upkeepPerLevel, profit = rev - cost - up;
  return `<b>${d.name}</b> em ${city.name}: produz ${out || "—"} · receita ${rev.toFixed(1)}/sem · insumos ${cost.toFixed(1)} · manutenção ${up} · <b class="${profit >= 0 ? "down" : "up"}">${profit >= 0 ? "lucro" : "prejuízo"} ${profit.toFixed(1)}</b> · ${d.workers} trabalhadores` +
    (lack.length ? ` · <span class="bad">falta no mercado: ${lack.join(", ")}</span>` : "") + `<br><small>Estimativa antes dos salários (os salários saem do que sobra).</small>`;
}
/** Clique no modo Construção: um hex, a cidade (Shift) ou o estado (Ctrl), com confirmação do lote. */
function buildClick(i: number, shift: boolean, ctrl: boolean) {
  if (!active || world.owner[i] !== active) { message = "Só no seu território"; return; }
  const d = BUILDINGS[mbB];
  if (!shift && !ctrl) {
    const err = canBuild(world, eco, i, mbB, queuedLevels(eco, i, mbB));
    if (err) { message = err; return; }
    if (confirm(`Construir ${d.name} aqui por ${buildCost(eco, mbB, i)} (${cpCost(mbB)} pontos de construção)?`)) cmd({ t: "build", i, b: mbB });
    return;
  }
  const k = eco.market[i]; if (!k) { message = "Hex sem cidade"; return; }
  const st = eco.cities[k - 1].state;
  const area = [...eco.owned].filter((j) => world.owner[j] === active && eco.market[j] && (ctrl && st !== undefined ? eco.cities[eco.market[j] - 1].state === st : eco.market[j] === k));
  const ok: number[] = [], why = new Map<string, number>();
  for (const j of area) { const err = canBuild(world, eco, j, mbB, queuedLevels(eco, j, mbB)); if (err) why.set(err, (why.get(err) ?? 0) + 1); else ok.push(j); }
  if (!ok.length) { message = `Nenhum hex válido (${[...why].map(([r, n]) => `${n}: ${r}`).join("; ")})`; return; }
  const cost = ok.reduce((s, j) => s + buildCost(eco, mbB, j), 0), c = eco.countries[active - 1];
  const txt = `${d.name} em ${ctrl && st !== undefined ? "todo o estado" : `toda a cidade de ${eco.cities[k - 1].name}`}

Hexes válidos: ${ok.length}
Ignorados: ${area.length - ok.length}${why.size ? ` (${[...why].map(([r, n]) => `${n} ${r}`).join("; ")})` : ""}` +
    `
Custo total: ${Math.round(cost)} (tesouro ${Math.round(c.treasury)})
Manutenção a mais: ${(ok.length * RULES.upkeepPerLevel).toFixed(1)}/sem
Trabalhadores: ${ok.length * d.workers}

Confirmar?`;
  if (confirm(txt)) cmd({ t: "buildMany", hexes: ok, b: mbB, levels: 1 });
}
/** Painel do modo Estado: estado (ou cidade sem estado) do hex clicado. */
function statePanelHtml() {
  if (selected < 0 || !eco.market[selected]) return `<h3>${icon("map")} Estados</h3><small>Clique numa região para ver o estado e as cidades dele. Cada cor é um estado; cinza = cidade sem estado.</small>`;
  const city = eco.cities[eco.market[selected] - 1], st = city.state !== undefined ? eco.states.find((s) => s.id === city.state) : undefined;
  const cs = st ? eco.cities.filter((k) => k.state === st.id) : [city], ks = new Set(cs.map((k) => eco.cities.indexOf(k) + 1));
  let hexes = 0, ctrl = 0, pop = 0, blds = 0;
  for (const j of eco.owned) if (ks.has(eco.market[j])) { hexes++; ctrl += eco.control[j]; pop += world.pop[j]; if (eco.producers.has(j)) for (let b = 0; b < BUILDINGS.length; b++) blds += eco.levels[b][j]; }
  const gdp = cs.reduce((s, k) => s + k.market.supply.reduce((a, q, g) => a + (q - (k.market.self?.[g] ?? 0)) * BASE_PRICE[g] * k.market.price[g], 0), 0);
  const inc = (eco.incentives ?? []).filter((x) => (st && x.state === st.id) || (x.state === undefined && cs.some((k) => eco.cities.indexOf(k) === x.city)));
  return `<h3>${icon("map")} ${st ? st.name : `${city.name} (sem estado)`}</h3><small>${world.countries[city.country - 1].name} · capital ${cs[0].name}</small>` +
    `<div class="cards"><div class="card"><div class="k">População</div><div class="v">${fmt(pop)}</div></div><div class="card"><div class="k">Cidades</div><div class="v">${cs.length}</div></div>` +
    `<div class="card"><div class="k">Hexes</div><div class="v">${hexes}</div></div><div class="card"><div class="k">Controle</div><div class="v">${pct(hexes ? ctrl / hexes : 0)}</div></div>` +
    `<div class="card"><div class="k">PIB / sem</div><div class="v">${fmt(gdp)}</div></div><div class="card"><div class="k">Níveis de construção</div><div class="v">${blds}</div></div></div>` +
    `<h3>Cidades</h3><table>${cs.map((k) => `<tr><td><button data-goto="${k.hex}">${k.name}</button></td><td>${fmt(k.market.pop)} pessoas</td><td>${k.urban.length} hex urbano(s)</td></tr>`).join("")}</table>` +
    `<h3>Incentivos ativos</h3>${inc.length ? inc.map((x) => `<small>${x.kind} — ${x.state !== undefined ? "<b>estadual</b>" : `cidade de ${eco.cities[x.city].name}`} · ${pct(progressOf(eco, x))}</small>`).join("<br>") : "<small>Nenhum.</small>"}` +
    `<br><small>Complexidade Social do ${st ? "estado" : "lugar"}: <b>${socialComplexity(eco, cs.map((k) => eco.cities.indexOf(k)))}</b></small>` +
    (city.country === active ? regionalPoliciesHtml(eco.cities.indexOf(city)) : "");
}
/** Painel do modo Diplomacia: país escolhido no mapa. */
function diploPanelHtml() {
  const k = pickedCountry;
  if (!k || !active) return `<h3>${icon("diplomacy")} Diplomacia</h3><small>Clique num país. Cores: azul aliado, verde amigável, amarelo neutro, laranja tenso, vermelho hostil, quase preto em guerra.</small>`;
  const c = eco.countries[k - 1], [col, cls] = diploClass(k), r = rulerOf(eco, k);
  const claims = (eco.claims ?? []).filter((x) => x.country === k && eco.cities[x.city]?.country === active).length;
  return `<div style="display:flex;gap:8px;align-items:center"><img src="${flagURL(flagOf(k))}" width="42" height="28"><div><h3 style="margin:0">${world.countries[k - 1].name}</h3><small>${lawOf(c.politics, "Governo").name}${r ? ` · <a data-char="${r.id}" style="cursor:pointer">${r.name}</a>` : ""}</small></div></div>` +
    `<p><span style="display:inline-block;width:12px;height:12px;background:${rgb(col)};vertical-align:-2px"></span> <b>${cls}</b> · relação ${Math.round(relation(eco, active, k))} · prestígio ${prestige(eco, k)}</p>` +
    `<div class="cards"><div class="card"><div class="k">População</div><div class="v">${fmt(c.pop)}</div></div><div class="card"><div class="k">PIB anual</div><div class="v">${fmt(c.gdpWeek * 52)}</div></div>` +
    `<div class="card"><div class="k">Exército</div><div class="v">${fmt(eco.divisions.filter((d) => d.country === k && d.kind === "army").reduce((s, d) => s + d.strength, 0))}</div></div><div class="card"><div class="k">Era</div><div class="v">${ERAS[c.research.era]}</div></div></div>` +
    `<small>${personality(world, eco, k)}${claims ? ` · <span class="bad">reivindica ${claims} cidade(s) sua(s)</span>` : ""}${hasPact(eco, active, k) ? " · acordo comercial" : ""}</small><br><small>Quer: ${desires(world, eco, k).slice(0, 3).map((x) => lifeText(world, x)).join("; ") || "—"}</small>` +
    (k !== active ? `<p><button data-improve="${k}">Melhorar relações (${DIPLO.improveCost} adm.)</button> ${atWar(eco, active, k) ? `<button data-peace="${k}">Propor paz</button>` : hasPact(eco, active, k) ? `<button data-unpact="${k}">Cancelar acordo</button>` : `<button data-pact="${k}">Propor acordo comercial</button>`} <button data-menu="diplomacy">Abrir diplomacia</button></p>` : "");
}
function specialPanelHtml() {
  if (special === "build") return buildPanelHtml();
  if (special === "state") return statePanelHtml();
  if (special === "diplo") return diploPanelHtml();
  return selectedDiv ? divisionHtml() : `<h3>${icon("military")} Militar</h3><small>Clique numa tropa no mapa (cliques repetidos alternam entre as do hex). Arraste para selecionar várias.</small>` + militaryHtml();
}
/** Legenda de cada camada: [cor ou gradiente CSS, texto]. As cores são as de colorize/hexLayer. */
const rgb = (c: readonly number[]) => `rgb(${c.map(Math.round).join(",")})`;
const grad = (a: readonly number[], b: readonly number[], c?: readonly number[]) => `linear-gradient(90deg,${rgb(a)},${c ? rgb(b) + "," + rgb(c) : rgb(b)})`;
function legendItems(): [string, string][] {
  switch (mode) {
    case 0: return TERRAINS.slice(1).map((t) => [rgb(t.color), t.name]);
    case 1: return [["#c86", "País (cor própria)"], ["#a99", "Influência (tom claro)"], ["repeating-linear-gradient(45deg,#c86 0 4px,#68c 4px 8px)", "Ocupado (listras)"], [rgb([90, 90, 90]), "Sem dono"]];
    case 2: return [[grad([40, 40, 40], [255, 120, 40]), "Pouca gente → muita"]];
    case 3: return RESOURCES.slice(1).map((n, k) => [rgb(RES_COLORS[k + 1]), n]);
    case 4: return [[grad([220, 60, 60], [40, 220, 60]), "Pouco controle → muito"], [rgb([70, 70, 70]), "Sem dono"]];
    case 5: return CLIMATES.map((n, k) => [rgb(CLIMATE_COLORS[k]), n]);
    case 6: return [[grad([30, 50, 90], [70, 160, 255]), "Menos tecnologias → mais"]];
    case 7: return [[grad([220, 60, 60], [220, 190, 70], [40, 200, 70]), "Insatisfeito → satisfeito"]];
    case 8: case 9: case 10: return [["linear-gradient(90deg,#c55,#5a5,#55c,#cc5)", "Uma cor por " + ["cultura", "língua", "religião"][mode - 8] + " (a maior da cidade)"]];
    case 11: return [[grad([40, 60, 90], [100, 160, 240]), "Pouca alfabetização → muita"]];
    case 12: return [[grad([70, 70, 60], [220, 180, 90]), "Sem estrada/porto → muita infraestrutura"]];
    case 13: return [["#c86", "País"], ["#b9a", "Área de influência"], [rgb([200, 70, 60]), "Cidade isolada"]];
    case 14: return [[rgb([70, 170, 80]), "Pode construir"], [rgb([200, 70, 60]), "Limite atingido"], [rgb([110, 110, 110]), "Não serve aqui"], [rgb([95, 95, 95]), "Fora da cidade escolhida"]];
    case 17: return [["linear-gradient(90deg,#c77,#7c7,#77c)", "Uma cor por estado"], [rgb([120, 120, 120]), "Cidade sem estado"], ["#988", "Terra sem cidade"]];
    case 18: return ([[[50, 100, 200], "Aliado"], [[30, 120, 50], "Muito amigável"], [[70, 165, 80], "Amigável"], [[140, 200, 130], "Levemente positiva"], [[215, 200, 90], "Neutra"], [[230, 160, 80], "Tensa"], [[215, 90, 50], "Hostil"], [[150, 30, 30], "Muito hostil"], [[45, 8, 8], "Em guerra"]] as [number[], string][]).map(([c, n]) => [rgb(c), n]);
    case 19: return [["#887", "Países (apagados)"], ["#fff", "Tropas em destaque"]];
    case 15: return [[rgb([70, 170, 80]), "Perto do depósito"], [rgb([210, 190, 60]), "Médio"], [rgb([220, 130, 50]), "Longe"], [rgb([180, 60, 50]), "Fora do alcance"]];
    case 16: return [[rgb([70, 170, 80]), "Pressão < 50%"], [rgb([170, 190, 70]), "50–80%"], [rgb([220, 170, 50]), "80–100%"], [rgb([220, 110, 50]), "100–120%"], [rgb([180, 50, 45]), "> 120%"], [grad([60, 70, 60], [100, 180, 90]), "Fora do país: potencial"]];
  }
  return [];
}
const legendHtml = () => { const it = legendItems(); return it.length ? `<div class="legend">${it.map(([c, n]) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}</div>` : ""; };
const maptoolsHtml = () => (mapsOpen ? "" : legendHtml()) + `<button data-act="maps" class="${mapsOpen ? "on" : ""}" title="Camadas do mapa">${icon("globe")} Mapa: ${MAP_MODES[mode]}</button>` +
  (mapsOpen ? `<div class="maps">${LAYERS.map(([g, ms]) => `<div class="grp"><span>${g}</span>${ms.map(([k, n]) => `<button data-mode="${k}" class="${k === mode ? "on" : ""}" title="${k < 9 ? `Tecla ${k + 1}` : n}">${n}</button>`).join("")}</div>`).join("")}</div>` : "");

function leftmenuHtml() {
  return MENU.map(([ic, n]) => `<button class="item ${menuCat === ic ? "on" : ""}" data-menu="${ic}">${icon(ic, 18)} ${n}</button>`).join("") +
    `<div class="sep"></div><div class="tools">` +
    `<button data-act="save" title="Salvar partida em arquivo (Ctrl+S)">${icon("save")} Salvar</button>` +
    `<button data-act="load" title="Carregar partida de arquivo">${icon("load")} Abrir</button>` +
    (lastAuto ? `<button data-act="continue" title="Continuar o último salvamento automático">${icon("load")} ${lastAuto.label}</button>` : "") +
    `<button data-act="mp" title="Multiplayer">${icon("globe")} Multiplayer</button>` +
    `<button data-act="new" title="Gera um mapa novo (R)">${icon("newmap")} Novo mapa</button></div>`;
}

// ---- Economia em abas (docs/interface.md §4): o único lugar onde mercadorias aparecem como estoque e fluxo
const ECON_TABS = ["Visão Geral", "Orçamento", "Mercados", "Mercadorias", "Produção e Consumo", "Finanças", "Dificuldades da era"] as const;
let econTab = 0;
const GOOD_CATS: [string, string[]][] = [
  ["Alimentos", ["Grãos", "Frutas e vegetais", "Carne e caça", "Produtos alimentícios", "Bebidas"]],
  ["Agricultura e pecuária", ["Fibras", "Especiarias", "Gado", "Cavalos", "Peles", "Plantas medicinais", "Fertilizantes"]],
  ["Floresta e construção", ["Madeira", "Pedra", "Argila", "Cimento", "Vidro"]],
  ["Minerais e energia", ["Sal", "Enxofre", "Salitre", "Carvão mineral", "Petróleo", "Combustível", "Energia elétrica", "Urânio", "Areia de quartzo", "Pedras preciosas"]],
  ["Metais", ["Cobre", "Estanho", "Ferro", "Ouro", "Prata", "Bauxita", "Lítio", "Terras raras", "Bronze", "Aço", "Alumínio"]],
  ["Manufaturados", ["Tecidos", "Couro", "Cerâmica", "Ferramentas", "Papel", "Materiais impressos", "Bens de luxo", "Medicamentos", "Química básica", "Plásticos"]],
  ["Indústria avançada", ["Máquinas", "Eletrônicos", "Baterias", "Equipamentos de energia", "Equipamentos de telecomunicações"]],
  ["Militar", ["Armas", "Pólvora"]],
];
/** Soma dos mercados das cidades do país para um bem. Comércio > 0 = entrou de outras cidades/países. */
function nationalGood(g: number) {
  let prod = 0, cons = 0, imp = 0, exp = 0, price = 0, pop = 0;
  for (const k of eco.cities) {
    if (k.country !== active) continue;
    const m = k.market;
    prod += m.supply[g] - Math.max(0, m.trade[g]); cons += m.demand[g];
    if (m.trade[g] > 0) imp += m.trade[g]; else exp -= m.trade[g];
    price += m.price[g] * m.pop; pop += m.pop;
  }
  return { prod, cons, imp, exp, price: pop ? price / pop : 1 };
}

let goodDetail: string | null = null; // mercadoria aberta na aba Mercadorias

/** Barras horizontais: [rótulo, valor] em ordem, a maior ocupa a largura toda. */
const hbars = (rows: [string, number][], color = "var(--gold)", fmtv = fmt) => {
  const max = Math.max(1e-9, ...rows.map(([, v]) => Math.abs(v)));
  return rows.map(([k, v]) => `<div style="display:grid;grid-template-columns:150px 1fr 70px;gap:6px;align-items:center;font-size:12px"><span>${k}</span>` +
    `<div class="bar" style="margin:0"><div style="background:${color};width:${(Math.abs(v) / max) * 100}%"></div></div><span class="num" style="text-align:right">${fmtv(v)}</span></div>`).join("");
};

/** Produção e consumo: quem produz, o que falta, o que sobra e de onde vem a renda. */
function prodConsHtml() {
  if (!active) return "";
  const cs = eco.cities.filter((k) => k.country === active);
  const value = (k: (typeof cs)[number]) => { let v = 0; for (let g = 1; g < GOODS.length; g++) v += (k.market.supply[g] - Math.max(0, k.market.trade[g])) * BASE_PRICE[g] * k.market.price[g]; return v; };
  const byCity = cs.map((k) => [k.name, value(k)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const sectors = BUILDINGS.map((b, k) => { let n = 0; for (const i of eco.owned) if (world.owner[i] === active) n += eco.levels[k][i] * b.workers; return [b.name, n] as [string, number]; }).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const goods = GOODS.map((n, g) => [n, g ? nationalGood(g) : null] as const).filter(([, d]) => d && (d.prod > 0.5 || d.cons > 0.5)) as [string, ReturnType<typeof nationalGood>][];
  const lack = goods.map(([n, d]) => [n, d.cons - d.prod - d.imp] as [string, number]).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  const spare = goods.map(([n, d]) => [n, d.prod - d.cons] as [string, number]).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  const imports = goods.map(([n, d]) => [n, d.imp] as [string, number]).filter(([, v]) => v > 0.5).sort((a, b) => b[1] - a[1]);
  return `<h3>Produção por cidade (valor/sem)</h3>${hbars(byCity)}` +
    `<h3>Empregos por setor</h3>${hbars(sectors, "var(--blue)")}` +
    `<h3>Faltando (consumo acima de produção + importação)</h3>${lack.length ? hbars(lack, "var(--red)") : "<small>Nada falta.</small>"}` +
    `<h3>Sobrando</h3>${spare.length ? hbars(spare, "var(--green)") : "<small>Nada sobra.</small>"}` +
    `<h3>Depende de importação</h3>${imports.length ? hbars(imports, "var(--orange)") : "<small>Não importa nada.</small>"}`;
}

/** Finanças: de onde vem e para onde vai o dinheiro do Estado, e a dívida. */
function financesHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1], army = eco.divisions.filter((d) => d.country === active && d.kind !== "settler").length * WAR.upkeep;
  const card = (k: string, v: string, cls = "") => `<div class="card"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
  return `<div class="cards">${card("Tesouro", fmt(c.treasury))}${card("Dívida", fmt(c.debt), c.debt > 0 ? "up" : "")}${card("Imposto médio", pct(c.tax))}${card("Juros / sem", fmt(c.interest), c.interest > 0 ? "up" : "")}</div>` +
    `<h3>Receitas por semana</h3>${hbars([["Impostos", c.income], ["Tarifas", c.tariffs]], "var(--green)")}` +
    `<h3>Despesas por semana</h3>${hbars([["Manutenção das construções", c.upkeep], ["Forças armadas", army], ["Juros da dívida", c.interest]], "var(--red)")}` +
    (c.bankruptWeeks ? `<p class="bad">Falido: produção reduzida por mais ${c.bankruptWeeks} semanas.</p>` : "") +
    `<h3>Tesouro (meses)</h3><canvas id="ch-treasury" width="600" height="100" style="width:100%;height:100px;background:#111"></canvas>` +
    `<h3>Dívida (meses)</h3><canvas id="ch-debt" width="600" height="100" style="width:100%;height:100px;background:#111"></canvas>`;
}

/** Página de uma mercadoria: preço no tempo, quem produz, quem consome, comércio. */
function goodDetailHtml(name: string) {
  const g = GOODS.indexOf(name), d = nationalGood(g);
  const cs = eco.cities.filter((k) => k.country === active);
  const prod = cs.map((k) => [k.name, k.market.supply[g] - Math.max(0, k.market.trade[g])] as [string, number]).filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const cons = cs.map((k) => [k.name, k.market.demand[g]] as [string, number]).filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const users = BUILDINGS.filter((b) => b.industry?.inputs.some(([x]) => x === g)).map((b) => b.name);
  const makers = BUILDINGS.filter((b) => b.industry ? b.industry.outputs.some(([x]) => x === g) : b.for.includes(g)).map((b) => b.name);
  return `<button data-good="" title="Voltar">‹ Mercadorias</button><h3>${artSVG("good", name, 22)} ${name} · ${(BASE_PRICE[g] * d.price).toFixed(1)} <small>(${Math.round((d.price - 1) * 100)}% do preço base)</small></h3>` +
    `<canvas id="ch-good" width="600" height="110" style="width:100%;height:110px;background:#111"></canvas><small>Preço médio no país, últimos 24 meses.</small>` +
    `<div class="cards"><div class="card"><div class="k">Produção/sem</div><div class="v">${fmt(d.prod)}</div></div><div class="card"><div class="k">Consumo/sem</div><div class="v">${fmt(d.cons)}</div></div>` +
    `<div class="card"><div class="k">Importa</div><div class="v">${fmt(d.imp)}</div></div><div class="card"><div class="k">Exporta</div><div class="v">${fmt(d.exp)}</div></div></div>` +
    `<h3>Quem produz</h3>${prod.length ? hbars(prod, "var(--green)") : "<small>Ninguém no país.</small>"}<small>Feito por: ${makers.join(", ") || "—"}</small>` +
    `<h3>Quem consome</h3>${cons.length ? hbars(cons, "var(--red)") : "<small>Ninguém no país.</small>"}<small>População${users.length ? " e " + users.join(", ") : ""}.</small>`;
}

function economyView() {
  const tabs = `<div class="tabs">${ECON_TABS.map((t, k) => `<button data-econ="${k}" class="${k === econTab ? "on" : ""}">${t}</button>`).join("")}</div>`;
  if (econTab === 3 && goodDetail) return tabs + goodDetailHtml(goodDetail);
  return tabs + [econOverview, budgetHtml, marketsHtml, goodsCardsHtml, prodConsHtml, financesHtml, eraHtml][econTab]();
}

// ---- Orçamento do Estado (budget.ts): receitas e despesas reais da semana, impostos por classe e tributos específicos
function budgetHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1], book = c.bookLast ?? {};
  const ins = BUDGET_IN.map((k) => [k, book[k] ?? 0] as const).filter(([, v]) => v > 0.005);
  const outs = Object.entries(book).filter(([, v]) => v < -0.005).map(([k, v]) => [k, -v] as const).sort((a, b) => b[1] - a[1]);
  const tin = ins.reduce((s, [, v]) => s + v, 0), tout = outs.reduce((s, [, v]) => s + v, 0), bal = tin - tout;
  const rows = (list: readonly (readonly [string, number])[], tot: number) => list.map(([k, v]) => `<tr><td>${k}</td><td class="num">${fmt(v)}</td><td><small>${pct(tot ? v / tot : 0)}</small></td></tr>`).join("") || `<tr><td colspan=3><small>nada nesta semana</small></td></tr>`;
  const warn: string[] = [];
  if (bal < 0) warn.push(`Déficit de ${fmt(-bal)} por semana`);
  if ((c.upkeepPaid ?? 1) < 0.99) warn.push(`Só ${pct(c.upkeepPaid ?? 1)} da manutenção foi paga: as construções rendem menos`);
  if (debtCap(c) <= 0) warn.push("Sem crédito nesta era: gasto além do tesouro fica sem pagar");
  // impostos por classe: base tributável real, alíquota, cobrado e qualidade de vida
  const p = c.pops, taxable = p.taxable ?? new Float64Array(p.count.length);
  const cls = CLASSES.map((name, k) => {
    let people = 0, base = 0, qolSum = 0;
    POP_TYPES.forEach((t, i) => { if (t.cls === k) { people += p.count[i]; base += taxable[i]; qolSum += p.qol[i] * p.count[i]; } });
    const t = classTaxOf(c, k), paid = c.taxByClass?.[k] ?? 0, eff = c.taxEff ?? 0;
    const step = t.mode === "pct" ? 0.05 : 1, next = t.v + step, extra = (t.mode === "pct" ? base * step : Math.min(base, next * people) - Math.min(base, t.v * people)) * eff;
    return `<tr><td>${name}<br><small>${fmt(people)} pessoas · QV ${people ? Math.round(qolSum / people) : 0}</small></td><td class="num">${fmt(base)}</td>` +
      `<td><select data-ctaxmode="${k}"><option value="pct"${t.mode === "pct" ? " selected" : ""}>%</option><option value="fixed"${t.mode === "fixed" ? " selected" : ""}>fixo</option></select> ` +
      `<input data-ctax="${k}" type="number" step="${t.mode === "pct" ? 1 : 0.1}" min="0" value="${t.mode === "pct" ? Math.round(t.v * 100) : t.v.toFixed(1)}" style="width:56px">${t.mode === "pct" ? "%" : "/pessoa"}</td>` +
      `<td class="num">${fmt(paid)}</td><td><small>+${t.mode === "pct" ? "5 pontos" : "1/pessoa"}: +${fmt(extra)}/sem, renda da classe −${fmt(extra)}</small></td></tr>`;
  }).join("");
  const taxes = TAX_KINDS.map((t) => {
    const a = c.taxes?.find((x) => x.id === t.id), ok = canTax(c, t);
    const status = a ? (a.suspended ? `<span class="bad">suspenso (faltam pontos adm.)</span>` : "ativo") : ok ? "disponível" : `<small><i class=i-lock></i> ${t.tech}</small>`;
    return `<tr><td><b>${t.name}</b><br><small>${t.desc}${t.temporary ? ` Dura ${t.temporary} semanas.` : ""}</small></td><td><small>${t.adminCost} adm. + ${t.adminWeek}/sem</small></td><td>${status}</td>` +
      `<td>${ok ? `<input data-stax="${t.id}" type="number" min="0" max="${Math.round(t.maxRate * 100)}" step="1" value="${Math.round((a?.rate ?? 0) * 100)}" style="width:52px">% <small>(máx. ${Math.round(t.maxRate * 100)}%)</small>` : ""}</td></tr>`;
  }).join("");
  return `<div class="cards"><div class="card"><div class="k">Tesouro</div><div class="v">${fmt(c.treasury)}</div></div><div class="card"><div class="k">Receitas / sem</div><div class="v down">${fmt(tin)}</div></div>` +
    `<div class="card"><div class="k">Despesas / sem</div><div class="v up">${fmt(tout)}</div></div><div class="card"><div class="k">${bal >= 0 ? "Superávit" : "Déficit"}</div><div class="v ${bal >= 0 ? "down" : "up"}">${signed(bal)}</div></div>` +
    `<div class="card"><div class="k">Dívida / teto de crédito</div><div class="v">${fmt(c.debt)} / ${fmt(debtCap(c))}</div></div><div class="card"><div class="k">Cobrança efetiva</div><div class="v">${pct(c.taxEff ?? 0)}</div></div></div>` +
    (warn.length ? `<div class="card"><span class="warn">${warn.join("<br>")}</span></div>` : "") +
    `<h3>Receitas</h3><table>${rows(ins, tin)}</table><h3>Despesas</h3><table>${rows(outs, tout)}</table>` +
    `<h3>Impostos por classe social</h3><small>O imposto sai da renda de mercado de cada classe (comida de subsistência não paga). O que o Estado não consegue cobrar fica com o povo. Menos renda disponível = menos qualidade de vida = mais vontade de emigrar.</small>` +
    `<table><tr><td><b>Classe</b></td><td><b>Renda tributável</b></td><td><b>Imposto</b></td><td><b>Cobrado</b></td><td><b>Prévia</b></td></tr>${cls}</table>` +
    `<h3>Tributos específicos</h3><small>Criar custa pontos administrativos (você tem ${Math.floor(c.admin ?? 0)}); manter também. Sem pontos, o tributo fica suspenso. 0% revoga.</small><table>${taxes}</table>`;
}
/** Dificuldades estruturais da era (eramods.ts): valor atual de cada fator e o que melhora. */
function eraHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1];
  const names: [EconKey, string, string][] = [["tax", "Eficiência tributária", "fração do imposto devido que chega ao tesouro"], ["monetization", "Monetização", "parte dos custos e do investimento paga em dinheiro"],
    ["trade", "Eficiência comercial", "quanto circula entre cidades e com o exterior"], ["industry", "Produtividade industrial", "produção das indústrias"], ["admin", "Eficiência administrativa", "pontos administrativos"],
    ["construction", "Eficiência de construção", "pontos de construção"], ["upkeep", "Custo de manutenção", "multiplica a manutenção"], ["foodLoss", "Perda de comida", "subsistência perdida por mês"],
    ["credit", "Capacidade de crédito", "teto de dívida em PIB anual"], ["privateInvest", "Investimento privado formal", "entrada no fundo de investimento"]];
  const helps = (k: EconKey) => [...Object.entries(ECON_TECH).filter(([, v]) => v[k]).map(([t]) => `${c.research.known.has(t) ? "✓ " : ""}${t}`), ...Object.entries(ECON_LAW).filter(([, v]) => v[k]).map(([l]) => `lei ${l}`)].join(", ");
  return `<small>Era ${ERAS[c.research.era]}: a sociedade ainda não tem as instituições para transformar produção em dinheiro e em obras. Só tecnologias e leis melhoram estes números (a data sozinha não).</small><table>` +
    names.map(([k, n, d]) => `<tr><td><b>${n}</b><br><small>${d}</small></td><td class="num">${pct(econ(c, k))}</td><td><small>base da era ${pct(ERA_ECON[c.research.era][k])} · melhoram: ${helps(k) || "próxima era"}</small></td></tr>`).join("") + `</table>`;
}

function econOverview() {
  if (!active) return "";
  const c = eco.countries[active - 1], weekly = c.income + c.tariffs - c.upkeep - c.interest;
  const h = c.history?.["PIB"] ?? [], growth = h.length > 12 ? (h[h.length - 1] / (h[h.length - 13] || 1) - 1) : 0;
  const card = (k: string, v: string, cls = "") => `<div class="card"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
  return `<div class="cards">${card("PIB anual", fmt(c.gdpWeek * 52))}${card("Crescimento (12 meses)", `${growth >= 0 ? "+" : ""}${Math.round(growth * 100)}%`, growth >= 0 ? "down" : "up")}` +
    `${card("Arrecadação / sem", fmt(c.income + c.tariffs))}${card("Despesas / sem", fmt(c.upkeep + c.interest))}${card("Saldo / sem", signed(weekly), weekly >= 0 ? "down" : "up")}` +
    `${card("Fundo privado", fmt(c.investPool ?? 0))}${card("Dívida", fmt(c.debt), c.debt > 0 ? "up" : "")}</div>` +
    (c.sub ? `<h3>Subsistência</h3><div class="cards">${card("Vivem da terra", `${fmt(c.sub.dependants)} <small>(${pct(c.sub.dependants / Math.max(1, c.pop))})</small>`)}${card("Pressão sobre a terra", pct(c.sub.dependants / Math.max(1, c.sub.capacity)), c.sub.dependants > c.sub.capacity ? "up" : "")}` +
      `${card("Comem em casa / sem", fmt(c.subsistence))}${card("Excedente vendido / sem", fmt(c.subSold ?? 0))}</div><small>O que a família come em casa fica fora do PIB e do imposto; o excedente vendido é renda tributável. Construções ocupam terra e empregam gente: a subsistência encolhe, mas nunca some.</small>` : "") + economyHtml();
}

function marketsHtml() {
  if (!active) return "";
  const rows = eco.cities.map((k, i) => [k, i] as const).filter(([k]) => k.country === active).map(([k, i]) => {
    const m = k.market;
    let prod = 0, cons = 0, need = 0, got = 0;
    for (let g = 1; g < GOODS.length; g++) { prod += (m.supply[g] - Math.max(0, m.trade[g])) * BASE_PRICE[g]; cons += m.demand[g] * BASE_PRICE[g]; need += m.need[g]; got += Math.min(m.need[g], m.supply[g]); }
    const eff = need ? got / need : 1;
    return `<tr><td><button data-goto="${k.hex}" title="Ver no mapa e abrir o mercado">${k.name}</button></td><td>${fmt(m.pop)}</td><td>${fmt(prod)}</td><td>${fmt(cons)}</td>` +
      `<td class="${eff < 0.6 ? "up" : eff > 0.9 ? "down" : "warn"}">${pct(eff)}</td><td>${k.road ?? 0}</td><td>${k.harbor ?? 0}</td></tr>`;
  });
  return `<small>Cada cidade é um mercado metropolitano; o mercado nacional é a soma deles (aba Mercadorias). Clique numa cidade para ver o mercado dela à direita.</small>` +
    `<table><tr><td><b>Mercado</b></td><td><b>População</b></td><td><b>Produção</b></td><td><b>Consumo</b></td><td><b title="Quanto do que o mercado precisa ele tem">Abastecimento</b></td><td><b>Estrada</b></td><td><b>Porto</b></td></tr>${rows.join("")}</table>`;
}

function goodsCardsHtml() {
  if (!active) return "";
  const hist = eco.countries[active - 1].history ?? {};
  return GOOD_CATS.map(([cat, names]) => {
    const cards = names.map((n) => {
      const g = GOODS.indexOf(n), d = nationalGood(g);
      if (d.prod < 0.5 && d.cons < 0.5) return "";
      const ph = hist["$" + n] ?? [], old = ph.length > 6 ? ph[ph.length - 7] : d.price, trend = old ? d.price / old - 1 : 0;
      const bal = d.prod + d.imp - d.exp - d.cons;
      return `<div class="card" data-good="${n}" style="cursor:pointer" title="Abrir ${n}"><div class="k">${artSVG("good", n, 16)} ${n}</div><div class="v">${(BASE_PRICE[g] * d.price).toFixed(1)} <small class="${trend > 0.02 ? "up" : trend < -0.02 ? "down" : ""}">${trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(trend * 100))}%</small></div>` +
        `<small>Produção ${fmt(d.prod)} · Consumo ${fmt(d.cons)}<br>Importa ${fmt(d.imp)} · Exporta ${fmt(d.exp)}<br>Saldo <span class="${bal >= 0 ? "down" : "up"}">${signed(bal)}</span>/sem</small></div>`;
    }).join("");
    return cards ? `<h3>${cat}</h3><div class="cards">${cards}</div>` : "";
  }).join("") + "<small>Preço com a variação dos últimos 6 meses. Vermelho = mais caro (falta), verde = mais barato (sobra).</small>";
}

function techTreeHtml(all = false) {
  if (!active) return "";
  const r = eco.countries[active - 1].research, avail = new Set(available(r).map((t) => t.name));
  const lastEra = all ? ERAS.length - 1 : Math.min(ERAS.length - 1, r.era + 1); // tela cheia: todas as eras
  const L = techLayout(lastEra);
  const paths = techEdges(L).map((e) => `<path class="${r.known.has(e.from) ? (r.known.has(e.to) ? "k" : "a") : ""}" d="M${e.pts.map((p) => p.join(",")).join(" L")}"/>`).join("");
  const eras = Array.from({ length: lastEra + 1 }, (_, e) => e).map((e) => {
    const x = L.X(L.eraStart[e]) - TL.gx / 2, w = L.X(L.eraStart[e + 1]) - TL.gx / 2 - x;
    return `<div class="tera${e % 2 ? " odd" : ""}" style="left:${x}px;width:${w}px;height:${L.height}px"><span>${ERAS[e]}</span></div>`;
  }).join("");
  const areas = TECH_AREAS.map(([name], a) => `<div class="tband" style="top:${L.bandTop[a]}px;width:${L.width}px"><span>${name}</span></div>`).join("");
  const cards = L.ts.map((t) => {
    const st = r.known.has(t.name) ? "known" : avail.has(t.name) ? "avail" : "locked";
    const prog = r.progress.get(t.name) ?? 0;
    return `<div class="tcard ${st}${t.name === r.researching ? " cur" : ""}" style="left:${L.X(L.col.get(t.name)!)}px;top:${L.Y(t.name)}px;width:${TL.cw}px;height:${TL.ch}px" ${st === "avail" ? `data-tech="${t.name}"` : ""} title="${t.requires.length ? "Requer: " + t.requires.join(", ") : "Sem pré-requisitos"}">` +
      `<b>${artSVG("tech", t.name, 18)} ${t.name}</b><small>${st === "known" ? "conhecida" : fmt(t.cost) + " pts"}${prog && st !== "known" ? ` · ${pct(prog / t.cost)}` : ""}</small><small class="fx">${techEffect(t)}</small></div>`;
  }).join("");
  return (all ? "" : researchHtml(r, eco.countries[active - 1].researchWeek, true)) +
    `<div class="tscroll"><div class="tree" style="width:${L.width}px;height:${L.height}px">${eras}${areas}<svg class="tlines" width="${L.width}" height="${L.height}">${paths}</svg>${cards}</div></div>`;
}

let techCam = { x: 16, y: 16, z: 1 };
/** Tecnologia em tela cheia: o quadro é montado uma vez; a árvore dentro dele só muda quando a pesquisa muda. */
function techView(cat: HTMLElement) {
  let view = cat.querySelector<HTMLElement>(".tview");
  if (!view) {
    lastHtml.delete(cat);
    cat.innerHTML = `<div class="ttop"></div><div class="tview"><div class="tworld"></div></div>`;
    view = cat.querySelector<HTMLElement>(".tview")!;
    view.addEventListener("pointerdown", (ev) => { // arrastar com o botão esquerdo (clicar numa tecnologia continua pesquisando)
      if (ev.button !== 0 || (ev.target as HTMLElement).closest("[data-tech]")) return;
      const sx = ev.clientX - techCam.x, sy = ev.clientY - techCam.y;
      view!.setPointerCapture(ev.pointerId); view!.style.cursor = "grabbing";
      const move = (m: PointerEvent) => { techCam.x = m.clientX - sx; techCam.y = m.clientY - sy; placeTech(); };
      const up = () => { view!.removeEventListener("pointermove", move); view!.removeEventListener("pointerup", up); view!.style.cursor = ""; };
      view!.addEventListener("pointermove", move); view!.addEventListener("pointerup", up);
    });
    view.addEventListener("wheel", (ev) => { // zoom em volta do cursor
      ev.preventDefault();
      const r = view!.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
      const z = Math.min(2.5, Math.max(0.25, techCam.z * Math.exp(-ev.deltaY * 0.0015)));
      techCam.x = mx - ((mx - techCam.x) * z) / techCam.z; techCam.y = my - ((my - techCam.y) * z) / techCam.z; techCam.z = z;
      placeTech();
    }, { passive: false });
  }
  const r = active ? eco.countries[active - 1].research : null;
  setHtml(cat.querySelector(".ttop")!, `<h2>${icon("tech", 20)} Tecnologia <small>arraste para mover · roda do mouse para zoom</small> <button data-menu="tech" style="float:right" title="Fechar">${icon("close")}</button></h2>` +
    (r ? researchHtml(r, eco.countries[active - 1].researchWeek, true) : "<small>Escolha um país.</small>"));
  const world = cat.querySelector<HTMLElement>(".tworld")!, before = lastHtml.get(world);
  setHtml(world, techTreeHtml(true));
  if (lastHtml.get(world) !== before) hydrateIcons(world);
  placeTech();
}
function placeTech() {
  const world = document.querySelector<HTMLElement>("#catpanel .tworld");
  if (world) world.style.transform = `translate(${techCam.x}px, ${techCam.y}px) scale(${techCam.z})`;
}

/** Conteúdo de cada item do menu (no painel ao lado do menu). */
const CAT_VIEWS: Record<string, () => string> = {
  overview: () => overviewHtml(), people: () => societyHtml("pops"), economy: () => economyView(), build: () => buildingsHtml(),
  trade: () => tradeView(),
  diplomacy: () => diplomacyHtml(), politics: () => politicsTab(), tech: () => techTreeHtml(), military: () => militaryHtml(),
  admin: () => adminHtml(), society: () => societyHtml("culture"), charts: () => chartsHtml(),
};

function bottombarHtml() {
  const [hc, hr] = hover, hi = hr * W + hc;
  const hcity = inMap(hc, hr) ? cityOf(hi) : undefined;
  const hidden = inMap(hc, hr) && active > 0 && !explored.get(active)?.[hi];
  const info = hidden ? "Inexplorado" : inMap(hc, hr)
    ? `${TERRAINS[world.terrain[hi]].name}${world.seaZone[hi] ? ` · zona marítima ${world.seaZone[hi]}${deepOcean(world)[hi] ? " · oceano profundo (precisa de Navegação)" : ""}` : ""}${world.river[hi] ? (world.navigable[hi] ? " · rio navegável" : " · rio") : ""}${snowAt(world, hi, eco.week) ? " · neve" : ""} · ${CLIMATES[world.climate[hi]]} · ${RESOURCES[world.resource[hi]]}${world.resource2[hi] ? ` + ${RESOURCES[world.resource2[hi]]}` : ""}${world.reserve[hi] !== Infinity ? ` (jazida ~${Math.round(world.reserve[hi] / 52)} anos)` : ""} · pop ${Math.round(world.pop[hi])}` +
      (world.owner[hi] ? ` · ${world.countries[world.owner[hi] - 1].name}` + (mode === 6 ? ` (${eco.countries[world.owner[hi] - 1].research.known.size}/${TECHS.length} tecnologias)` : mode === 7 ? ` (satisfação ${Math.round(averageLoyalty(eco.countries[world.owner[hi] - 1].pops))}%)` : "") : "") + (hcity ? ` · mercado de ${hcity.name}` : "")
    : "";
  const room = mp ? ` · Sala ${mp.code}${mp.paused ? ` · pausado por ${mp.paused}${mp.votes ? ` (${mp.votes}/${mp.needed} votos)` : ""}` : ""}` : "";
  return `<button data-act="pause" title="Pausar / continuar (Espaço)">${icon(speed ? "pause" : "play")}</button>` +
    SPEEDS.slice(1).map((s, k) => `<button data-speed="${k + 1}" class="${speed === k + 1 ? "on" : ""}" title="${SPEED_NAMES[k + 1]}: ${+(s * ERA_WEEKS_PER_SECOND[worldEra()]).toFixed(3)} semana(s)/s">${s}×</button>`).join("") +
    `<span class="num">${timeLabel()}</span><span class="hover">${info}${room} · <span style="opacity:.6">${fps.toFixed(0)} FPS · semana ${tickMs.toFixed(1)} ms</span></span>` +
    `<div class="notes">${NOTE_CATS.map((c) => `<button data-notes="${c}" title="${c}">${icon(NOTE_ICON[c])}${unread[c] ? `<b>${unread[c]}</b>` : ""}</button>`).join("")}</div>`;
}

function overviewHtml() {
  if (!active) return "<i>Clique num país no mapa para governá-lo.</i>";
  const c = eco.countries[active - 1], card = (k: string, v: string) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  return `<div class="cards">${card("População", fmt(c.pop))}${card("PIB anual", fmt(c.gdpWeek * 52))}${card("Dívida", fmt(c.debt))}${card("Controle", pct(c.control ?? 1))}` +
    `${card("Recrutas", fmt(c.manpower))}${card("Infâmia", String(Math.round(c.infamy)))}${card("Cidades", String(eco.cities.filter((k) => k.country === active).length))}${card("Colonos", String(settlersOf(eco, active)))}</div>` +
    headerHtml() + warsHtml() + chronicleHtml(eventsOfCountry(eco, active), 25);
}
/** Crônica: acontecimentos registrados (mais recentes primeiro), com dia da semana e os personagens envolvidos. */
let chronFilter = "";
function chronicleHtml(all: Ev[], n: number) {
  if (!all.length) return "";
  const types = [...new Set(all.map((v) => v.t))], evs = chronFilter ? all.filter((v) => v.t === chronFilter) : all;
  const tabs = `<div class="tabs">${["", ...types].map((t) => `<button data-chronf="${t}" class="${t === chronFilter ? "on" : ""}">${t || "tudo"}</button>`).join(" ")}</div>`;
  const who = (id: number) => { const x = eco.characters?.find((y) => y.id === id); return x ? `<a data-char="${x.id}" style="cursor:pointer;text-decoration:underline dotted">${x.name}</a>` : ""; };
  return `<h3>${icon("book")} Crônica</h3>${tabs}<table>${evs.slice(-n).reverse().map((v) => `<tr><td><small>${WEEKDAYS[v.d].split("-")[0]}, ${dateLabel(v.w)}</small></td><td>${lifeText(world, v.x)}${v.c.length ? `<br><small>${v.c.map(who).filter(Boolean).join(", ")}</small>` : ""}</td></tr>`).join("")}</table>`;
}

// construção em massa (docs/construcoes.md): escolhas do jogador no painel
let mbB = 0, mbCity = -1, mbLevels = 1, mbPriv = false;
/** Hexes do país onde cabe mais `mbLevels` níveis da construção escolhida (na cidade escolhida ou em todas). */
function massTargets() {
  const out: number[] = [];
  for (const i of eco.owned) {
    if (world.owner[i] !== active || (mbCity >= 0 && eco.market[i] - 1 !== mbCity)) continue;
    let ok = true;
    for (let n = 0; n < mbLevels && ok; n++) ok = !canBuild(world, eco, i, mbB, queuedLevels(eco, i, mbB) + n);
    if (ok) out.push(i);
  }
  return out;
}

// ---- ficha de um edifício: métodos de produção (com comparação), dono e conta financeira (methods.ts, firms.ts)
let openSheet = "";
/** Efeito de um método em texto curto (para comparar). */
function methodEffect(m: Method) {
  const parts: string[] = [];
  if (m.out) parts.push(`${m.out > 0 ? "+" : ""}${Math.round(m.out * 100)}% produção`);
  if (m.workers && m.workers !== 1) parts.push(`×${m.workers} trabalhadores`);
  if (m.upkeep && m.upkeep !== 1) parts.push(`×${m.upkeep} manutenção`);
  if (m.inputs?.length) parts.push(`usa ${m.inputs.map(([g, q]) => `${q} ${g}`).join(" + ")} por nível`);
  if (m.extra?.length) parts.push(`faz ${m.extra.map(([g, q]) => `${q} ${g}`).join(" + ")} por nível`);
  if (m.divShare !== undefined) parts.push(m.state ? "lucro ao tesouro" : `${Math.round(m.divShare * 100)}% do lucro em dividendos`);
  return parts.join(", ") || "sem efeito extra";
}
function sheetHtml(i: number, b: number) {
  const key = methodKey(i, b), def = BUILDINGS[b], lv = eco.levels[b][i], known = eco.countries[active - 1].research.known;
  const act = activeMethods(eco, key, def.name, known), pick = eco.methods?.get(key);
  const meth = methodsOf(def.name).map((list, cat) => {
    if (list.length < 2) return "";
    const cur = pick?.[cat] ?? -1;
    const opts = `<option value="-1"${cur < 0 ? " selected" : ""}>Automático (${act[cat].name})</option>` +
      list.map((m, k) => `<option value="${k}"${cur === k ? " selected" : ""}${m.tech && !known.has(m.tech) ? " disabled" : ""} title="${methodEffect(m)}">${m.name}${m.tech && !known.has(m.tech) ? ` (${m.tech})` : ""}</option>`).join("");
    return `<tr><td><small>${CATEGORIES[cat]}</small></td><td><select data-meth="${i}|${b}|${cat}">${opts}</select><br><small style="color:var(--dim)">${methodEffect(act[cat])}</small></td>` +
      `<td><button data-methall="${b}|${cat}|${cur}" title="Usa esta escolha em todos os edifícios ${def.name} do país">Em todos</button></td></tr>`;
  }).join("");
  const l = ledgerOf(eco, key);
  if (!l) return `<div class="card"><table>${meth}</table><small>A conta aparece depois da primeira semana.</small></div>`;
  const row = (n: string, v: number, cls = "") => `<tr><td>${n}</td><td class="${cls}">${signed(v)}</td></tr>`;
  const hist = l.hist.length > 1 ? (() => { const mx = Math.max(1e-9, ...l.hist.map(Math.abs)); return `<svg width="160" height="30" style="display:block"><line x1="0" y1="15" x2="160" y2="15" stroke="#555"/><polyline fill="none" stroke="#c9a45c" points="${l.hist.map((v, k) => `${(k / (l.hist.length - 1)) * 160},${15 - (v / mx) * 14}`).join(" ")}"/></svg>`; })() : "";
  return `<div class="card"><b>${def.name}</b> nível ${lv} · ${lv - l.priv} estatal/comunitário · ${l.priv} privado · desde a semana ${l.built}` +
    ` <button data-privatize="${i}|${b}" title="Vende 1 nível ao fundo de investimento por ${FIRM.privatizeValue * 100}% do valor">Privatizar 1</button>` +
    (l.priv ? ` <button data-nationalize="${i}|${b}" title="Compra 1 nível privado indenizando os donos; investidores não gostam (legitimidade)">Nacionalizar 1</button>` : "") +
    `<br><small>${fmt(l.workers)} empregados · produz ${fmt(l.produced)} por semana</small>` +
    `<table>${meth}</table>` +
    `<table>${row("Receita", l.rev)}${row("Insumos", -l.inputs)}${row("Salários", -l.wages)}${row("Manutenção", -l.upkeep)}${row("Impostos", -l.tax)}${row("Lucro", l.profit, l.profit < 0 ? "up" : "down")}` +
    `<tr><td>Reserva</td><td>${fmt(l.reserve)}</td></tr><tr><td>Dívida</td><td class="${l.debt > 0 ? "up" : ""}">${fmt(l.debt)}</td></tr>` +
    `${l.div ? row("Dividendos", l.div) : ""}${l.reinvest ? row("Reinvestido (fundo)", l.reinvest) : ""}${l.toState ? row("Para o tesouro", l.toState) : ""}</table>` +
    `<small>Lucro das últimas ${l.hist.length} semanas</small>${hist}` + (l.log?.length ? `<small>${l.log.join("<br>")}</small>` : "") + `</div>`;
}

// ---- Edifícios e Produção (Etapa 8): lista de todos os edifícios do país, filtros, ordenação e métodos em massa
let bTab = 0, bFilter = 0, bSort = "-profit", bpCat = 3, bpK = -1;
const bSel = new Set<string>();
const B_FILTERS = ["Todos", "Agricultura", "Extração", "Indústria", "Infraestrutura", "Administração", "Naval", "Militar", "Estatais", "Privadas"] as const;
const AGRI = new Set(["Fazenda", "Irrigação", "Pasto", "Estábulo", "Acampamento de caça"]);
type BRow = { key: string; hex: number; b: number; lv: number; city: string; workers: number; vagas: number; prod: number; productivity: number; profit: number; owner: string; status: string; priv: number };
function buildingRows(): BRow[] {
  const known = eco.countries[active - 1].research.known, out: BRow[] = [];
  for (const i of eco.owned) {
    if (world.owner[i] !== active) continue;
    for (let b = 0; b < BUILDINGS.length; b++) {
      const lv = eco.levels[b][i];
      if (!lv) continue;
      const def = BUILDINGS[b], key = methodKey(i, b), l = ledgerOf(eco, key), name = def.name;
      const ind = !!def.industry, naval = !!def.industry?.naval, admin = !!def.industry && !def.industry.outputs.length && !naval;
      const f = B_FILTERS[bFilter], priv = l?.priv ?? 0;
      if (f === "Agricultura" && !AGRI.has(name)) continue;
      if (f === "Extração" && (ind || AGRI.has(name))) continue;
      if (f === "Indústria" && (!ind || naval || admin)) continue;
      if (f === "Infraestrutura" && name !== "Setor de construção" && def.boosts === undefined) continue;
      if (f === "Administração" && name !== "Centro administrativo") continue;
      if (f === "Naval" && !naval) continue;
      if (f === "Militar" && !MILITARY.has(name)) continue;
      if (f === "Estatais" && priv) continue;
      if (f === "Privadas" && !priv) continue;
      const org = activeMethods(eco, key, name, known, lawOf(eco.countries[active - 1].politics, "Economia").defaultOrg)[3];
      const vagas = lv * def.workers * combine(activeMethods(eco, key, name, known)).workers;
      const status = !l ? "novo" : l.workers < vagas * 0.05 ? "parado (sem gente)" : l.debt > 0 ? "endividado" : l.profit < 0 ? "prejuízo" : "operando";
      out.push({ key, hex: i, b, lv, city: eco.cities[eco.market[i] - 1]?.name ?? "—", workers: l?.workers ?? 0, vagas, prod: l?.produced ?? 0,
        productivity: l && vagas ? l.workers / vagas : 0, profit: l?.profit ?? 0, owner: `${priv ? (priv === lv ? "privado" : "misto") : "estatal/comunitário"} · ${org.name}`, status, priv });
    }
  }
  const [desc, col] = bSort.startsWith("-") ? [-1, bSort.slice(1)] : [1, bSort];
  const val = (r: BRow) => (col === "name" ? BUILDINGS[r.b].name : (r as unknown as Record<string, number | string>)[col]);
  return out.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * desc; });
}
function edificiosHtml() {
  const rows = buildingRows(), shown = rows.slice(0, 150);
  const known = eco.countries[active - 1].research.known;
  const th = (col: string, n: string) => `<td><b data-bsort="${col}" style="cursor:pointer">${n}${bSort.replace("-", "") === col ? (bSort.startsWith("-") ? " ▼" : " ▲") : ""}</b></td>`;
  const table = `<table><tr><td></td>${th("name", "Edifício")}${th("city", "Local")}${th("lv", "Nv")}${th("workers", "Empregos")}${th("productivity", "Ocupação")}${th("prod", "Produção")}${th("profit", "Lucro")}<td><b>Dono · organização</b></td>${th("status", "Estado")}</tr>` +
    shown.map((r) => `<tr><td><input type="checkbox" data-bsel="${r.key}"${bSel.has(r.key) ? " checked" : ""}></td><td><button data-goto="${r.hex}" data-sheetkey="${r.key}" title="Ver no mapa e abrir a ficha">${artSVG("building", BUILDINGS[r.b].name, 16)} ${BUILDINGS[r.b].name}</button></td><td><small>${r.city}</small></td><td>${r.lv}</td>` +
      `<td>${fmt(r.workers)}/${fmt(r.vagas)}</td><td>${pct(r.productivity)}</td><td>${fmt(r.prod)}</td><td class="${r.profit < 0 ? "up" : "down"}">${signed(r.profit)}</td><td><small>${r.owner}</small></td><td><small>${r.status}</small></td></tr>`).join("") + `</table>` +
    (rows.length > shown.length ? `<small>Mostrando ${shown.length} de ${rows.length}: use os filtros e a ordenação.</small>` : "");
  // métodos em massa com prévia do impacto (trabalhadores e produção) antes de aplicar
  let mass = "";
  if (bSel.size) {
    const sel = [...bSel].map((key) => key.split(":").map(Number) as [number, number]).filter(([h, b]) => eco.levels[b]?.[h]);
    const types = new Set(sel.map(([, b]) => BUILDINGS[b].name)), one = types.size === 1 ? [...types][0] : null;
    const cats = CATEGORIES.map((n, k) => [n, k] as const).filter(([, k]) => one || k >= 3); // tipos diferentes: só organização e manutenção são comuns
    if (!cats.some(([, k]) => k === bpCat)) bpCat = cats[0][1];
    const list = methodsOf(one ?? BUILDINGS[sel[0][1]].name)[bpCat];
    let dW = 0, dOut = 0, n = 0;
    for (const [h, b] of sel) {
      const key = methodKey(h, b), cur = activeMethods(eco, key, BUILDINGS[b].name, known), next = [...cur];
      const lst = methodsOf(BUILDINGS[b].name)[bpCat], m = bpK >= 0 ? lst.find((x) => x.name === list[bpK]?.name) : undefined;
      if (bpK >= 0 && (!m || (m.tech && !known.has(m.tech)))) continue;
      next[bpCat] = m ?? next[bpCat];
      const a = combine(cur), z = combine(next), lv = eco.levels[b][h], def = BUILDINGS[b];
      dW += lv * def.workers * (z.workers - a.workers); dOut += (ledgerOf(eco, key)?.produced ?? 0) * ((1 + z.out) / (1 + a.out) - 1); n++;
    }
    mass = `<div class="card"><b>${bSel.size} selecionado${bSel.size > 1 ? "s" : ""}</b> <button data-act="bselnone">Limpar</button><br>` +
      `<select id="bp-cat">${cats.map(([nm, k]) => `<option value="${k}"${k === bpCat ? " selected" : ""}>${nm}</option>`).join("")}</select> ` +
      `<select id="bp-k"><option value="-1"${bpK < 0 ? " selected" : ""}>Automático</option>${list.map((m, k) => `<option value="${k}"${k === bpK ? " selected" : ""}${m.tech && !known.has(m.tech) ? " disabled" : ""}>${m.name} — ${methodEffect(m)}</option>`).join("")}</select>` +
      `<br><small>Impacto estimado em ${n} edifício${n === 1 ? "" : "s"}: trabalhadores ${dW >= 0 ? "+" : ""}${fmt(dW)} · produção ${dOut >= 0 ? "+" : ""}${fmt(dOut)}/semana (insumos extras do método não incluídos)</small> <button data-act="bapply">Aplicar</button></div>`;
  }
  return `<div class="tabs">${B_FILTERS.map((f, k) => `<button data-bfilter="${k}" class="${k === bFilter ? "on" : ""}">${f}</button>`).join(" ")}</div>` +
    `<small>${rows.length} edifícios · <button data-act="bselall">Selecionar todos os ${Math.min(rows.length, 150)} da lista</button></small>` + mass + table;
}

function buildingsHtml() {
  if (!active) return "";
  const tabs = `<div class="tabs">${["Obras e construção em massa", "Edifícios e Produção"].map((n, k) => `<button data-btab="${k}" class="${k === bTab ? "on" : ""}">${n}</button>`).join(" ")}</div>`;
  if (bTab === 1) return tabs + edificiosHtml();
  return tabs + obrasHtml();
}
function obrasHtml() {
  const c = eco.countries[active - 1], q = queueOf(eco, active);
  const total = BUILDINGS.map((_, b) => { let n = 0; for (const i of eco.owned) if (world.owner[i] === active) n += eco.levels[b][i]; return n; });
  const rows = BUILDINGS.map((b, k) => (total[k] ? `<tr><td>${b.name}</td><td>${total[k]}</td><td>${b.workers * total[k]}</td></tr>` : "")).join("");
  const method = CONSTRUCTION_METHODS[sectorMethod(eco, active)], base = baseCp(eco, active);
  const cap = `<div class="card"><b>Capacidade de construção</b>: ${fmt(c.cpWeek ?? 0)} PC/semana <small>(comunidade ${base} + setores ${fmt(Math.max(0, (c.cpWeek ?? 0) - base))})</small> · usados ${fmt(c.cpUsed ?? 0)}` +
    `<br><small>Método dos setores: ${method.name} (${method.inputs.map(([g, n]) => `${n} ${g}`).join(" + ")} → ${method.cp} PC por nível) · fila privada ${pct(privateShare(eco, active))} da capacidade (lei de Economia) · fundo de investimento ${fmt(c.investPool ?? 0)}</small>` +
    `<br><small>Cada obra recebe até ${fmt(CONSTRUCT.maxPerProject * (1 + c.research.era / 2))} PC por semana; o dinheiro sai junto com o progresso.</small></div>`;
  const qrows = q.map((p) => {
    const city = eco.cities[eco.market[p.hex] - 1], eta = etaWeeks(eco, p);
    return `<tr><td>${artSVG("building", BUILDINGS[p.b].name, 16)} ${BUILDINGS[p.b].name}<br><small>${city?.name ?? "—"} · ${p.priv ? "privada" : "pública"}</small></td>` +
      `<td><div style="width:70px;height:5px;background:var(--line,#333);border-radius:3px"><div style="height:5px;border-radius:3px;background:var(--accent,#c9a45c);width:${Math.round((p.done / p.cp) * 100)}%"></div></div><small>${fmt(p.cp - p.done)} PC</small></td>` +
      `<td>${fmt(p.cost - p.paid)}</td><td><small>${p.paused ? "pausada" : p.waiting ?? (Number.isFinite(eta) ? `~${eta} sem.` : "—")}</small></td>` +
      `<td><button data-pausebuild="${p.id}">${p.paused ? "Retomar" : "Pausar"}</button> <button data-cancelbuild="${p.id}">Cancelar</button></td></tr>`;
  }).join("");
  const queue = `<h3>Obras (${q.length})</h3>` + (q.length ? `<table><tr><td><b>Obra</b></td><td><b>Progresso</b></td><td><b>Falta pagar</b></td><td><b>Previsão</b></td><td></td></tr>${qrows}</table>` : "<small>Nenhuma obra. Clique num hex seu ou use a construção em massa.</small>");
  // construção em massa
  const targets = massTargets(), n = targets.length * mbLevels;
  let money = 0;
  for (const i of targets) for (let k = 0; k < mbLevels; k++) money += RULES.buildCost * (eco.levels[mbB][i] + queuedLevels(eco, i, mbB) + k + 1);
  const cps = n * cpCost(mbB), weeks = (c.cpWeek ?? 0) > 0 ? Math.ceil(cps / (c.cpWeek ?? 1)) : Infinity;
  const tech = techFor(mbB), locked = tech && !c.research.known.has(tech);
  const mass = `<h3>Construção em massa</h3><div class="card">` +
    `<select id="mb-b">${BUILDINGS.map((b, k) => `<option value="${k}"${k === mbB ? " selected" : ""}>${b.name}</option>`).join("")}</select> ` +
    `<select id="mb-city"><option value="-1">Todas as cidades</option>${eco.cities.map((k, ci) => (k.country === active ? `<option value="${ci}"${ci === mbCity ? " selected" : ""}>${k.name}</option>` : "")).join("")}</select> ` +
    `níveis por hex <input id="mb-levels" type="number" min="1" max="50" value="${mbLevels}" style="width:48px"> ` +
    `<label><input id="mb-priv" type="checkbox"${mbPriv ? " checked" : ""}> fila privada</label>` +
    `<br><small>${BUILDINGS[mbB].industry ? "Indústria: só em centro urbano." : BUILDINGS[mbB].boosts !== undefined ? `Melhoria: precisa de ${BUILDINGS[BUILDINGS[mbB].boosts!].name} no hex.` : `Extratora: hex com ${BUILDINGS[mbB].for.map((g) => GOODS[g]).join(", ")}.`} ${BUILDINGS[mbB].workers} trabalhadores e ${cpCost(mbB)} PC por nível.${locked ? ` <span class="bad">Precisa pesquisar ${tech}.</span>` : ""}</small>` +
    `<br>Hexes elegíveis: <b>${targets.length}</b> · obras: <b>${n}</b> · custo ${fmt(money)} · ${fmt(cps)} PC · ~${Number.isFinite(weeks) ? weeks : "∞"} semanas com a capacidade atual` +
    (n ? ` <button data-act="massbuild">Pôr ${n} obra${n > 1 ? "s" : ""} na fila</button>` : "") + ` <button data-act="massmap" title="Camada Construção: verde elegível, amarelo limite ou já existe, vermelho inválido">Ver no mapa</button></div>`;
  const ships = navalQueueOf(eco, active).map((o) => `<tr><td>${o.ship}<br><small>${eco.cities[o.city]?.name ?? "—"}</small></td><td>${Math.round((o.done / o.np) * 100)}%<br><small>${fmt(o.np - o.done)} PN</small></td><td>${fmt(o.cost - o.paid)}</td><td><small>${o.waiting ?? ""}</small></td><td><button data-cancelship="${o.id}">Cancelar</button></td></tr>`).join("");
  const naval = ships ? `<h3>Estaleiros: navios encomendados</h3><table><tr><td><b>Navio</b></td><td><b>Progresso</b></td><td><b>Falta pagar</b></td><td></td><td></td></tr>${ships}</table>` : "";
  return cap + queue + naval + mass + `<h3>Construções do país</h3><table><tr><td><b>Construção</b></td><td><b>Níveis</b></td><td><b>Vagas</b></td></tr>${rows}</table>` +
    `<br><button data-act="settlers" title="Cria um grupo de colonos na capital">Treinar colonos (${RULES.settlerCost} + ${RULES.settlerPop} pessoas)</button>`;
}

function diplomacyHtml() {
  if (!active) return "";
  return diplomatHtml() + diplomacyBody();
}
/** Diplomata do país: o atual (com o bônus que dá) ou três candidatos para escolher. */
let hiringDip = false;
function diplomatHtml() {
  const d = diplomatOf(eco, active), era = eco.countries[active - 1].research.era;
  const head = d ? `<div class="card" style="display:flex;gap:8px">${portraitSVG(d, era, 48)}<div><b data-char="${d.id}" style="cursor:pointer">Diplomata ${d.name}</b><br><small>diplomacia ${skill(d, "dip")} · ${d.personality ?? ""} · ${diplomatBonus(eco, active) >= 0 ? "+" : ""}${diplomatBonus(eco, active)} por gesto de relação e na tolerância dos acordos</small></div></div>` : "<small>Sem diplomata: relações melhoram só pelo valor base.</small>";
  if (!hiringDip) return head + ` <button data-act="hire-dip">${d ? "Trocar" : "Nomear"} diplomata (${DIPLOMAT.cost})</button>`;
  return head + `<h3>Escolha um de três candidatos</h3><div class="bcards" style="grid-template-columns:repeat(3,1fr)">` + diplomatCandidates(world, eco, active).map((c, k) =>
    `<div class="bcard" style="cursor:default">${portraitSVG(c, era, 56)}<b>${c.name}</b><small>${ageOf(c, eco.week)} anos · ${c.personality}</small><small>diplomacia <b>${skill(c, "dip")}</b> · adm ${skill(c, "adm")}</small><small>${c.traits.join(", ")}</small><button data-hiredip="${k}">Nomear</button></div>`).join("") + `</div><button data-act="hire-dip">Cancelar</button>`;
}
function diplomacyBody() {
  const known = new Set<number>([...(eco.contacts?.[active - 1] ?? [])]);
  for (let k = 1; k <= eco.countries.length; k++) if (k !== active && (atWar(eco, active, k) || hasPact(eco, active, k) || relation(eco, active, k) !== 0)) known.add(k);
  const rows = [...known].sort((a, b) => relation(eco, active, b) - relation(eco, active, a)).map((k) => {
    const r = relation(eco, active, k), sub = subjectOf(eco, k), theirClaims = (eco.claims ?? []).filter((c) => c.country === k && eco.cities[c.city]?.country === active).length;
    const link = sub?.overlord === active ? `<br><small>${sub.kind} seu · autonomia ${Math.round(sub.autonomy)}</small> <button data-free="${k}">Soltar</button>`
      : sub ? `<br><small>${sub.kind} de ${world.countries[sub.overlord - 1].name}</small>`
      : !subjectOf(eco, active) ? `<br><small>Propor:</small> ${(Object.keys(SUBJECT_KINDS) as SubjectKind[]).map((kind) => `<button data-subject="${k}|${kind}" title="${SUBJECT_KINDS[kind].desc} Precisa de relação ${SUBJECT_KINDS[kind].relationMin} e ${SUBJ.prestigeRatio}× o prestígio deles.">${kind}</button>`).join(" ")}` : "";
    return `<tr><td><img src="${flagURL(flagOf(k))}" width="21" height="14" style="vertical-align:-2px"> ${world.countries[k - 1].name}${atWar(eco, active, k) ? ' <span class="bad">guerra</span>' : hasPact(eco, active, k) ? " <small>acordo</small>" : ""}${link}<br><small style="color:var(--dim)">${personality(world, eco, k)}${theirClaims ? ` · <span class="warn">reivindica ${theirClaims} cidade${theirClaims > 1 ? "s" : ""} sua${theirClaims > 1 ? "s" : ""}</span>` : ""}${hasClaimOn(eco, active, k) ? " · você reivindica terra deles" : ""}</small><br><small style="color:var(--dim)">Quer: ${desires(world, eco, k).slice(0, 2).map((x) => lifeText(world, x)).join("; ") || "—"}</small></td>` +
      `<td class="${r < 0 ? "up" : "down"}">${Math.round(r)}</td><td>${prestige(eco, k)}</td><td><button data-improve="${k}" title="+${DIPLO.improve} de relação por ${DIPLO.improveCost} pontos administrativos">Melhorar</button></td></tr>`;
  }).join("");
  const me = subjectOf(eco, active);
  const inbox = proposalsTo(eco, active).map((p) => `<div class="card"><b>${world.countries[p.from - 1].name}</b> propõe ${p.kind === "pact" ? "um acordo comercial" : `que você seja ${p.subject}`}` +
    ` <small>(vence em ${PROPOSAL_WEEKS - (eco.week - p.week)} semanas)</small><br><button data-respond="${p.id}|1">Aceitar</button> <button data-respond="${p.id}|0">Recusar</button></div>`).join("");
  const votes = (eco.votes ?? []).map((v) => `<div class="card">Renomear ${v.river ? "o rio" : "o continente"} <b>${(v.river ? world.rivers : world.continents)?.[v.continent - 1]?.name ?? "?"}</b> para <b>${v.name}</b>? <small>sim ${v.yes.length} · não ${v.no.length} de ${eco.humans.length}</small><br>` +
    `<button data-vote="${v.id}|1" class="${v.yes.includes(active) ? "on" : ""}">Sim</button> <button data-vote="${v.id}|0" class="${v.no.includes(active) ? "on" : ""}">Não</button></div>`).join("");
  return (inbox ? `<h3>Propostas recebidas</h3>${inbox}` : "") + (votes ? `<h3>Votações</h3>${votes}` : "") + (me ? `<div class="card">Você é <b>${me.kind}</b> de ${world.countries[me.overlord - 1].name} · autonomia ${Math.round(me.autonomy)}/100 <small>(em 100 você se solta sozinho)</small> <button data-act="independence" title="Romper agora: a relação com o soberano despenca">Romper</button></div>` : "") +
    (claimsOf(eco, active).length ? `<h3>Suas reivindicações</h3><table>${claimsOf(eco, active).map((c) => `<tr><td>${eco.cities[c.city].name} <small>(${world.countries[eco.cities[c.city].country - 1].name})</small></td><td>${c.type}</td><td>força ${Math.round(c.strength)}</td></tr>`).join("")}</table><small>Guerra contra quem você reivindica dá metade da infâmia.</small>` : "") +
    `<table><tr><td><b>País</b></td><td><b>Relação</b></td><td><b>Prestígio</b></td><td></td></tr>${rows}</table>` +
    (known.size ? "" : "<small>Ninguém conhecido ainda: vizinhos e parceiros aparecem aqui.</small>");
}

// ---- batalhas (battle.ts): lista e tela com as duas linhas e o histórico de rolagens
let openBattle = 0;
function battleHtml(b: Battle) {
  const nameOf = (k: number) => world.countries[k - 1]?.name ?? "?";
  const city = eco.market[b.hex] && eco.cities[eco.market[b.hex] - 1]?.hex === b.hex ? eco.cities[eco.market[b.hex] - 1].name : null;
  const side = (k: number) => b.naval ? eco.divisions.filter((d) => d.kind === "fleet" && d.country === k && world.seaZone[d.hex] === world.seaZone[b.hex])
    : eco.divisions.filter((d) => d.kind === "army" && d.country === k && (d.hex === b.hex || d.target === b.hex));
  const line = (k: number) => {
    const { front, reserve } = b.naval ? { front: side(k), reserve: [] as Division[] } : deploy(side(k), b.frontage, WAR.divisionSize); // no mar não há largura de frente
    const row = (ds: Division[]) => ds.map((d) => `<span title="${statsOf(d).name}: ${Math.round(d.strength)} soldados, org. ${pct(d.org)}, moral ${pct(d.morale ?? 1)}" style="display:inline-block;width:${Math.max(8, Math.min(40, widthOf(d, WAR.divisionSize) * 2))}px;height:12px;margin:1px;background:${d.org >= BATTLE.broken ? "var(--blue)" : "#555"};opacity:${0.4 + 0.6 * d.org}"></span>`).join("") || "<small>—</small>";
    return `<div><small>Frente</small> ${row(front)}</div><div><small>Reserva</small> ${row(reserve)}</div>`;
  };
  const mods = (m: [string, number][]) => m.map(([n, v]) => `${n} ${v > 0 ? "+" : ""}${v}`).join(", ") || "sem modificadores";
  const rows = [...b.log].reverse().map((r) => `<tr><td><small>sem. ${r.week} · ${r.round}ª · ${r.phase}</small></td><td><small>dado ${r.att.roll} (${mods(r.att.mods)}) = <b>${r.att.total}</b></small></td><td><small>dado ${r.def.roll} (${mods(r.def.mods)}) = <b>${r.def.total}</b></small></td><td><small>${r.text}</small></td></tr>`).join("");
  return `<div class="card"><b>${b.naval ? `Batalha naval na zona marítima ${world.seaZone[b.hex]}` : `Batalha ${city ? `de ${city}` : `em ${TERRAINS[world.terrain[b.hex]].name.toLowerCase()} (${b.hex % W}, ${(b.hex / W) | 0})`}`}</b> · ${b.state} <button data-battle="0" style="float:right">Fechar</button>` +
    `<br><small>Desde a semana ${b.start} · ${b.naval ? `mar ${seaWeather(world, b.hex, eco.week)}` : `frente de ${Math.round(b.frontage)}`} (${b.dirs} direç${b.dirs > 1 ? "ões" : "ão"} de ataque) · fogo pesa ${pct(BATTLE.fireShare[Math.max(eco.countries[b.attacker - 1].research.era, eco.countries[b.defender - 1].research.era)])}</small>` +
    `<table><tr><td><b>Atacante: ${nameOf(b.attacker)}</b><br><small>${Math.round(b.startAtt)} soldados no início · ${Math.round(b.deadAtt)} baixas</small>${line(b.attacker)}</td>` +
    `<td><b>Defensor: ${nameOf(b.defender)}</b><br><small>${Math.round(b.startDef)} soldados no início · ${Math.round(b.deadDef)} baixas</small>${line(b.defender)}</td></tr></table>` +
    `<h3>Rolagens</h3><table><tr><td></td><td><b>Atacante</b></td><td><b>Defensor</b></td><td><b>Resultado</b></td></tr>${rows}</table></div>`;
}

function militaryHtml() {
  if (!active) return "";
  const mine = eco.divisions.filter((d) => d.country === active);
  const rows = mine.map((d) => `<tr><td><button data-select-div="${d.id}">${d.kind === "army" ? unitOf(d.unit).name : KIND_NAMES[d.kind]?.replace(/s$/, "") ?? d.kind} ${d.id}</button>${d.general ? " <small>(general)</small>" : ""}</td><td>${fmt(d.strength)}</td><td>${pct(d.org)}</td><td>${d.target === null ? "parada" : "em marcha"}</td></tr>`).join("");
  const c = eco.countries[active - 1], lv = c.warEconomy ?? 0;
  const econ = `<h3>Economia de guerra</h3><div class="card">${WAR_ECONOMY.map((n, k) => `<button data-wareco="${k}" class="${k === lv ? "on" : ""}">${n}</button>`).join(" ")}` +
    `<br><small>${["Mercado livre; produção militar só por encomenda.", `Indústria militar +${WAR_ECON.military[1] * 100}% (subsídio de ${WAR_ECON.subsidy[1] * 100}% da receita), bens estratégicos não são exportados, fila privada com metade da capacidade, legitimidade −${WAR_ECON.legitimacyWeek[1]}/sem (o dobro sem guerra).`, `Indústria militar +${WAR_ECON.military[2] * 100}%, bens civis ${WAR_ECON.civilian[2] * 100}%, fila privada parada, lucro das empresas requisitado pelo tesouro, preços estratégicos tabelados, legitimidade −${WAR_ECON.legitimacyWeek[2]}/sem. Só durante uma guerra.`][lv]}</small>` +
    (lv ? `<br><label><input type="checkbox" data-conversion="1"${c.conversion ? " checked" : ""}> Converter a indústria: ${Object.entries(CONVERSIONS).map(([b, o]) => `${b} → ${o.map(([n, q]) => `${q} ${n}`).join(" + ")}`).join("; ")}</label>` : "") +
    `<br><small>Subsídio militar na semana: ${fmt(c.warSubsidy ?? 0)}</small></div>`;
  const mineB = (eco.battles ?? []).filter((b) => b.attacker === active || b.defender === active);
  const ob = mineB.find((b) => b.id === openBattle);
  const blist = mineB.length ? `<h3>Batalhas</h3>` + mineB.slice().reverse().map((b) => `<button data-battle="${b.id}" class="${b.id === openBattle ? "on" : ""}">${b.state === "combate" ? icon("military", 14) + " " : ""}${world.countries[b.attacker - 1].name} × ${world.countries[b.defender - 1].name} · sem. ${b.start}${b.state !== "combate" ? ` (${b.state})` : ""}</button>`).join(" ") : "";
  return warsHtml() + blist + (ob ? battleHtml(ob) : "") + econ + `<h3>Forças</h3><table><tr><td><b>Unidade</b></td><td><b>Força</b></td><td><b>Org.</b></td><td><b>Ordem</b></td></tr>${rows}</table>` + (mine.length ? "" : "<small>Sem unidades: recrute numa cidade sua.</small>");
}

function adminHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1];
  const inc = (eco.incentives ?? []).filter((x) => eco.cities[x.city]?.country === active);
  return `<div class="cards"><div class="card"><div class="k">Pontos administrativos</div><div class="v">${Math.floor(c.admin ?? 0)} / ${adminCap(eco, active)}</div></div>` +
    `<div class="card"><div class="k">Por semana</div><div class="v">${signed(c.adminWeek ?? 0)}</div></div><div class="card"><div class="k">Controle médio</div><div class="v">${pct(c.control ?? 1)}</div></div><div class="card" title="Instituições, letrados, urbanização, diversidade e classes: encarece incentivos; tecnologias de registros e burocracia barateiam"><div class="k">Complexidade Social</div><div class="v">${countrySocialComplexity(eco, active)}</div></div><div class="card" title="Cadeias produtivas e tecnologias: encarece construções sofisticadas"><div class="k">Complexidade da Economia</div><div class="v">${Math.round(c.complexity ?? 0)}</div></div></div>` +
    `<h3>Incentivos ativos</h3>` + (inc.length ? `<table>${inc.map((x) => `<tr><td>${x.kind}</td><td>${x.state !== undefined ? eco.states.find((s) => s.id === x.state)?.name ?? "estado" : eco.cities[x.city].name}</td><td><small>${pct(progressOf(eco, x))}</small></td><td><button data-incentive="${x.kind}|${x.state !== undefined ? `s:${x.state}` : `c:${x.city}`}|off">Encerrar</button></td></tr>`).join("")}</table>` : "<small>Nenhum. Clique numa cidade sua para criar.</small>") +
    `<h3>Estados</h3>` + (statesOf(eco, active).map((s) => `<div>${s.name} · ${s.interest} ${s.happy ? "" : '<span class="bad">insatisfeito</span>'}</div>`).join("") || "<small>Nenhum estado.</small>");
}

/** Troca o conteúdo só se mudou, e nunca enquanto o jogador mexe num campo de dentro (select aberto, número sendo digitado). */
const lastHtml = new WeakMap<Element, string>();
function setHtml(el: Element, html: string) {
  if (lastHtml.get(el) === html) return;
  const f = document.activeElement;
  if (f && el.contains(f) && (f instanceof HTMLSelectElement || f instanceof HTMLInputElement)) return;
  lastHtml.set(el, html); el.innerHTML = html;
}
function updateUI() {
  setHtml(document.getElementById("topbar")!, topbarHtml());
  setHtml(document.getElementById("maptools")!, maptoolsHtml());
  setHtml(document.getElementById("modebar")!, modebarHtml());
  setHtml(document.getElementById("leftmenu")!, leftmenuHtml());
  const cat = document.getElementById("catpanel")!, title = MENU.find(([k]) => k === menuCat)?.[1];
  cat.className = menuCat === "tech" ? "full" : menuCat === "economy" || menuCat === "charts" ? "wide" : "";
  if (menuCat === "tech") techView(cat); // tela cheia com arrastar e zoom: não é redesenhada a cada atualização
  else setHtml(cat, menuCat && title ? `<h2>${icon(menuCat, 20)} ${title} <button data-menu="${menuCat}" style="float:right" title="Fechar">${icon("close")}</button></h2>` + CAT_VIEWS[menuCat]() : "");
  group = group.filter((id) => eco.divisions.some((d) => d.id === id));
  if (selectedDiv && !eco.divisions.some((d) => d.id === selectedDiv)) selectedDiv = group[0] ?? null; // destruída
  const ch = selectedChar !== null ? eco.characters?.find((x) => x.id === selectedChar) : undefined;
  const show = selected >= 0 || selectedDiv || ch || special;
  if (special && !ch) setHtml(panel, specialPanelHtml());
  else setHtml(panel, show ? `<button data-act="close-panel" style="float:right" title="Fechar">${icon("close")}</button>` + (ch ? charProfileHtml(ch) : selectedDiv ? divisionHtml() : hexHtml()) : ""); // tropa e personagem têm painel próprio
  setHtml(document.getElementById("bottombar")!, bottombarHtml());
  hydrateIcons(document.body); // marcadores <i class=i-…> viram SVG
  if (performance.now() >= hudMsgUntil) document.getElementById("toast")!.style.display = "none";
  const chart = document.getElementById("gdp") as HTMLCanvasElement | null;
  if (chart && active) drawChart(chart, eco.countries[active - 1].gdpHistory);
  const hist = active ? eco.countries[active - 1].history ?? {} : {};
  for (const [id, key] of [["ch-treasury", "Tesouro"], ["ch-debt", "Dívida"], ["ch-good", "$" + goodDetail]] as const) {
    const cv = document.getElementById(id) as HTMLCanvasElement | null;
    if (cv) drawChart(cv, hist[key] ?? []);
  }
  const series = document.getElementById("series") as HTMLCanvasElement | null;
  if (series && active) drawChart(series, eco.countries[active - 1].history?.[chartKey] ?? []);
}

/** Resumo do país sempre visível no topo do painel. */
function headerHtml() {
  if (!active) return net ? "<i>Clique num país livre e use \"Assumir este país\".</i>" : "<i>Clique num país para controlá-lo.</i>";
  const c = eco.countries[active - 1], meta = world.countries[active - 1], p = c.politics;
  const weekly = c.income + c.tariffs - c.upkeep - c.interest;
  return `<h3 style="color:rgb(${meta.color})">${meta.name} <small style="color:#aaa">(você) · Era ${ERAS[c.research.era]}</small> <button data-act="identity" title="Nome, cor e bandeira"><i class=i-flag></i></button></h3>` +
    `<div class="stats">` +
    `<span title="População"><i class=i-people></i> ${fmt(c.pop)}</span>` +
    `<span title="PIB anual"><i class=i-economy></i> ${fmt(c.gdpWeek * 52)}</span>` +
    `<span title="Pontos administrativos (centros administrativos + papel): pagam os incentivos"><i class=i-admin></i> ${Math.floor(c.admin ?? 0)}/${adminCap(eco, active)} <small>${signed(c.adminWeek ?? 0)}</small></span> ` +
    `<span title="Controle médio do território (pela população): imposto, produção e recrutas"><i class=i-compass></i> ${pct(c.control ?? 1)}</span> ` +
    `<span title="Tesouro e saldo por semana"><i class=i-treasury></i> ${fmt(c.treasury)} <small class="${weekly < 0 ? "up" : "down"}">${signed(weekly)}/sem</small></span>` +
    `<span title="Dívida"><i class=i-treasury></i> <span class="${c.debt > 0 ? "up" : ""}">${fmt(c.debt)}</span></span>` +
    `<span title="Legitimidade do governo"><i class=i-politics></i> <span class="${p.legitimacy < 0.4 ? "up" : "down"}">${pct(p.legitimacy)}</span></span>` +
    `<span title="Lealdade média · radicais"><i class=i-heart></i> ${Math.round(averageLoyalty(c.pops))} · <span class="${c.radicals > 0.1 ? "bad" : ""}">${pct(c.radicals)} rad.</span></span>` +
    `<span title="Manpower livre (só para o exército)"><i class=i-soldier></i> ${fmt(c.manpower)}</span>` +
    `<span title="Grupos de colonos"><i class=i-tent></i> ${settlersOf(eco, active)}</span>` +
    `<span title="Infâmia: reputação de agressor. ≥${INFAMY.noPacts} ninguém fecha acordo; ≥${INFAMY.pactsBreak} acordos caem e vizinhos podem se unir contra você. Cai ${INFAMY.decayWeek}/semana."><i class=i-skull></i> <span class="${c.infamy >= INFAMY.pactsBreak ? "bad" : c.infamy >= INFAMY.noPacts ? "up" : ""}">${Math.round(c.infamy)}</span></span>` +
    `</div>` +
    (c.bankruptWeeks ? `<div class="bad">FALIDO: produção −${Math.round((1 - RULES.bankruptPenalty) * 100)}% por mais ${c.bankruptWeeks} semanas</div>` : "") +
    (p.rival >= 0 ? `<div class="bad"><i class=i-warn></i> ${GROUPS[p.rival].name} tem mais apoio popular que o governo</div>` : "");
}

function tabsHtml() {
  return `<div class="tabs">${TABS.map((t, k) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}">${t}</button>`).join("")}</div>`;
}

function economyHtml() {
  if (!active) return "";
  const c = eco.countries[active - 1];
  const pool = `<div><i class=i-treasury></i> Fundo de investimento privado: <b>${fmt(c.investPool ?? 0)}</b> <small>(+${fmt(c.investWeek ?? 0)}/sem pela lei de Economia; os investidores constroem sozinhos onde dá mais lucro)</small></div>`;
  return pool + `<canvas id="gdp" width="600" height="110" style="width:100%;height:110px;background:#111"></canvas>` +
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

function societyHtml(part: "pops" | "culture" = "pops") {
  if (!active) return "";
  const c = eco.countries[active - 1], p = c.pops;
  const top = (field: "culture" | "language" | "religion", name: (id: number) => string) =>
    countryMix(eco, active, field).slice(0, 4).map(([id, f]) => `${name(id)} ${pct(f)}`).join(" · ");
  const accepted = new Set([c.primaryCulture, ...(c.acceptedCultures ?? [])]);
  const cultures = countryMix(eco, active, "culture").slice(0, 6).map(([id, f]) =>
    `${cultureName(world, id)} ${pct(f)}` + (id === c.primaryCulture ? " <small>(principal)</small>" : accepted.has(id)
      ? ` <small>(aceita)</small> <button data-accept="${id}|off" title="Deixar de aceitar">✕</button>`
      : ` <span class="bad">(discriminada)</span> <button data-accept="${id}|on" title="Aceitar: custa ${ACCEPT_COST} pontos administrativos">Aceitar</button>`)).join("<br>");
  const ident = `<br><i class=i-mask></i> <b>Culturas</b><br>${cultures}<br><i class=i-speech></i> <b>Línguas</b> (oficial: ${languageName(c.officialLanguage ?? 0)}): ${top("language", languageName)}` +
    `<br><i class=i-church></i> <b>Religiões</b> (do Estado: ${RELIGIONS[c.stateReligion ?? 0]}): ${top("religion", (id) => RELIGIONS[id])}` +
    ((c.culturePenalty ?? 0) > 0.5 ? `<br><span class="bad">Minorias não aceitas: −${Math.round(c.culturePenalty!)} de lealdade</span>` : "");
  const lit = ident + `<br><i class=i-book></i> Letrados: <b>${pct(c.literacy ?? 0)}</b> <small>(pesquisa +${pct(RULES.literacyResearch * (c.literacy ?? 0))}; sobem com Escrita, Universidades, Imprensa...)</small>`;
  const qolColor = (q: number) => (q < 15 ? "up" : q >= 30 ? "down" : "");
  const rows = POP_TYPES.map((t, k) => [t, k] as const).filter(([, k]) => p.count[k] >= 0.5)
    .sort(([a], [b]) => a.cls - b.cls)
    .map(([t, k]) => `<tr><td>${t.name}</td><td>${CLASSES[t.cls]}</td><td>${fmt(p.count[k])}</td>` +
      `<td>${(p.income[k] / p.count[k]).toFixed(2)}</td><td class="${qolColor(p.qol[k])}">${Math.round(p.qol[k])}</td>` +
      `<td class="${p.loyalty[k] < POP_RULES.radicalBelow ? "bad" : ""}">${Math.round(p.loyalty[k])}</td></tr>`);
  const weight = politicalWeight(p), total = weight.reduce((s, v) => s + v, 0) || 1;
  if (part === "culture") return lit;
  return `<table><tr><td><b>POP</b></td><td><b>Classe</b></td><td><b>Pessoas</b></td><td><b title="renda semanal por pessoa">Renda</b></td><td><b title="Qualidade de vida, 1 a 50">QV</b></td><td><b title="Lealdade, 0 a 100 (abaixo de 30 = radical)">Leal</b></td></tr>${rows.join("")}</table>` +
    `<small>Peso político: ${CLASSES.map((cl, k) => `${cl} ${pct(weight[k] / total)}`).join(" · ")}` +
    ` · migração no mês <span class="${c.migration < 0 ? "up" : c.migration > 0 ? "down" : ""}">${signed(c.migration)}</span></small>`;
}

const KIND_NAMES: Record<string, string> = { army: "<i class=i-military></i> Divisões", fleet: "<i class=i-ship></i> Frotas", air: "<i class=i-plane></i> Esquadrões", settler: "<i class=i-tent></i> Colonos" };
/** Ordens de frente para os exércitos selecionados: contra vizinhos e inimigos. */
function frontHtml(ids: number[]) {
  const armies = ids.filter((id) => eco.divisions.some((d) => d.id === id && d.kind === "army" && d.country === active));
  if (!armies.length || !active) return "";
  const foes = new Set<number>(eco.contacts?.[active - 1] ?? []);
  for (let k = 1; k <= eco.countries.length; k++) if (atWar(eco, active, k)) foes.add(k);
  if (!foes.size) return "";
  return `<div style="margin-top:6px"><small>Frente (${armies.length} exército${armies.length > 1 ? "s" : ""}):</small>` + [...foes].map((k) =>
    `<br>${world.countries[k - 1].name}${atWar(eco, active, k) ? ' <span class="bad">guerra</span>' : ""} <button data-front="${k}|defend|${armies.join(",")}" title="Espalha as tropas pela fronteira">Defender fronteira</button>` +
    (atWar(eco, active, k) ? ` <button data-front="${k}|attack|${armies.join(",")}" title="Marcham para as cidades deles">Atacar cidades</button>` : "")).join("") + "</div>";
}

/** Formação do regimento: frente (infantaria, blindados), flancos (montaria) e retaguarda (artilharia, cerco). Um quadrado ≈ 100 soldados. */
function formationSVG(d: { strength: number; unit?: string; mix?: Record<string, number> }) {
  const parts = Object.entries(d.mix ?? { [unitOf(d.unit).name]: 1 }).map(([n, f]) => [unitOf(n), Math.max(1, Math.round((d.strength * f) / 100))] as const);
  const color: Record<string, string> = { Infantaria: "#7d9fc4", Montaria: "#c2a46a", Artilharia: "#cf6b62", Cerco: "#d39a52", Blindados: "#86b382" };
  const row = (cats: string[]) => parts.filter(([u]) => cats.includes(u.cat)).flatMap(([u, n]) => Array.from({ length: Math.min(n, 30) }, () => u));
  const front = row(["Infantaria", "Blindados"]), flank = row(["Montaria"]), back = row(["Artilharia", "Cerco"]);
  const left = flank.slice(0, Math.ceil(flank.length / 2)), right = flank.slice(left.length), sq = 9, per = 12;
  const lines = (list: typeof front) => Array.from({ length: Math.ceil(list.length / per) }, (_, r) => list.slice(r * per, r * per + per));
  const frontRows = lines(front), backRows = lines(back), flankRows = Math.max(1, Math.ceil(Math.max(left.length, right.length) / 2));
  const wdt = (per + 6) * sq, h = (frontRows.length + backRows.length + 2) * sq + 20;
  let out = "", y = 14;
  const put = (u: (typeof front)[number], x: number, yy: number) => { out += `<rect x="${x}" y="${yy}" width="${sq - 2}" height="${sq - 2}" fill="${color[u.cat] ?? "#999"}"><title>${u.name}</title></rect>`; };
  frontRows.forEach((r, i) => r.forEach((u, k) => put(u, (3 + k + (per - r.length) / 2) * sq, y + i * sq)));
  left.forEach((u, k) => put(u, (k % 2) * sq, y + Math.floor(k / 2) * sq));
  right.forEach((u, k) => put(u, (per + 4 + (k % 2)) * sq, y + Math.floor(k / 2) * sq));
  y += Math.max(frontRows.length, flankRows) * sq + sq;
  backRows.forEach((r, i) => r.forEach((u, k) => put(u, (3 + k + (per - r.length) / 2) * sq, y + i * sq)));
  return `<svg width="${wdt}" height="${h}" style="display:block;margin:4px 0"><text x="${wdt / 2}" y="9" fill="#9a978e" font-size="9" text-anchor="middle">▲ inimigo</text>${out}</svg>` +
    `<small>${Object.entries(color).filter(([cat]) => parts.some(([u]) => u.cat === cat)).map(([cat, col]) => `<span style="color:${col}">■</span> ${cat}`).join(" · ")} · 1 quadrado ≈ 100 soldados</small>`;
}

function groupHtml() {
  const ds = eco.divisions.filter((d) => group.includes(d.id));
  const kinds = Object.keys(KIND_NAMES).filter((k) => ds.some((d) => d.kind === k));
  return `<div class="unit"><b>${ds.length} unidades selecionadas</b> <small>(botão direito: todas vão)</small><table>` +
    kinds.map((k) => { const of = ds.filter((d) => d.kind === k); return `<tr><td><button data-group-kind="${k}">${KIND_NAMES[k]}</button></td><td>${of.length}</td><td>${fmt(of.reduce((s, d) => s + d.strength, 0))} homens</td></tr>`; }).join("") +
    `</table>` + (() => { // exércitos do jogador no mesmo hex: juntar num regimento só
      const armies = ds.filter((d) => d.kind === "army" && d.country === active);
      if (armies.length < 2) return "";
      const same = armies.every((d) => d.hex === armies[0].hex);
      return same ? `<button data-act="merge" title="Um regimento com todos os soldados; ataque e defesa pela média, anda no passo do mais lento">Juntar ${armies.length} exércitos em um regimento</button>`
        : `<small>Para juntar num regimento, os exércitos precisam estar no mesmo hex.</small>`;
    })() + frontHtml(group) + `</div>`;
}

function divisionHtml() {
  if (group.length > 1) return groupHtml();
  const d = eco.divisions.find((x) => x.id === selectedDiv);
  if (!d) return "";
  const t = d.target === null ? "parada" : `indo para (${d.target % W}, ${(d.target / W) | 0})`;
  if (d.kind === "settler") {
    const dist = settlerDistance(world, eco, d), out = dist > RULES.settlerSupplyRange;
    return `<div class="unit"><b><i class=i-tent></i> Colonos</b> · ${t} · ${Math.round(d.strength)} pessoas · ${dist} hex da cidade` +
      (out ? ` <span class="bad">sem suprimentos (máx. ${RULES.settlerSupplyRange}): morrendo</span>` : "") +
      (() => { const fc = foundingCost(world, eco, d.country, d.hex, RESOURCES); return `<br><small>Aqui: claim de <b>${fc.claim}</b> · ${distanceLabel(fc.distance)} (${Math.round(fc.distance)}) · fundar custa <b>${fc.cost}</b></small>`; })() +
      `<br><button data-act="found">C Fundar cidade aqui</button> <button data-act="outpost" title="Acampamento: reivindica o hex, espalha influência, abastece tropas e serve de base para fundar mais longe">Posto avançado (${EXPAND.outpostCost})</button> <button data-act="disband">Voltar para casa</button>${message ? ` <span class="bad">${message}</span>` : ""}</div>`;
  }
  if (d.kind === "air") {
    const region = airRegion(eco, d.target ?? d.hex);
    const name = region >= STATES.regionBase ? eco.states.find((x) => x.id === region - STATES.regionBase)?.name ?? "—" : region >= 0 ? eco.cities[region].name : "—";
    return `<div class="unit"><b><i class=i-plane></i> ${craftOf(PLANES, d.unit).name} ${d.id}</b> · ${d.target === null ? "defendendo a base" : "missão"}: região de ${name}` +
      `<br>Pilotos ${Math.round(d.strength)}/${AIR.pilots} · org. ${pct(d.org)} · prontidão ${pct(d.ready ?? 1)} <small>(combustível × tempo)</small> · alcance ${AIR.range} hexes <small>(botão direito = região de missão)</small>` +
      (d.country === active ? `<br>Missão <select data-mission="${d.id}">${AIR_MISSIONS.map((m) => `<option${airMissionOf(d) === m ? " selected" : ""}>${m}</option>`).join("")}</select>` : "") + ` <button data-act="disband">Desfazer</button>` + commanderHtml(d) + `</div>`;
  }
  if (d.kind === "fleet") return `<div class="unit"><b><i class=i-ship></i> ${craftOf(SHIPS, d.unit).name} ${d.id}</b> · ${t} · zona marítima ${world.seaZone[d.hex]}` +
    `<br>Marinheiros ${Math.round(d.strength)}/${NAVY.sailors} · org. ${pct(d.org)} · mar ${seaWeather(world, d.hex, eco.week)} · <small>leva exércitos nessa zona</small>` +
    (d.country === active ? `<br>Missão <select data-mission="${d.id}">${NAVAL_MISSIONS.map((m) => `<option${missionOfFleet(d) === m ? " selected" : ""}>${m}</option>`).join("")}</select>` : "") + ` <button data-act="disband">Desfazer</button>` + commanderHtml(d) + `</div>`;
  const sieged = d.siege ? eco.cities.find((k) => k.hex === d.hex) : undefined;
  const u = statsOf(d), gen = d.general ? eco.characters?.find((x) => x.id === d.general) : undefined;
  return `<div class="unit"><b><i class=i-military></i> ${u.name} ${d.id}</b> <small>${u.cat} · ataque ${u.atk} · defesa ${u.def}</small> · ${t}` + (sieged ? ` · <i class=i-fort></i> cercando ${sieged.name}: ${d.siege}/${Math.ceil(siegeWeeks(sieged.size, 1))} sem.` : "") +
    formationSVG(d) + (d.mix ? `<table>${Object.entries(d.mix).sort((a, b) => b[1] - a[1]).map(([n, f]) => `<tr><td>${n}</td><td>${fmt(d.strength * f)} soldados</td><td><small>${unitOf(n).cat} · atq ${unitOf(n).atk} · def ${unitOf(n).def}</small></td></tr>`).join("")}</table>` +
      (d.country === active ? `<button data-act="split" title="Volta a ser uma divisão por tipo de soldado">Separar o regimento</button><br>` : "") : "") +
    `<br>Soldados ${Math.round(d.strength)}/${WAR.divisionSize * (d.size ?? 1)} · org. ${pct(d.org)} · moral ${pct(d.morale ?? 1)} · armas ${pct(d.equip)} · cansaço ${pct(d.fatigue ?? 0)}${(d.entrench ?? 0) >= 0.5 ? ` · entrincheirado +${(d.entrench ?? 0).toFixed(1)}` : ""}` +
    (d.country === active ? `<br>Prioridade de abastecimento <select data-prio="${d.id}"><option value="0"${!d.priority ? " selected" : ""}>Automática</option>${PRIORITIES.map((n, k) => `<option value="${k + 1}"${d.priority === k + 1 ? " selected" : ""}>${n}</option>`).join("")}</select> <small>tempo: ${weatherAt(world, d.hex, eco.week)}</small>` : "") +
    (d.supply ? `<br>Abastecimento <b class="${d.supply.level >= 0.75 ? "down" : d.supply.level >= 0.5 ? "" : "up"}">${pct(d.supply.level)} (${levelName(d.supply.level)})</b> · comida ${pct(d.supply.food)} · munição ${pct(d.supply.ammo)} · combustível ${pct(d.supply.fuel)} · estoque ${(d.stock?.food ?? 0).toFixed(1)} sem. · ` : " · ") +
    (d.supplied === false ? `<span class="bad">sem suprimento (depósito a ${depotDistance(world, eco, d)} hexes, alcance ${supplyRange(eco, d.country)})</span>` : `suprimento ok`) + ` <button data-act="disband">Desfazer</button>` +
    (gen ? `<div style="display:flex;gap:8px;margin-top:6px">${portraitSVG(gen, eco.countries[d.country - 1].research.era, 44)}<div><b data-char="${gen.id}" style="cursor:pointer" title="Ver perfil">Gen. ${gen.name}</b><br><small>militar ${gen.mil} · ${ageOf(gen, eco.week)} anos</small><br>` + (gen.saved ? "" : `<button data-save-char="${gen.id}">Guardar na história</button>`) + ` <button data-book="${gen.id}">Livro</button></div></div>`
      : commanderHtml(d)) + frontHtml([d.id]) + `</div>`;
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
  return `Exército: ${n} divisão(ões)` + (enemies.length ? "<br><span class='bad'><i class=i-military></i> Em guerra</span>" + enemies.map((b) => {
    const s = warScore(world, eco, active, b), st = eco.warStats?.[active < b ? `${active}-${b}` : `${b}-${active}`];
    const sup = st ? warSupport(eco, active, st) : 1;
    return `<br><b>${world.countries[b - 1].name}</b> · placar ${s >= 0 ? "+" : ""}${Math.round(s * 100)} <button data-peace="${b}">Paz</button>` + (st ? `<table>
      <tr><td></td><td>nós</td><td>eles</td></tr>
      <tr><td>Mortos em combate</td><td>${fmt(st.dead[active] ?? 0)}</td><td>${fmt(st.dead[b] ?? 0)}</td></tr>
      <tr><td>Civis perdidos</td><td>${fmt(st.civil[active] ?? 0)}</td><td>${fmt(st.civil[b] ?? 0)}</td></tr>
      <tr><td>Custo (manutenção)</td><td>${fmt(st.cost[active] ?? 0)}</td><td>${fmt(st.cost[b] ?? 0)}</td></tr>
      <tr><td>Duração</td><td colspan="2">${eco.week - st.start} semanas</td></tr>
      <tr><td>Apoio do povo</td><td colspan="2" class="${sup < 0.3 ? "up" : "down"}">${pct(sup)}${sup < 0.5 ? " — a guerra está custando legitimidade" : ""}</td></tr></table>` : "");
  }).join("") : "");
}

/** O que a lei muda, em texto, comparando com a lei em vigor. */
function lawEffect(l: Law, cat: string, p: Politics) {
  const c = eco.countries[active - 1], cur = lawOf(p, cat), parts: string[] = [];
  if (l.tax !== undefined) {
    const delta = c.gdpWeek * (l.tax - cur.tax!) * (RULES.taxBaseEfficiency + p.legitimacy);
    parts.push(`imposto ${pct(l.tax)} do PIB (agora ${pct(cur.tax!)}): <b class="${delta >= 0 ? "down" : "up"}">${signed(delta)}/semana</b>`);
  }
  if (l.invest !== undefined) parts.push(`investidores privados recebem ${pct(l.invest)} do PIB para construir (agora ${pct(cur.invest ?? 0)})`);
  if (l.tradeShare !== undefined) parts.push(`cidades trocam ${pct(l.tradeShare)} da sobra por semana (agora ${pct(cur.tradeShare!)})`);
  const FX: Record<string, (v: number) => string> = { control: (v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}% controle`, unrest: (v) => (v > 0 ? `−${v} lealdade` : `+${-v} lealdade`),
    growth: (v) => `+${Math.round(v * 100)}% crescimento`, research: (v) => `+${Math.round(v * 100)}% pesquisa`, manpower: (v) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}% recrutas`,
    army: (v) => `+${Math.round(v * 100)}% força do exército`, immigration: (v) => (v <= -1 ? "ninguém imigra" : `${v > 0 ? "+" : ""}${Math.round(v * 100)}% imigração`) };
  for (const [k, v] of Object.entries(l.fx ?? {})) parts.push(FX[k](v));
  const econFx = ECON_LAW[l.name];
  if (econFx) parts.push(Object.entries(econFx).map(([k, v]) => `+${Math.round(v! * 100)} pontos em ${k === "tax" ? "eficiência tributária" : k === "admin" ? "administração" : k === "trade" ? "comércio" : k === "industry" ? "produtividade" : k}`).join(", "));
  if (l.fx || econFx) parts.push("<small>(o efeito chega aos poucos onde o controle é baixo)</small>");
  return `${l.desc ?? ""}${parts.length ? "<br>" + parts.join(" · ") : ""}`;
}

/** Livro da história: a vida do personagem num documento por cima do jogo; "Salvar como PDF" imprime só o livro. */
/** Resumo da vida a partir do que foi registrado (nada inventado): origem, papel, personalidade, batalhas e fim. */
function bioText(c: NonNullable<Economy["characters"]>[number]) {
  const land = world.countries[c.country - 1].name, r = c.record ?? [], wins = r.filter((b) => b.won).length;
  const parts = [`${c.name} nasceu em ${land}${c.personality ? ` e era conhecido como ${c.personality.toLowerCase()}` : ""}.`];
  if (c.command) parts.push(`Serviu como comandante ${COMMAND_NAME[c.command]}, especializado em ${c.spec?.toLowerCase()}.`);
  else parts.push(`Governou ${land}.`);
  if (r.length) parts.push(`Comandou em ${r.length} batalha${r.length > 1 ? "s" : ""}, com ${wins} vitória${wins === 1 ? "" : "s"} e ${r.length - wins} derrota${r.length - wins === 1 ? "" : "s"}; somadas, suas forças sofreram ${r.reduce((s, b) => s + b.ownLost, 0)} baixas e infligiram ${r.reduce((s, b) => s + b.foeLost, 0)}.`);
  const govs = (c.offices ?? []).filter((o) => o.title === "Governante");
  if (govs.length && c.command) parts.push(`Depois ${govs[0].why}${c.coup ? ", à força" : ""}.`);
  const passed = (c.laws ?? []).filter((l) => l.result === "aprovada").map((l) => l.name), dropped = (c.laws ?? []).filter((l) => l.result === "retirada").map((l) => l.name);
  if (passed.length) parts.push(`No seu governo foram aprovadas: ${passed.join(", ")}.`);
  if (dropped.length) parts.push(`Retirou propostas sem apoio: ${dropped.join(", ")}.`);
  if (c.taken?.length) parts.push(`Tomou ${c.taken.length} cidade${c.taken.length > 1 ? "s" : ""} em cerco (${c.taken.join(", ")}).`);
  if (c.founded?.length) parts.push(`Fundou ${c.founded.join(", ")}.`);
  const acquired = c.traits.filter((t) => ["Veterano", "Herói de guerra", "Sobrevivente de derrota", "Ferido em combate", "Caolho"].includes(t));
  if (acquired.length) parts.push(`As campanhas o marcaram: ${acquired.join(", ").toLowerCase()}.`);
  if (c.revolution) parts.push("Chegou ao poder à frente de uma revolução.");
  if (c.spouse !== undefined) { const s = eco.characters?.find((x) => x.id === c.spouse); if (s) parts.push(`Casou-se com ${s.name}${c.heirs?.length ? ` e teve ${c.heirs.length} filho${c.heirs.length > 1 ? "s" : ""}` : ""}.`); }
  parts.push(`Seguia a fé ${RELIGIONS[c.religion ?? 0]}.`);
  if (c.exiledTo) parts.push(`Terminou exilado em ${world.countries[c.exiledTo - 1].name}.`);
  if ((c.langs?.length ?? 0) > 1) parts.push(`Falava ${c.langs!.map(languageName).join(", ")}.`);
  parts.push(c.dead ? `Morreu aos ${ageOf(c, Math.min(eco.week, c.dies))} anos.` : `Aos ${ageOf(c, eco.week)} anos, segue vivo.`);
  return parts.join(" ");
}
function openBook(id: number) {
  const c = eco.characters?.find((x) => x.id === id);
  if (!c) return;
  // iframe em vez de janela nova: não depende de pop-up e a impressão (PDF) pega só o livro
  document.getElementById("book")?.remove();
  const box = document.createElement("div"); box.id = "book";
  box.style.cssText = "position:fixed;inset:70px 15% 70px 15%;z-index:12;border:1px solid var(--gold);background:#f4ecd8;display:flex;flex-direction:column";
  const close = document.createElement("button"); close.textContent = "Fechar"; close.style.cssText = "align-self:flex-end;margin:6px"; close.onclick = () => box.remove();
  const frame = document.createElement("iframe"); frame.style.cssText = "flex:1;border:0"; frame.title = "Livro da história";
  box.append(close, frame); document.body.appendChild(box);
  const win = frame.contentWindow!;
  const esc = (t: string) => t.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!);
  const era = eco.countries[c.country - 1].research.era;
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(c.name)}</title>
    <style>body{font:16px/1.6 Georgia,serif;color:#2b2418;background:#f4ecd8;max-width:640px;margin:40px auto;padding:0 24px}
    h1{font-size:30px;margin:0}small{color:#6b5d44}.head{display:flex;gap:18px;align-items:center;border-bottom:1px solid #b9a77f;padding-bottom:12px}
    ul{list-style:none;padding:0}li{padding:4px 0;border-bottom:1px dotted #c9b88f}@media print{button{display:none}}</style></head><body>
    <div class="head">${portraitSVG(c, era, 110)}<div><h1>${esc(c.name)}</h1><div style="font-style:italic;font-size:19px">${esc(epithet(c, eco.week))}</div><small>${esc(world.countries[c.country - 1].name)} · ${c.dead ? "falecido" : `${ageOf(c, eco.week)} anos`}</small>
    <p><small>Administração ${skill(c, "adm")} · Diplomacia ${skill(c, "dip")} · Militar ${skill(c, "mil")}${c.personality ? ` · ${esc(c.personality)}` : ""}</small></p></div></div>
    <button onclick="print()">Exportar PDF</button>
    <h2>Biografia</h2><p>${esc(bioText(c))}</p>
    ${titlesOf(c, eco.week).length ? `<p><b>Classificação histórica:</b> ${esc(titlesOf(c, eco.week).join(", "))}</p>` : ""}
    ${c.offices?.length ? `<h2>Cargos</h2><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th align="left">Cargo</th><th align="left">País</th><th align="left">Início</th><th align="left">Fim</th><th align="left">Como</th></tr>${c.offices.map((o) => `<tr style="border-top:1px dotted #c9b88f"><td>${esc(o.title)}</td><td>${esc(world.countries[o.country - 1]?.name ?? "?")}</td><td>${esc(dateLabel(o.from))}</td><td>${o.to !== undefined ? `${esc(dateLabel(o.to))} (${esc(o.end ?? "")})` : "no cargo"}</td><td>${esc(o.why)}</td></tr>`).join("")}</table>` : ""}
    ${c.laws?.length ? `<h2>Atuação política</h2><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th align="left">Data</th><th align="left">Lei</th><th align="left">Participação</th></tr>${c.laws.map((l) => `<tr style="border-top:1px dotted #c9b88f"><td>${esc(dateLabel(l.week))}</td><td>${esc(l.name)}</td><td>${l.result === "proposta" ? "propôs" : l.result === "aprovada" ? "aprovada no seu governo" : "retirou a proposta"}</td></tr>`).join("")}</table>` : ""}
    ${c.founded?.length || c.taken?.length ? `<h2>Cidades</h2><p>${c.founded?.length ? `Fundadas no seu governo: ${esc(c.founded.join(", "))}. ` : ""}${c.taken?.length ? `Tomadas em cerco: ${esc(c.taken.join(", "))}.` : ""}</p>` : ""}
    <h2>Personalidade e traços</h2><ul>${c.personality ? `<li><b>${esc(c.personality)}</b> — ${esc(PERSONALITIES[c.personality]?.desc ?? "")}</li>` : ""}${c.traits.map((t) => `<li><b>${esc(t)}</b> <small>${TRAIT_CAT[t] ?? ""} · ${Object.entries(TRAIT_FX[t] ?? {}).map(([k, v]) => `${v! > 0 ? "+" : ""}${v} ${k}`).join(", ") || "sem efeito nos atributos"}</small></li>`).join("")}</ul>
    ${c.record?.length ? `<h2>Batalhas</h2><table style="width:100%;border-collapse:collapse;font-size:13px;page-break-inside:auto"><tr><th align="left">Data</th><th align="left">Batalha</th><th>Lado</th><th>Forças (suas × inimigo)</th><th>Baixas (suas / inimigo)</th><th>Resultado</th><th align="left">Avaliação</th></tr>${c.record.map((b) => `<tr style="border-top:1px dotted #c9b88f;page-break-inside:avoid"><td>${WEEKDAYS[b.day]}, ${esc(dateLabel(b.week))}</td><td>${esc(b.place)} contra ${esc(world.countries[b.enemy - 1]?.name ?? "?")}</td><td>${b.side}</td><td align="center">${b.own} × ${b.foe}</td><td align="center">${b.ownLost} / ${b.foeLost}</td><td>${b.won ? "vitória" : "derrota"} (${b.weeks} sem.)</td><td><small>${esc((b.notes ?? []).join("; ") || "—")}</small></td></tr>`).join("")}</table><p><small>Baixas somam mortos, feridos e capturados: o combate do jogo não separa os três.</small></p>` : ""}
    ${eventsOfCharacter(eco, c.id).length ? `<h2>Acontecimentos registrados</h2><ul>${eventsOfCharacter(eco, c.id).map((v) => `<li>${WEEKDAYS[v.d]}, ${esc(dateLabel(v.w))} — ${esc(lifeText(world, v.x))}</li>`).join("")}</ul>` : ""}
    <h2>Linha do tempo</h2><ul>${c.life.map((l) => `<li>${esc(lifeText(world, l))}</li>`).join("")}</ul>
    <p><small>Gerado em ${esc(dateLabel(eco.week))} · mundo ${world.seed}</small></p></body></html>`);
  win.document.close();
}

/** Personagens guardados na história do país (vivos e mortos), com o livro de cada um. */
const bookList = () => {
  const saved = (eco.characters ?? []).filter((c) => c.saved && c.country === active);
  return saved.length ? `<h3>Livro da história</h3>${saved.map((c) => `<div>${c.name} <small>${c.dead ? "(falecido)" : ""}</small> <button data-book="${c.id}">Abrir livro</button></div>`).join("")}` : "";
};
/** Cartão do governante: retrato, idade, atributos, traços e a vida dele (aba Política). */
/** Perfil do personagem no painel da direita: atributos (sorteado → efetivo) e cada traço com o que ele dá e tira. */
function charProfileHtml(c: NonNullable<Economy["characters"]>[number]) {
  const era = eco.countries[c.country - 1].research.era;
  const attr = (k: "adm" | "dip" | "mil", label: string) => { const v = skill(c, k); return `<small style="display:block">${label} <b>${v}</b>${v !== c[k] ? ` <span style="color:var(--dim)">(${c[k]} sem traços)</span>` : ""}</small><div class="bar"><div style="background:${v >= 60 ? "var(--green)" : v < 40 ? "var(--red)" : "var(--gold)"};width:${v}%"></div></div>`; };
  const names = { adm: "administração", dip: "diplomacia", mil: "militar" } as const;
  const traits = c.traits.map((t) => {
    const fx = Object.entries(TRAIT_FX[t] ?? {}).map(([k, v]) => `<span class="${v! > 0 ? "down" : "up"}">${v! > 0 ? "+" : ""}${v} ${names[k as keyof typeof names]}</span>`).join(", ");
    return `<li><b>${t}</b> <small style="color:var(--dim)">${TRAIT_CAT[t] ?? ""}</small> ${fx ? `<small>${fx}</small>` : "<small>sem efeito nos atributos</small>"}</li>`;
  }).join("");
  return `<div style="display:flex;gap:10px">${portraitSVG(c, era, 72)}<div><h3 style="margin:0">${c.name}</h3><small>${(c.offices ?? []).filter((o) => o.to === undefined).map((o) => o.title).join(" e ") || (c.role ?? "Governante")} · ${world.countries[c.country - 1].name} · ${c.dead ? "falecido" : `${ageOf(c, eco.week)} anos`}</small></div></div>` +
    attr("adm", "Administração (impostos)") + attr("dip", "Diplomacia (relações)") + attr("mil", "Militar (exército e batalhas)") +
    (c.personality ? `<p><small>Personalidade: <b>${c.personality}</b> — ${PERSONALITIES[c.personality]?.desc ?? ""}</small></p>` : "") +
    (c.command ? `<p><small>Comando ${COMMAND_NAME[c.command]} · especialização <b>${c.spec}</b> · ${c.fights ?? 0} batalhas, ${c.wins ?? 0} vitórias</small></p>` : "") +
    (() => { const who = (id?: number) => { const x = id !== undefined ? eco.characters?.find((y) => y.id === id) : undefined; return x ? `<a data-char="${x.id}" style="cursor:pointer;text-decoration:underline dotted">${x.name}</a>${x.dead ? " (falecido)" : ` (${ageOf(x, eco.week)})`}` : ""; };
      const sp = who(c.spouse), kids = (c.heirs ?? []).map(who).filter(Boolean), par = who(c.parent);
      return `<p><small>Religião: ${RELIGIONS[c.religion ?? 0]}${sp ? ` · cônjuge ${sp}` : ""}${par ? ` · filho de ${par}` : ""}${kids.length ? `<br>Filhos (herdeiros): ${kids.join(", ")}` : ""}</small></p>`; })() +
    `<p><small>Fala ${(c.langs ?? [world.countries[c.country - 1].lang ?? 0]).map(languageName).join(", ")}${c.exiledTo ? ` · <b>exilado em ${world.countries[c.exiledTo - 1].name}</b>` : c.gone ? " · fora da vida pública" : ""}</small></p>` +
    (titlesOf(c, eco.week).length ? `<p><small>Lembrado como: <b>${titlesOf(c, eco.week).join(", ")}</b></small></p>` : "") +
    `<h3>Traços</h3><ul style="margin:0;padding-left:16px">${traits}</ul>` +
    (c.role === "General" ? `<small>Estilo de comando: <b>${styleOf(c)}</b> — ${STYLES[styleOf(c)]}</small>` : "") +
    `<h3>Vida</h3><small>${c.life.map((l) => lifeText(world, l)).join("<br>")}</small><br><button data-book="${c.id}">Livro</button>`;
}
/** Políticas Regionais: incentivos da cidade k e do estado dela, por categoria, com custo final pela Complexidade Social. */
let incCat = "Administração e estabilidade";
function regionalPoliciesHtml(k: number) {
  const city = eco.cities[k], c = eco.countries[city.country - 1], st = city.state;
  const stCities = st !== undefined ? eco.cities.map((x, j) => (x.state === st ? j : -1)).filter((j) => j >= 0) : [];
  const active_ = (eco.incentives ?? []).filter((x) => x.kind && citiesOf(eco, x).includes(k));
  const cats = [...new Set(Object.values(INCENTIVES).map((d) => d.cat))];
  const row = (kind: string) => {
    const d = INCENTIVES[kind], fc = incentiveCost(eco, kind, [k], false), fs = st !== undefined ? incentiveCost(eco, kind, stCities, true) : null;
    const errC = canIncentive(eco, active, kind, { city: k }), errS = st !== undefined ? canIncentive(eco, active, kind, { state: st }) : "sem estado";
    return `<div class="card" style="margin:4px 0"><div style="display:flex;gap:6px;align-items:center">${icon(d.glyph)} <b>${kind}</b> <small>· ${d.ramp} sem. até o efeito cheio · dura até ${d.max} sem.${d.perm ? " · permanente" : ""}${d.group ? ` · ${d.group}` : ""}</small></div>` +
      `<small>${d.desc}</small><br><small>Base ${d.cost} + ${d.upkeep}/sem → cidade <b>${fc.cost.toFixed(0)} + ${fc.upkeep.toFixed(1)}/sem</b>${fs ? ` · estado <b>${fs.cost.toFixed(0)} + ${fs.upkeep.toFixed(1)}/sem</b>` : ""}</small><br>` +
      `<button data-incentive="${kind}|c:${k}|on" ${errC ? `disabled title="${errC}"` : ""}>Na cidade</button> ` +
      (st !== undefined ? `<button data-incentive="${kind}|s:${st}|on" ${errS ? `disabled title="${errS}"` : ""}>No estado</button>` : "") +
      (errC ? ` <small class="bad">${errC}</small>` : "") + `</div>`;
  };
  const act = active_.map((x) => `<tr><td>${icon(INCENTIVES[x.kind].glyph)} ${x.kind}<br><small>${x.state !== undefined ? "estado" : "cidade"} · ${x.suspended ? `<span class="bad">suspenso: ${x.suspended}</span>` : `efeito ${pct(progressOf(eco, x))}`} · faltam ${Math.max(0, (x.until ?? eco.week) - eco.week)} sem.</small></td>` +
    `<td><button data-incentive="${x.kind}|${x.state !== undefined ? `s:${x.state}` : `c:${x.city}`}|off" title="Para a manutenção; a ativação não volta; o que é permanente fica">Cancelar</button></td></tr>`).join("");
  return `<h3>${icon("admin")} Políticas Regionais</h3><small>Pontos administrativos ${Math.floor(c.admin ?? 0)} / ${adminCap(eco, city.country)} · Complexidade Social: cidade <b>${socialComplexity(eco, [k])}</b>${st !== undefined ? ` · estado <b>${socialComplexity(eco, stCities)}</b>` : ""} (custo × 1 + complexidade/100; estado +25%)</small>` +
    (act ? `<table>${act}</table>` : "<br><small>Nenhum incentivo nesta cidade.</small>") +
    `<div class="tabs">${cats.map((n) => `<button data-inccat="${n}" class="${n === incCat ? "on" : ""}">${n.split(/[ ,]/)[0]}</button>`).join(" ")}</div>` +
    Object.keys(INCENTIVES).filter((kd) => INCENTIVES[kd].cat === incCat).map(row).join("");
}
/** Comandante da unidade: o atual (frota e esquadrão) ou os 3 candidatos para escolher um. */
let hiring = 0;
function commanderHtml(d: Division) {
  const g = d.general ? eco.characters?.find((x) => x.id === d.general) : undefined, era = eco.countries[d.country - 1].research.era;
  if (g && d.kind !== "army") return `<div style="display:flex;gap:8px;margin-top:6px">${portraitSVG(g, era, 44)}<div><b data-char="${g.id}" style="cursor:pointer">${d.kind === "fleet" ? "Alm." : "Cmdt."} ${g.name}</b><br><small>${g.spec ?? ""} · militar ${skill(g, "mil")}</small></div></div>`;
  if (g || d.country !== active) return "";
  if (hiring !== d.id) return `<br><button data-act="hire-general">Contratar comandante ${COMMAND_NAME[d.kind === "fleet" ? "fleet" : d.kind === "air" ? "air" : "army"]} (${CHAR.generalCost})</button>`;
  const fx = (t: string) => Object.entries({ ...(TRAIT_FX[t] ?? {}) }).map(([k, v]) => `${v! > 0 ? "+" : ""}${v} ${k}`).join(" ");
  return `<h3>Escolha um de três candidatos (comando ${COMMAND_NAME[d.kind === "fleet" ? "fleet" : d.kind === "air" ? "air" : "army"]})</h3><div class="bcards" style="grid-template-columns:repeat(3,1fr)">` + generalCandidates(world, eco, d.id).map((c, k) =>
    `<div class="bcard" style="cursor:default">${portraitSVG(c, era, 56)}<b>${c.name}</b><small>${ageOf(c, eco.week)} anos · ${c.spec}</small><small>${c.personality} <i>(${PERSONALITIES[c.personality!]?.desc})</i></small>` +
    `<small>militar <b>${skill(c, "mil")}</b> · adm ${skill(c, "adm")} · dipl ${skill(c, "dip")}</small><small>${c.traits.map((t) => `${t}${fx(t) ? ` <span style="color:var(--dim)">(${fx(t)})</span>` : ""}`).join("<br>")}</small>` +
    `<button data-hire="${k}">Contratar</button></div>`).join("") + `</div><button data-act="hire-general">Cancelar</button>`;
}
function rulerHtml() {
  const r = active ? rulerOf(eco, active) : undefined;
  if (!r) return "";
  const attr = (k: string, v: number) => `<small style="display:block">${k} ${v}</small><div class="bar"><div style="background:${v >= 60 ? "var(--green)" : v < 40 ? "var(--red)" : "var(--gold)"};width:${v}%"></div></div>`;
  return `<h3>Governante</h3><div class="card" style="display:flex;gap:10px">${portraitSVG(r, eco.countries[active - 1].research.era, 72)}` +
    `<div style="flex:1"><div class="serif" style="font-size:17px;font-weight:600;cursor:pointer" data-char="${r.id}" title="Ver perfil">${r.name}</div><small style="display:block">${ageOf(r, eco.week)} anos · ${r.traits.join(", ")}</small>` +
    attr("Administração (impostos)", r.adm) + attr("Diplomacia (relações)", r.dip) + attr("Militar (exército)", r.mil) +
    (r.saved ? "<small>Guardado na história</small>" : `<button data-save-char="${r.id}" title="O livro dele continua depois que ele morrer">Guardar na história</button>`) + `</div></div>` +
    `<details><summary><small>Vida</small></summary><small>${r.life.map((l) => lifeText(world, l)).join("<br>")}</small></details>` + bookList();
}

function politicsHtml(p: Politics, era: number) {
  const groups = GROUPS.map((g, k) => [g, k] as const).filter(([, k]) => p.political[k] > 0.005 || p.popular[k] > 0.005)
    .sort(([, a], [, b]) => p.political[b] - p.political[a])
    .map(([g, k]) => { // cartão do grupo: papel no governo e as duas barras de poder
      const role = p.government.includes(k) ? '<span class="down">no governo</span>' : k === p.rival ? '<span class="bad">rival</span>' : '<span style="color:var(--dim)">oposição</span>';
      const bar = (v: number, col: string) => `<div class="bar"><div style="background:${col};width:${Math.round(v * 100)}%"></div></div>`;
      return `<div class="card"><div class="k">${role}</div><div class="serif" style="font-size:15px;font-weight:600">${g.name}</div>` +
        `<small>Poder político ${pct(p.political[k])}</small>${bar(p.political[k], "var(--blue)")}<small>Apoio popular ${pct(p.popular[k])}</small>${bar(p.popular[k], "var(--gold)")}</div>`;
    });
  const laws = Object.entries(LAWS).map(([cat, list]) => {
    const cur = lawOf(p, cat);
    const opts = list.filter((l) => l.name !== cur.name).map((l) => {
      if (l.era > era || (l.tech && !eco.countries[active - 1].research.known.has(l.tech))) return `<tr><td colspan="2"><small style="opacity:.55"><i class=i-lock></i> ${l.name} — ${l.era > era ? `era ${ERAS[l.era]}` : ""}${l.tech ? ` ${l.era > era ? "e " : ""}${l.tech}` : ""}</small></td></tr>`;
      const s = lawSupport(p, l);
      return `<tr><td>${p.enacting ? `<b>${l.name}</b>` : `<button data-law="${cat}|${l.name}">${l.name}</button>`}<br><small class="${s > 0 ? "down" : "up"}" title="Gostam: ${l.likes.join(", ") || "—"} · Não gostam: ${l.dislikes.join(", ") || "—"}">apoio ${s > 0 ? "+" : ""}${pct(s)}</small></td>` +
        `<td style="text-align:left"><small>${lawEffect(l, cat, p)}</small></td></tr>`;
    });
    return `<tr><td colspan="2" class="law-cat"><b>${cat}:</b> ${cur.name} <small style="opacity:.75">— ${cur.desc ?? ""}</small></td></tr>${opts.join("")}`;
  });
  const voting = p.enacting
    ? `<div>Votando <b>${p.enacting.law}</b> · fase ${lawPhase(p.enacting.progress) + 1}/3: ${LAW_PHASES[lawPhase(p.enacting.progress)]}` +
      `<br>Poder Político <span class="${p.support > 0 ? "down" : "up"}">${pct(p.support)}</span>${p.support > 0 ? "" : " <span class='bad'>(travada no parlamento)</span>"}` +
      ` · Poder Popular <span class="${(p.popularSupport ?? 0) >= 0 ? "down" : "up"}">${pct(p.popularSupport ?? 0)}</span>${(p.popularSupport ?? 0) < POLITICS_RULES.revoltSupport ? " <span class='bad'>(revolta)</span>" : (p.popularSupport ?? 0) < POLITICS_RULES.protestSupport ? " <span class='bad'>(protestos)</span>" : ""}` +
      ` <button data-act="cancel-law">Cancelar</button>${p.lawEvent ? `<br><small><i class=i-news></i> ${p.lawEvent}</small>` : ""}` +
      `<div class="bar"><div style="background:#fa6;width:${Math.min(100, p.enacting.progress * 100)}%"></div></div></div>` : "";
  const federal = !!lawOf(p, "Estados").federal;
  const states = statesOf(eco, active).map((x) => {
    const n = eco.cities.filter((k) => k.state === x.id).length;
    const taxes = federal ? `<br><small>Imposto: ` + [["", "Nacional"], ...LAWS["Impostos"].filter((l) => l.era <= era).map((l) => [l.name, l.name])]
      .map(([v, label]) => `<button data-state-tax="${x.id}|${v}" class="${(x.taxLaw ?? "") === v ? "on" : ""}">${label}</button>`).join(" ") + "</small>" : "";
    return `<tr><td>${x.name} <small>(${n} cidade${n > 1 ? "s" : ""})</small>${taxes}</td><td>${x.interest} ${x.happy ? "<i class=i-smile></i>" : "<span class='bad'><i class=i-frown></i></span>"}</td></tr>`;
  });
  const statesTable = `<b>Estados</b> <small>(${federal ? "Federação: cada estado escolhe o imposto" : `Centralizado: +${Math.round(STATES.adminPerState * 100)}% de arrecadação por estado`}; crie no hex de uma cidade)</small>` +
    (states.length ? `<table>${states.join("")}</table>` : "<br><small>Nenhum estado ainda.</small>");
  return rulerHtml() + voting +
    `<h3>Grupos de interesse</h3><div class="cards">${groups.join("")}</div><h3>Leis</h3>` +
    `<table class="laws">${laws.join("")}</table>` + statesTable;
}

const techEffect = (t: (typeof TECHS)[number]) => [
    ...(t.unlocks ?? []).map((b) => `libera ${b}`),
    ...(t.bonus ?? []).map(([b, v]) => `+${Math.round(v * 100)}% ${b}`),
    ...(t.research ? [`+${Math.round(t.research * 100)}% pesquisa`] : []),
    ...(t.trade ? [`+${Math.round(t.trade * 100)}% comércio`] : []),
    ...(t.army ? [`+${Math.round(t.army * 100)}% força do exército`] : []),
    ...(t.manpower ? [`+${Math.round(t.manpower * 100)}% manpower`] : []),
    ...(t.unrest ? [t.unrest > 0 ? `−${t.unrest} lealdade (agita o povo)` : `+${-t.unrest} lealdade`] : []),
    ...(t.growth ? [`+${Math.round(t.growth * 100)}% crescimento da população`] : []),
    ...(t.popCap ? [`+${Math.round(t.popCap * 100)}% teto de população`] : []),
    ...(t.urbanCap ? [`+${Math.round(t.urbanCap * 100)}% teto urbano`] : []),
    ...(t.plague ? [`−${Math.round(t.plague * 100)}% peste`] : []),
    ...(t.subsistence ? [`+${Math.round(t.subsistence * 100)}% comida de subsistência`] : []),
    ...(t.control ? [`+${Math.round(t.control * 100)}% controle`] : []),
    ...(t.fleet ? [`+${Math.round(t.fleet * 100)}% frota`] : []),
    ...(t.air ? [`+${Math.round(t.air * 100)}% aviação`] : []),
  ].join(", ");

function researchHtml(r: Economy["countries"][number]["research"], perWeek: number, headerOnly = false) {
  const cur = TECHS.find((t) => t.name === r.researching);
  const done = cur ? (r.progress.get(cur.name) ?? 0) / cur.cost : 0;
  const effect = techEffect;
  const weeks = cur ? Math.ceil(((1 - done) * cur.cost) / Math.max(perWeek, 1e-9)) : 0;
  const opts = available(r).map((t) => `<tr><td><button data-tech="${t.name}" class="${t.name === r.researching ? "on" : ""}">${t.name}</button></td><td style="text-align:left"><small>${effect(t)}</small></td><td>${fmt(t.cost)}</td></tr>`);
  return `${r.known.size}/${TECHS.length} tecnologias · ${perWeek.toFixed(1)} pontos/semana` +
    (cur ? `<br>Pesquisando <b>${cur.name}</b> · faltam ~${weeks} semanas<div class="bar"><div style="background:#6af;width:${done * 100}%"></div></div>` : "<br>Nada para pesquisar nesta era") +
    (opts.length && !headerOnly ? `<table>${opts.join("")}</table>` : "");
}

function hexHtml() {
  if (selected < 0) return "<i>Clique num hexágono.</i>";
  const i = selected, res = world.resource[i], city = cityOf(i);
  let h = `<b>Hex selecionado</b>: ${TERRAINS[world.terrain[i]].name} · ${RESOURCES[res]}${world.resource2[i] ? ` + ${RESOURCES[world.resource2[i]]}` : ""} · pop ${fmt(world.pop[i])}`;
  if (world.reserve[i] !== Infinity) h += ` · jazida para ~${Math.round(world.reserve[i] / 52)} anos (com 1 nível)`;
  if (eco.urban[i]) h += " · <b>urbano</b>";
  const rv = world.riverOf?.[i];
  if (rv) {
    const x = world.rivers![rv - 1], by = eco.closedRivers?.[rv];
    h += ` · <b>${x.name}</b> <button data-river="${rv}" title="Renomear rio"><i class=i-edit></i></button> <small>(navegável, ${x.length} hexes, deságua na zona marítima ${x.zone || "—"})</small>`;
    if (by) h += ` <small><b>Fechado</b> ao comércio dos outros por ${world.countries[by - 1].name}</small>`;
    if (by === active || (!by && active && holdsMouth(world, active, rv)))
      h += ` <button data-closeriver="${rv}" title="Quem controla a foz decide quem navega">${by ? "Reabrir o rio" : "Fechar o rio aos outros"}</button>`;
  }
  const ct = world.continent?.[i];
  if (ct) h += ` · continente <b>${world.continents![ct - 1].name}</b> <button data-continent="${ct}" title="Renomear continente"><i class=i-edit></i></button>`;
  h += ` · cabem ${fmt(popCap(world, eco, i))}` + (world.owner[i] ? ` · controle ${pct(eco.control[i])}` : "");
  if (active && world.owner[i] === active && !eco.urban[i] && isLand(world.terrain[i])) { // comprar como centro urbano da cidade vizinha
    const k = eco.cities.findIndex((cc) => cc.country === active && cc.urban.some((u) => hexDistance(u % W, (u / W) | 0, i % W, (i / W) | 0, W) === 1));
    if (k >= 0) { const ck = eco.cities[k], goal = (ck.popMark ?? ck.market.pop) * (1 + RULES.cityGrowthPct); h += `<br><small><i class=i-city></i> ${ck.name} ganha +1 hex com +${Math.round(RULES.cityGrowthPct * 100)}% de gente desde o último (${fmt(ck.market.pop)} de ${fmt(goal)}) ou com pontos administrativos sobrando.</small>`; }
  }
  if (world.owner[i] && isLand(world.terrain[i])) { // subsistência do hex (subsistence.ts)
    const c = eco.countries[world.owner[i] - 1], s = subsistAt(world, eco, i, c, 1 / 200, jobsAt(eco, i), BUILDINGS);
    h += `<br><small><b>${s.kind}</b> · sustenta ${fmt(s.capacity)} · vivem da terra ${fmt(s.dependants)} · pressão <b class="${s.pressure > 1 ? "up" : s.pressure < 0.8 ? "down" : ""}">${pct(s.pressure)}</b>` +
      ` · produz ${s.gross.toFixed(1)}/sem (come em casa ${s.self.toFixed(1)}, sobra ${s.surplus.toFixed(1)}${s.deficit > 0.05 ? `, falta ${s.deficit.toFixed(1)}` : ""}) · terra ocupada ${pct(s.land)}</small>`;
  }
  if (active && world.owner[i] === active && isLand(world.terrain[i]) && !eco.urban[i]) { // como no Civilization: escolher a cidade que trabalha este hex
    const near = eco.cities.filter((k) => k.country === active && hexDistance(k.hex % W, (k.hex / W) | 0, i % W, (i / W) | 0, W) <= 8);
    const manual = eco.hexCity?.[i];
    if (near.length) h += `<br><small>Cidade deste hex:</small> <select data-hexcity="${i}"><option value="-1"${manual === undefined ? " selected" : ""}>Automático${city ? ` (${city.name})` : " (sem cidade)"}</option>` +
      near.map((k) => `<option value="${k.hex}"${manual === k.hex ? " selected" : ""}>${k.name}</option>`).join("") + `</select>`;
  }
  const hst = city?.state !== undefined ? eco.states.find((s) => s.id === city.state) : undefined;
  if (hst) { // estado: população, PIB (valor do que os mercados oferecem) e qualidade de vida
    const cs = eco.cities.filter((k) => k.state === hst.id);
    const gdp = cs.reduce((s, k) => s + k.market.supply.reduce((a, q, g) => a + q * k.market.price[g], 0), 0);
    const pops = eco.countries[hst.country - 1].pops;
    h += `<br><i class=i-map></i> <b>${hst.name}</b> · ${cs.length} cidade(s) · pop ${fmt(cs.reduce((s, k) => s + k.market.pop, 0))} · PIB ${fmt(gdp)}/sem · QV ${Math.round(lowerClassQol(pops))} <small>(do país)</small> · lealdade ${Math.round(averageLoyalty(pops))}`;
  }
  if (world.owner[i] !== active || !active) {
    h += world.owner[i] ? `<br>Pertence a ${world.countries[world.owner[i] - 1].name}` : "<br>Sem dono";
    if (active && !world.owner[i] && isLand(world.terrain[i])) { // compra: hex livre colado no território
      let touches = false; forNeighbors(i % W, (i / W) | 0, W, world.H, (j) => { if (world.owner[j] === active) touches = true; });
      const rival = eco.influence?.[i];
      if (touches) h += ` <button data-buyhex="${i}" title="Preço sobe com o tamanho do país${rival && rival !== active ? `; ${world.countries[rival - 1].name} também se expande aqui: relação −${EXPAND.contested}` : ""}">Comprar hex (${hexPrice(world, eco, active)})</button>`;
    }
    if (net && world.owner[i] && !mp?.players.some((p) => p.country === world.owner[i])) h += ` <button data-act="claim">Assumir este país</button>`;
    if (active && world.owner[i] && world.owner[i] !== active) {
      const rel = relation(eco, active, world.owner[i]);
      h += `<br><i class=i-diplomacy></i> Relações: <b class="${rel < 0 ? "up" : "down"}">${Math.round(rel)}</b> · prestígio deles ${prestige(eco, world.owner[i])} <button data-improve="${world.owner[i]}" title="+${DIPLO.improve} de relação">Melhorar relações (${DIPLO.improveCost} <i class=i-admin></i>)</button>`;
    }
    if (active && world.owner[i] && !atWar(eco, active, world.owner[i])) {
      h += hasPact(eco, active, world.owner[i]) ? ` <button data-unpact="${world.owner[i]}">Cancelar acordo</button>` : ` <button data-pact="${world.owner[i]}">Propor acordo comercial</button>`;
      h += ` <button data-act="war">Declarar guerra</button>`;
    }
    if (eco.occupier[i]) h += `<br>Ocupado por ${world.countries[eco.occupier[i] - 1].name}`;
    return h + (message ? `<br><span class="bad">${message}</span>` : "");
  }
  const rows = buildingsFor(res, !!eco.urban[i], world.resource2[i]).filter((b) => { // o que não dá para construir aqui não aparece
    const tech = techFor(b);
    return eco.levels[b][i] > 0 || ((!tech || eco.countries[active - 1].research.known.has(tech)) && canBuild(world, eco, i, b, queuedLevels(eco, i, b)) === null);
  }).map((b) => {
    const def = BUILDINGS[b], lv = eco.levels[b][i];
    const tip = def.boosts !== undefined ? ` <small>(+${Math.round(def.mult! * 100)}% ${BUILDINGS[def.boosts].name}/nível)</small>`
      : def.industry?.construction ? ` <small>(materiais da era → pontos de construção)</small>`
      : def.industry ? ` <small>(${def.industry.inputs.map(([g, q]) => `${q} ${GOODS[g]}`).join(" + ")} → ${def.industry.admin ? `${def.industry.admin} pontos adm.` : def.industry.outputs.map(([g, q]) => `${q} ${GOODS[g]}`).join(" + ")})</small>` : "";
    const tech = techFor(b), locked = tech && !eco.countries[active - 1].research.known.has(tech);
    return `<tr><td>${artSVG("building", def.name)} ${def.name}${tip}</td><td>nv ${lv}</td><td>${def.workers} <i class=i-worker></i></td>` +
      `<td>${locked ? `<small><i class=i-lock></i> ${tech}</small>` : `<button data-build="${b}" title="Põe 1 nível na fila pública: ${cpCost(b)} PC; o dinheiro sai aos poucos">${lv ? "Melhorar" : "Construir"} ${buildCost(eco, b, i)}</button>${queuedLevels(eco, i, b) ? ` <small>+${queuedLevels(eco, i, b)} na fila</small>` : ""}`}</td></tr>`;
  });
  h += rows.length ? `<table>${rows.join("")}</table>` : "<br>Sem construções possíveis";
  if (world.owner[i] === active) for (const b of buildingsFor(res, !!eco.urban[i], world.resource2[i])) if (eco.levels[b][i]) {
    const key = methodKey(i, b);
    h += `<br><button data-sheet="${key}">${openSheet === key ? "Fechar" : "Ficha"}: ${BUILDINGS[b].name}</button>`;
    if (openSheet === key) h += sheetHtml(i, b);
  }
  for (let b = 1; b <= eco.countries.length; b++) if (atWar(eco, active, b)) {
    const s = airSuperiority(eco, airRegion(eco, i), active, b);
    h += `<br><i class=i-plane></i> Céu desta região contra ${world.countries[b - 1].name}: <b class="${s >= 0.5 ? "down" : "up"}">${pct(s)}</b> <small>(batalhas aqui: ${s >= 0.5 ? "+" : "−"}${Math.round(Math.abs(2 * s - 1) * AIR.bonus * 100)}%)</small>`;
  }
  if (eco.urban[i] && !eco.occupier[i]) h += `<br><small>Recrutar (${WAR.divisionSize} manpower):</small> ` + unitsFor(eco.countries[active - 1].research.known)
    .map((u) => `<button data-recruit="${u.name}" title="${u.cat} · ataque ${u.atk} · defesa ${u.def} · velocidade ${u.speed} · cerco ${u.siege}">${u.name} (${Math.round(WAR.recruitCost * u.cost)})</button>`).join(" ");
  if (eco.urban[i] && !eco.occupier[i] && coastOf(world, i) >= 0) h += eco.countries[active - 1].research.known.has(NAVY.tech)
    ? ` <small>Encomendar navio (${NAVY.sailors} marinheiros quando ficar pronto; estaleiro da cidade: ${YARDS[yardTier(eco, eco.market[selected] - 1) - 1] ?? "nenhum"}):</small> ` + craftsFor(SHIPS, eco.countries[active - 1].research.known).map((u) => `<button data-fleet="${u.name}" title="força ${u.power} · precisa de ${YARDS[(SHIP_YARD[u.name] ?? 1) - 1]} · ${Math.round(NAVAL.pointsPerCost * u.cost)} pontos navais">${u.name} (${Math.round(NAVY.cost * u.cost)})</button>`).join(" ") : ` <small><i class=i-lock></i> frota: ${NAVY.tech}</small>`;
  if (eco.urban[i] && !eco.occupier[i]) h += eco.countries[active - 1].research.known.has(AIR.tech)
    ? ` <small>Esquadrão (${AIR.pilots} manpower):</small> ` + craftsFor(PLANES, eco.countries[active - 1].research.known).map((u) => `<button data-air="${u.name}" title="força ${u.power}">${u.name} (${Math.round(AIR.cost * u.cost)})</button>`).join(" ") : "";
  if (city && eco.urban[i]) {
    const ci = eco.market[i] - 1, st = stateOfCity(eco, ci), lock = statesLocked(eco, active);
    if (st) h += `<br><i class=i-map></i> Estado: <b>${st.name}</b>${st.country === active ? ` <button data-rename="state:${st.id}" title="Renomear"><i class=i-edit></i></button>` : ""} · ${st.interest} ${st.happy ? "<i class=i-smile></i>" : "<span class='bad'><i class=i-frown></i> insatisfeito</span>"}` + (lock ? "" : ` <button data-state-leave="${ci}">Sair do estado</button>`);
    else if (!lock) h += `<br><i class=i-map></i> Sem estado: <button data-state-new="${ci}">Criar estado</button>` +
      statesOf(eco, active).map((x) => ` <button data-state-join="${ci}|${x.id}">Juntar a ${x.name}</button>`).join("");
    if (lock && !st) h += `<br><small><i class=i-map></i> ${lock}</small>`;
  }
  if (city) { const k = eco.cities.indexOf(city); if (eco.famine?.[k]) h += `<br><span class="bad"><i class=i-bread></i> Fome em ${city.name}</span>`; if ((eco.plague?.[k] ?? 0) > 0) h += `<br><span class="bad"><i class=i-skull></i> Peste em ${city.name} (${eco.plague![k]} semanas)</span>`; }
  if (city && city.country === active) {
    h += regionalPoliciesHtml(eco.cities.indexOf(city));
  }
  if (city?.isolated) h += `<br><span class="warn">${city.name} está isolada: sem ligação por terra com a capital (nem porto). Controle máximo × ${EXPAND.isolation}. Ocupe o caminho entre elas ou faça um porto.</span>`;
  if ((eco.outposts ?? []).some((o) => o.hex === i)) h += `<br><i class=i-tent></i> Posto avançado`;
  if (!world.owner[i] && eco.influence?.[i]) h += `<br><small>Área de influência de ${world.countries[eco.influence[i] - 1].name}</small>`;
  if (city?.blockaded) h += `<br><span class="bad"><i class=i-anchor></i> ${city.name} bloqueada por frota inimiga: sem comércio exterior</span>`;
  if (eco.occupier[i]) h += `<br><span class="bad">Ocupado por ${world.countries[eco.occupier[i] - 1].name}</span>`;
  if (city && eco.urban[i]) {
    const others = eco.cities.map((k, idx) => [k, idx] as const).filter(([k]) => k.country === city.country && k !== city);
    { const k = eco.cities.indexOf(city), lv = city.road ?? 0;
      const hb = city.harbor ?? 0;
      if (city.coast || city.port) h += `<br><i class=i-anchor></i> Porto nível ${hb}/${maxHarbor(eco, city.country)} <small>(+${Math.round(RULES.harborTrade * hb * 100)}% comércio${hb ? ", alcance do comércio exterior ×2" : ""})</small>` + (city.country === active && hb < maxHarbor(eco, city.country) ? ` <button data-harbor="${k}">Melhorar (${RULES.harborCost * (hb + 1)})</button>` : "");
      h += `<br><i class=i-road></i> Estrada nível ${lv}/${maxRoad(eco, city.country)} <small>(+${Math.round(RULES.roadTrade * lv * 100)}% comércio terrestre, +${Math.round(RULES.roadControl * lv * 100)}% controle)</small>` + (city.country === active && lv < maxRoad(eco, city.country) ? ` <button data-road="${k}">Melhorar (${RULES.roadCost * (lv + 1)})</button>` : ""); }
    if (city.identity) {
      const main = (m: Record<number, number>) => +Object.entries(m).sort((a, b) => b[1] - a[1])[0][0];
      const acc = acceptedShare(eco, eco.cities.indexOf(city));
      h += `<br><i class=i-mask></i> ${cultureName(world, main(city.identity.culture))} · <i class=i-speech></i> ${languageName(main(city.identity.language))} · <i class=i-church></i> ${RELIGIONS[main(city.identity.religion)]}` +
        (acc < 0.99 ? ` <span class="bad">(${pct(1 - acc)} de cultura não aceita)</span>` : "");
    }
    h += `<br><b>${city.name}</b>${city.country === active ? ` <button data-rename="city:${eco.cities.indexOf(city)}" title="Renomear"><i class=i-edit></i></button>` : ""} · tamanho ${city.size} · pop urbana ${fmt(city.urban.reduce((s, j) => s + world.pop[j], 0))}` +
      ` <small>(cresce comprando centro urbano vizinho)</small>` +
      (others.length && city.size > 1 ? `<br>Passar 1 de tamanho para: ${others.map(([k, idx]) => `<button data-transfer="${idx}">${k.name}</button>`).join(" ")}` : "");
  }
  return h + (message ? `<br><span class="bad">${message}</span>` : "");
}

// ---- Mercado e Comércio (markets.ts): nacional, locais, internacional, nós, estruturas e complexidade
let mTab = 0;
function tradeView() {
  const tabs = `<div class="tabs">${["Nacional", "Mercados locais", "Internacional", "Nós comerciais", "Estruturas comerciais", "Complexidade"].map((n, k) => `<button data-mtab="${k}" class="${k === mTab ? "on" : ""}">${n}</button>`).join(" ")}</div>`;
  const c = eco.countries[active - 1], ks = eco.cities.filter((k) => k.country === active);
  const sum = (f: (k: (typeof ks)[number]) => number) => ks.reduce((s, k) => s + f(k), 0);
  if (mTab === 0) {
    const rows = [];
    for (let g = 1; g < GOODS.length; g++) {
      const sup = sum((k) => k.market.supply[g]), dem = sum((k) => k.market.demand[g] + k.market.used[g]), st = sum((k) => k.market.stock?.[g] ?? 0);
      if (sup < 0.05 && dem < 0.05) continue;
      const p = sum((k) => k.market.price[g] * k.market.pop) / Math.max(1, sum((k) => k.market.pop));
      rows.push(`<tr><td>${artSVG("good", GOODS[g], 14)} ${GOODS[g]}</td><td>${fmt(sup)}</td><td>${fmt(dem)}</td><td>${fmt(st)}</td><td class="${p > 1.05 ? "up" : p < 0.95 ? "down" : ""}">${(BASE_PRICE[g] * p).toFixed(1)}</td></tr>`);
    }
    return tabs + `<small>Exportações ${fmt(c.exports)} · importações ${fmt(c.imports)} · tarifas ${fmt(c.tariffs)} por semana. Preço médio ponderado pela população das cidades.</small>` +
      `<table><tr><td><b>Bem</b></td><td><b>Oferta</b></td><td><b>Demanda</b></td><td><b title="guardado nas cidades: volta à venda aos poucos; comida estraga">Estoque</b></td><td><b>Preço</b></td></tr>${rows.join("")}</table>`;
  }
  if (mTab === 1) {
    const list = ks.map((k) => `<tr><td><button data-goto="${k.hex}">${k.name}</button></td><td>${fmt(k.market.pop)}</td><td>${Math.round((k.access ?? 1) * 100)}%</td><td><small>${k.node ?? "—"}</small></td></tr>`).join("");
    return tabs + `<small>Acesso ao mercado nacional: era, estradas, porto ou rio, estruturas comerciais e distância da capital. Cidade sem acesso vive do que tem.</small>` +
      `<table><tr><td><b>Cidade</b></td><td><b>Pessoas</b></td><td><b>Acesso</b></td><td><b>Nó</b></td></tr>${list}</table>` + (selected >= 0 && cityOf(selected) ? marketHtml() : "<small>Clique numa cidade sua para ver o mercado dela.</small>");
  }
  if (mTab === 2) {
    const rows = [];
    for (let g = 1; g < GOODS.length; g++) {
      const pol = policyOf(c, g), net = sum((k) => k.market.supply[g] - k.market.demand[g] - k.market.used[g]);
      rows.push(`<tr><td>${artSVG("good", GOODS[g], 14)} ${GOODS[g]}</td><td class="${net > 0 ? "down" : net < 0 ? "up" : ""}">${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}</td>` +
        `<td><select data-tpol="${GOODS[g]}">${POLICIES.map((p) => `<option${p === pol ? " selected" : ""}>${p}</option>`).join("")}</select></td></tr>`);
    }
    return tabs + pactsHtml() + `<p>Tarifa de importação: <input id="tariff" type="number" min="0" max="50" step="1" value="${Math.round((c.tariffRate ?? RULES.tariff) * 100)}" style="width:4em">% <small>(tarifa alta arrecada mais, mas reduz a vantagem comercial)</small></p>` +
      `<table><tr><td><b>Bem</b></td><td><b title="oferta menos demanda no país">Saldo</b></td><td><b>Política</b></td></tr>${rows.join("")}</table>`;
  }
  if (mTab === 3) {
    const nodes = (eco.tradeNodes ?? []).filter((n) => n.power[active]).map((n) => {
      const tot = Object.values(n.power).reduce((s, v) => s + v, 0);
      const top = Object.entries(n.power).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${world.countries[+k - 1]?.name ?? k} ${Math.round((v / tot) * 100)}%`).join(", ");
      return `<tr><td>${n.name}<br><small>${n.kind} · ${n.cities} cidades</small></td><td>${Math.round((n.power[active] / tot) * 100)}%</td><td><small>${top}</small></td></tr>`;
    }).join("");
    return tabs + `<small>Nó comercial não é mercado: é onde o poder comercial (população, portos, estradas, estruturas) disputa o comércio. Mais parte do poder, mais do excedente sai para os parceiros.</small>` +
      `<table><tr><td><b>Nó</b></td><td><b>Sua parte</b></td><td><b>Maiores</b></td></tr>${nodes || "<tr><td colspan=3><i>Sem nós ainda.</i></td></tr>"}</table>`;
  }
  if (mTab === 4) {
    const rows = BUILDINGS.map((d, b) => ({ d, b, cm: commerceOf(b) })).filter((r) => r.cm).map(({ d, b, cm }) => {
      const lv = ks.reduce((s, k) => s + k.urban.reduce((t, j) => t + eco.levels[b][j], 0), 0);
      return `<tr><td>${artSVG("building", d.name, 16)} ${d.name}</td><td>${lv}</td><td>+${cm!.storage}</td><td>+${Math.round(cm!.access * 100)}%</td><td>+${cm!.power}</td></tr>`;
    }).join("");
    return tabs + `<small>Construa pelo menu Construções. Cada nível soma estoque por bem, acesso ao mercado nacional (até +40%) e poder comercial no nó.</small>` +
      `<table><tr><td><b>Estrutura</b></td><td><b>Níveis</b></td><td><b>Estoque</b></td><td><b>Acesso</b></td><td><b>Poder</b></td></tr>${rows}</table>`;
  }
  const cx = c.complexity ?? 0, ex = ["Fazenda", "Serraria", "Siderúrgica", "Fábrica de eletrônicos"].map((n) => BUILDINGS.findIndex((d) => d.name === n)).filter((b) => b >= 0);
  return tabs + `<h3>Complexidade da Economia: ${Math.round(cx)} / 1000</h3><small>Sobe com tecnologias conhecidas, bens diferentes produzidos e urbanização; anda devagar. Não é ineficiência: economia complexa produz mais coisas, mas construir coisas sofisticadas custa mais.</small>` +
    `<table><tr><td><b>Construção</b></td><td><b>Impacto</b></td><td><b>Custo a mais agora</b></td></tr>${ex.map((b) => `<tr><td>${BUILDINGS[b].name}</td><td>${Math.round(complexityImpact(b) * 100)}%</td><td>+${Math.round((complexityCost(c, b) - 1) * 100)}%</td></tr>`).join("")}</table>` +
    `<small>Estoque por bem por tamanho de cidade: ${MARKET.storagePerSize}. Impacto = custo a mais com complexidade 1000.</small>`;
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
    const nh = nodesOf().hex[z] >= 0 ? nodesOf().hex[z] : selected; // lago sem nó: escreve onde clicou
    const [lx, ly] = hexCenter(nh % W, (nh / W) | 0);
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
/** Mapa de recursos: hex com 2 produtos ganha a metade esquerda na cor do segundo (o shader pinta só 1 cor). */
function drawSecondResources() {
  if (mode !== 3 || cam.zoom < 4) return;
  const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(window.innerWidth, window.innerHeight);
  const r0 = Math.max(0, Math.floor(y0 / 1.5) - 1), r1 = Math.min(H - 1, Math.ceil(y1 / 1.5) + 1);
  const c0 = Math.floor(x0 / SQRT3) - 1, c1 = Math.ceil(x1 / SQRT3) + 1;
  const k = SQRT3 / 2;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const i = r * W + wrapCol(c, W), g = world.resource2[i];
    if (!g || (active && !canSee(i))) continue;
    const [cx, cy] = hexCenter(c, r), [sx, sy] = worldToScreen(cx, cy), z = cam.zoom;
    units.fillStyle = `rgb(${RES_COLORS[g]})`;
    units.beginPath(); // metade esquerda: topo → cima-esquerda → baixo-esquerda → base
    units.moveTo(sx, sy - z); units.lineTo(sx - k * z, sy - 0.5 * z); units.lineTo(sx - k * z, sy + 0.5 * z); units.lineTo(sx, sy + z); units.closePath();
    units.fill();
  }
}
/** Cidade selecionada: contorno branco da área que ela atende e hexes urbanos piscando de leve (a grade continua visível). */
let cityArea: { key: string; segs: number[]; urban: number[] } | null = null;
function drawCityArea() {
  const k = selected >= 0 && isLand(world.terrain[selected]) ? eco.market[selected] : 0;
  if (!k) return;
  const key = `${k}:${eco.version}`;
  if (cityArea?.key !== key) {
    const hexes = [...eco.owned].filter((j) => eco.market[j] === k);
    cityArea = { key, segs: outline(world, hexes, (j) => eco.market[j] === k), urban: eco.cities[k - 1].urban };
  }
  const a = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(performance.now() / 350)), z = cam.zoom, hw = (SQRT3 / 2) * z;
  units.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
  units.beginPath();
  for (const u of cityArea.urban) {
    const [sx, sy] = worldToScreen(...hexCenter(u % W, (u / W) | 0));
    units.moveTo(sx, sy - z); units.lineTo(sx + hw, sy - z / 2); units.lineTo(sx + hw, sy + z / 2); units.lineTo(sx, sy + z); units.lineTo(sx - hw, sy + z / 2); units.lineTo(sx - hw, sy - z / 2); units.closePath();
  }
  units.fill();
  units.strokeStyle = "#ffffffcc"; units.lineWidth = 2; units.setLineDash([6, 4]); units.beginPath();
  for (let s = 0; s < cityArea.segs.length; s += 4) {
    const [x1, y1] = worldToScreen(cityArea.segs[s], cityArea.segs[s + 1]);
    units.moveTo(x1, y1); units.lineTo(x1 + (cityArea.segs[s + 2] - cityArea.segs[s]) * z, y1 + (cityArea.segs[s + 3] - cityArea.segs[s + 1]) * z);
  }
  units.stroke(); units.setLineDash([]);
}
function drawRegions() {
  drawSecondResources();
  if (!world.continents) generateContinents(world); // save de antes dos continentes
  if (!world.rivers) generateRiverSystems(world); // save de antes dos rios com nome
  if (cam.zoom >= 5) for (const rv of world.rivers!) { // nome do rio navegável, de perto
    const [x, y] = worldToScreen(...hexCenter(rv.hex % W, (rv.hex / W) | 0));
    if (x < -100 || y < -20 || x > unitsCanvas.width + 100 || y > unitsCanvas.height + 20 || (active && !explored.get(active)?.[rv.hex])) continue;
    units.font = "italic 600 13px serif"; units.textAlign = "center"; units.textBaseline = "middle";
    units.strokeStyle = "#0008"; units.lineWidth = 3; units.strokeText(rv.name, x, y);
    units.fillStyle = "#9fd0ff"; units.fillText(rv.name, x, y);
  }
  if (cam.zoom < 2.5) for (const k of world.continents!) { // nomes dos continentes, de longe
    const [x, y] = worldToScreen(...hexCenter(k.hex % W, (k.hex / W) | 0));
    units.font = "italic bold 18px serif"; units.textAlign = "center"; units.textBaseline = "middle";
    units.strokeStyle = "#0009"; units.lineWidth = 4; units.strokeText(k.name.toUpperCase(), x, y);
    units.fillStyle = "#f4ecd0"; units.fillText(k.name.toUpperCase(), x, y);
  }
  drawCityArea();
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
  for (const b of eco.battles ?? []) { // batalha em andamento: duas espadas cruzadas em vermelho sobre o hex
    if (b.state !== "combate" || (active && !explored.get(active)?.[b.hex])) continue; // só onde o jogador já viu
    const [x, y] = toScreen(b.hex), r = Math.max(6, Math.min(14, cam.zoom * 0.7));
    units.strokeStyle = "#cf6b62"; units.lineWidth = 2.5; units.beginPath();
    units.moveTo(x - r, y - r); units.lineTo(x + r, y + r); units.moveTo(x + r, y - r); units.lineTo(x - r, y + r); units.stroke();
  }
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
  if (r >= 5) for (const o of eco.outposts ?? []) { // posto avançado: triângulo pequeno na cor do país
    if (o.country !== active && !canSee(o.hex)) continue;
    const [x, y] = toScreen(o.hex);
    units.fillStyle = `rgb(${world.countries[o.country - 1].color})`; units.strokeStyle = "#000"; units.lineWidth = 1.2;
    units.beginPath(); units.moveTo(x, y - r * 0.7); units.lineTo(x + r * 0.6, y + r * 0.45); units.lineTo(x - r * 0.6, y + r * 0.45); units.closePath(); units.fill(); units.stroke();
  }
  const stack = new Map<number, number>(), mil = special === "military"; // modo Militar: setas de todas as ordens e pilhas agrupadas
  for (const d of eco.divisions) {
    if (d.country !== active && !canSee(d.hex)) continue;
    const [sx, sy] = toScreen(d.hex);
    if (sx < -r || sy < -r || sx > unitsCanvas.width + r || sy > unitsCanvas.height + r) continue;
    const n = stack.get(d.hex) ?? 0; stack.set(d.hex, n + 1);
    const x = sx + n * r * 0.6, y = sy - n * r * 0.6;
    const sel = d.id === selectedDiv || group.includes(d.id);
    if (d.target !== null && (sel || (mil && d.country === active))) {
      const [tx, ty] = toScreen(d.target), hostile = world.owner[d.target] && world.owner[d.target] !== d.country;
      units.strokeStyle = sel ? "#fff" : hostile ? "#e86a5a" : "#8cc8ff"; units.lineWidth = mil ? 2 : 1; units.setLineDash(hostile ? [] : [4, 4]);
      units.beginPath(); units.moveTo(x, y); units.lineTo(tx, ty); units.stroke(); units.setLineDash([]);
      if (mil) { const a = Math.atan2(ty - y, tx - x), h = Math.max(6, r * 0.8); units.beginPath(); units.moveTo(tx, ty); units.lineTo(tx - h * Math.cos(a - 0.4), ty - h * Math.sin(a - 0.4)); units.moveTo(tx, ty); units.lineTo(tx - h * Math.cos(a + 0.4), ty - h * Math.sin(a + 0.4)); units.stroke(); } // ofensiva: seta cheia vermelha; avanço/defesa: azul tracejada
    }
    if (mil && n >= 3 && !sel) continue; // pilha grande: o resto vira o número do grupo
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
  if (mil) for (const [hex, n] of stack) if (n > 3) { // grupo: quantas unidades há no hex
    const [sx, sy] = toScreen(hex), x = sx + 3 * r * 0.6 + r, y = sy - 3 * r * 0.6 - r;
    units.fillStyle = "#1b1e24"; units.strokeStyle = "#ffd76a"; units.lineWidth = 1.5; units.beginPath(); units.arc(x, y, Math.max(7, r * 0.7), 0, Math.PI * 2); units.fill(); units.stroke();
    units.fillStyle = "#ffd76a"; units.font = `bold ${Math.max(9, Math.round(r * 0.7))}px sans-serif`; units.textAlign = "center"; units.textBaseline = "middle"; units.fillText(`${n}`, x, y);
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
    advanceWeek(world, eco); afterWeek();
    tickMs = performance.now() - t;
  }
  if (eco.version !== drawnVersion || (mode >= 2 && mode !== 3 && mode !== 5 && eco.week % 4 === 0 && frames === 0) /* camadas que mudam com o tempo */) recolor(); // cidades cresceram / população mudou
  refreshFog();
  renderer.draw(cam.x, cam.y, cam.zoom, hover[0], hover[1], Math.cos((2 * Math.PI * (eco.week % 52)) / 52), active > 0);
  drawUnits();
  watchEvents();
  watchChoice();
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
