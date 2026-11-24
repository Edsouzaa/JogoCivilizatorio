// Servidor de salas do multiplayer (roda no PC de quem hospeda: npm run server).
// Lockstep: o servidor simula e manda a cada semana só os comandos dos jogadores; cada navegador aplica os mesmos
// comandos e simula igual. Quem entra recebe uma foto (save) e segue a partir dela. Uma vez por ano vai uma soma de
// conferência; navegador que divergir pede a foto de novo.
// Mensagens do cliente são dados não confiáveis: tudo é validado (formato, tamanhos, dono do país).
import { WebSocketServer, type WebSocket } from "ws";
import { generateWorld, type World } from "../src/world.ts";
import { createEconomy, type Economy } from "../src/economy.ts";
import { advanceWeek, checksum } from "../src/sim.ts";
import { CHOICES } from "../src/choices.ts";
import { applyCommand, type Cmd } from "../src/commands.ts";
import { saveGame, loadGame } from "../src/save.ts";
import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
import { join as joinPath, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync as fs_exists } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ERA_WEEKS_PER_SECOND } from "../src/tech.ts";

export const MP = {
  port: Number(process.env.PORT) || 8787, maxPlayers: 20, speeds: [0, 0.5, 1, 3, 10, 30], tickMs: 50, maxMsgBytes: 4096,
  saveDir: process.env.SAVE_DIR || joinPath(dirname(fileURLToPath(import.meta.url)), "saves"),
  saveEveryMs: Number(process.env.SAVE_EVERY_MS) || 5 * 60 * 1000, // de jogo rodando
  choiceTimeoutMs: Number(process.env.CHOICE_TIMEOUT_MS) || CHOICES.timeoutMs, // sem resposta ao evento: escolhe a 1ª opção
};
const CODE = /^[A-Z]{4}$/; // o código vira nome de arquivo: só 4 letras, nada de caminho
export const CHAT = { maxLen: 200, minGapMs: 500 };
const MAX_PASS_TRIES = 5;

/** Senha nunca fica em texto: só sal + hash scrypt, comparado em tempo constante. */
type Pass = { salt: string; hash: string };
const hashPass = (pw: string): Pass => { const salt = randomBytes(16); return { salt: salt.toString("hex"), hash: scryptSync(pw, salt, 32).toString("hex") }; };
const checkPass = (pw: string, p: Pass) => timingSafeEqual(scryptSync(pw, Buffer.from(p.salt, "hex"), 32), Buffer.from(p.hash, "hex"));
const cleanText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[<>&"'\u0000-\u001f]/g, "").trim().slice(0, max) : "");

type Player = { ws: WebSocket; id: number; name: string; country: number; syncing: boolean; buffer: string[]; lastChat: number };
export type Room = {
  code: string; world: World; eco: Economy; players: Player[];
  speed: number; paused: { by: number } | null; votes: Set<number>;
  pending: [number, Cmd, Player][]; acc: number;
  runningMs: number; // tempo rodando desde o último save em disco
  eventSeen: Map<string, number>;
  voteSeen?: Set<number>; // votações de nome já vistas (pausam a sala uma vez) // "país:semana" do evento pendente → quando apareceu (prazo de 2 min)
  pass: Pass | null; // senha da sala (opcional)
};

const roomFile = (code: string) => joinPath(MP.saveDir, `${code}.save`);
const metaFile = (code: string) => joinPath(MP.saveDir, `${code}.json`); // senha (hash) da sala salva

/** Grava a sala em disco (arquivo temporário e depois renomeia: um desligamento no meio não corrompe o save). */
export async function saveRoom(r: Room) {
  if (!CODE.test(r.code)) return;
  const blob = await saveGame({ world: r.world, eco: r.eco, ui: { active: 0, cam: { x: 0, y: 0, zoom: 0 }, mode: 0, speed: r.speed, explored: [] } });
  await mkdir(MP.saveDir, { recursive: true });
  const file = roomFile(r.code), tmp = file + ".tmp";
  await writeFile(tmp, new Uint8Array(await blob.arrayBuffer()));
  await rename(tmp, file);
  await writeFile(metaFile(r.code), JSON.stringify({ pass: r.pass }));
}

/** Reabre uma sala salva: volta pausada e com todos os países na IA até os jogadores assumirem de novo. */
async function openSavedRoom(code: string): Promise<Room | null> {
  if (!CODE.test(code)) return null;
  let data: Buffer;
  try { data = await readFile(roomFile(code)); } catch { return null; }
  const d = await loadGame(new Blob([new Uint8Array(data)]));
  d.eco.humans = [];
  let pass: Pass | null = null;
  try { const meta = JSON.parse(await readFile(metaFile(code), "utf8")); if (meta?.pass?.salt && meta?.pass?.hash) pass = meta.pass; } catch { /* sala sem senha */ }
  const r: Room = { code, world: d.world, eco: d.eco, players: [], speed: d.ui.speed || 2, paused: { by: 0 }, votes: new Set(), pending: [], acc: 0, runningMs: 0, eventSeen: new Map(), pass };
  rooms.set(code, r);
  return r;
}

const rooms = new Map<string, Room>();
let nextId = 1;

const code = (): string => {
  for (;;) {
    const c = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[(Math.random() * 24) | 0]).join("");
    if (!rooms.has(c) && !fs_exists(roomFile(c))) return c;
  }
};
const send = (p: Player, o: unknown) => { const s = JSON.stringify(o); if (p.syncing) p.buffer.push(s); else if (p.ws.readyState === 1) p.ws.send(s); };
const broadcast = (r: Room, o: unknown) => { for (const p of r.players) send(p, o); };
const worldEra = (e: Economy) => Math.max(...e.countries.map((c) => c.research.era));

function status(r: Room) {
  broadcast(r, {
    t: "status", code: r.code, speed: r.speed, paused: r.paused ? (r.paused.by === -1 ? "evento ou votação" : r.players.find((p) => p.id === r.paused!.by)?.name ?? "?") : null,
    votes: r.votes.size, needed: Math.floor((r.players.length - 1) / 2) + 1,
    players: r.players.map((p) => ({ id: p.id, name: p.name, country: p.country })),
  });
}

/** Manda a foto da partida para o jogador; os passos que acontecerem enquanto comprime ficam guardados e vão depois. */
async function sync(r: Room, p: Player) {
  p.syncing = true; p.buffer = [];
  // saveGame transforma o estado em JSON antes do primeiro await: a foto é exatamente a desta semana
  const blob = await saveGame({ world: r.world, eco: r.eco, ui: { active: 0, cam: { x: 0, y: 0, zoom: 0 }, mode: 0, speed: 0, explored: [] } });
  if (p.ws.readyState !== 1) return;
  p.ws.send(new Uint8Array(await blob.arrayBuffer()));
  p.syncing = false;
  for (const s of p.buffer) p.ws.send(s);
  p.buffer = [];
}

function join(r: Room, ws: WebSocket, name: string) {
  const p: Player = { ws, id: nextId++, name, country: 0, syncing: false, buffer: [], lastChat: 0 };
  r.players.push(p);
  send(p, { t: "welcome", code: r.code, id: p.id, w: r.world.W, h: r.world.H });
  sync(r, p);
  status(r);
  return p;
}

function leave(r: Room, p: Player) {
  r.players = r.players.filter((x) => x !== p);
  r.votes.delete(p.id);
  if (p.country) r.pending.push([p.country, { t: "release" }, p]); // o país volta para a IA
  if (r.paused?.by === p.id) r.paused = null; // quem pausou saiu: despausa
  if (!r.players.length) { // sala vazia: guarda em disco e libera a memória
    rooms.delete(r.code);
    saveRoom(r).catch((err) => console.error(`falha ao salvar a sala ${r.code}:`, err));
  } else status(r);
}

const cleanName = (v: unknown) => cleanText(v, 24) || "Jogador";
const intIn = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export async function handle(ws: WebSocket, raw: string, state: { room?: Room; player?: Player; tries?: number }) {
  let m: any;
  try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== "object") return;
  const { room: r, player: p } = state;
  if (m.t === "create" && !r) {
    const W = intIn(m.w, 50, 1600) ? m.w : 1600, H = intIn(m.h, 30, 640) ? m.h : 640;
    const seed = intIn(m.seed, 0, 2 ** 31) ? m.seed : (Math.random() * 2 ** 31) | 0;
    const world = generateWorld(W, H, seed);
    const pw = typeof m.password === "string" ? m.password.slice(0, 64) : "";
    const room: Room = { code: code(), world, eco: createEconomy(world), players: [], speed: 2, paused: { by: 0 }, votes: new Set(), pending: [], acc: 0, runningMs: 0, eventSeen: new Map(), pass: pw ? hashPass(pw) : null };
    rooms.set(room.code, room);
    state.room = room; state.player = join(room, ws, cleanName(m.name));
    room.paused = { by: state.player.id }; // começa pausado por quem criou
    status(room);
  } else if (m.t === "join" && !r) {
    const c = String(m.code ?? "").toUpperCase();
    let room = rooms.get(c);
    if (!room) {
      try { room = (await openSavedRoom(c)) ?? undefined; } catch { return ws.send(JSON.stringify({ t: "err", msg: "O save dessa sala está corrompido" })); }
      if (state.room || ws.readyState !== 1) { // entrou em outra sala ou desconectou enquanto lia o disco
        if (room && !room.players.length) rooms.delete(c);
        return;
      }
    }
    if (!room) return ws.send(JSON.stringify({ t: "err", msg: "Sala não encontrada" }));
    if (room.players.length >= MP.maxPlayers) return ws.send(JSON.stringify({ t: "err", msg: `Sala cheia (${MP.maxPlayers} jogadores)` }));
    if (room.pass && !checkPass(typeof m.password === "string" ? m.password.slice(0, 64) : "", room.pass)) {
      state.tries = (state.tries ?? 0) + 1;
      ws.send(JSON.stringify({ t: "err", msg: room.pass && typeof m.password === "string" && m.password ? "Senha errada" : "Essa sala tem senha" }));
      if (state.tries >= MAX_PASS_TRIES) ws.close(); // muitas tentativas: derruba a conexão
      if (!room.players.length) rooms.delete(room.code); // reaberta só para conferir: libera
      return;
    }
    state.room = room; state.player = join(room, ws, cleanName(m.name));
  } else if (r && p) {
    if (m.t === "claim") {
      if (!intIn(m.country, 1, r.eco.countries.length)) return;
      if (r.players.some((x) => x !== p && x.country === m.country)) return send(p, { t: "err", msg: "Outro jogador já controla esse país" });
      if (p.country) r.pending.push([p.country, { t: "release" }, p]);
      p.country = m.country;
      r.pending.push([p.country, { t: "claim" }, p]);
      status(r);
    } else if (m.t === "cmd" && p.country && m.cmd && typeof m.cmd.t === "string" && m.cmd.t !== "claim" && m.cmd.t !== "release") {
      if (m.cmd.t === "choose" && r.paused) applyNow(r, p.country, m.cmd as Cmd); // com a sala pausada também
      else r.pending.push([p.country, m.cmd as Cmd, p]);
    } else if (m.t === "pause" && !r.paused) {
      r.paused = { by: p.id }; r.votes.clear(); status(r);
    } else if (m.t === "unpause" && r.paused) {
      if (r.paused.by === p.id) r.paused = null; // quem pausou despausa
      else {
        r.votes.add(p.id); // os outros despausam por maioria
        if (r.votes.size >= Math.floor((r.players.length - 1) / 2) + 1) r.paused = null;
      }
      if (!r.paused) r.votes.clear();
      status(r);
    } else if (m.t === "speed" && intIn(m.i, 1, MP.speeds.length - 1)) {
      r.speed = m.i; status(r);
    } else if (m.t === "resync") sync(r, p);
    else if (m.t === "chat") {
      const text = cleanText(m.text, CHAT.maxLen), now = Date.now();
      if (!text || now - p.lastChat < CHAT.minGapMs) return; // vazio ou rápido demais: ignora
      p.lastChat = now;
      broadcast(r, { t: "chat", from: p.name, country: p.country, week: r.eco.week, text });
    }
  }
}

/** Avança a sala uma semana: aplica os comandos (na ordem de chegada), simula e manda os comandos para todos. */
export function step(r: Room) {
  const cmds = r.pending.splice(0);
  const sent: [number, Cmd][] = [];
  for (const [country, cmd, from] of cmds) {
    const err = applyCommand(r.world, r.eco, country, cmd);
    sent.push([country, cmd]); // inclusive os que falharam: os navegadores chegam ao mesmo erro sozinhos
    if (err && from.ws.readyState === 1 && (cmd.t !== "claim" && cmd.t !== "release")) send(from, { t: "err", msg: err });
  }
  advanceWeek(r.world, r.eco);
  broadcast(r, { t: "step", week: r.eco.week, cmds: sent });
  // evento novo para um jogador: pausa a sala (despausa por votação, como qualquer pausa) e marca a hora
  for (const [k, ev] of Object.entries(r.eco.choices ?? {})) {
    const key = `${k}:${ev.week}`;
    if (r.eventSeen.has(key) || !r.players.some((p) => p.country === +k)) continue;
    r.eventSeen.set(key, Date.now());
    if (!r.paused) { r.paused = { by: -1 }; r.votes.clear(); status(r); } // -1 = pausa do evento (ninguém é dono)
  }
  for (const v of r.eco.votes ?? []) { // votação nova (nome de continente): também pausa para todos votarem
    if ((r.voteSeen ??= new Set()).has(v.id)) continue;
    r.voteSeen.add(v.id);
    if (!r.paused) { r.paused = { by: -1 }; r.votes.clear(); status(r); }
  }
  if (r.eco.week % 52 === 0) broadcast(r, { t: "check", week: r.eco.week, sum: checksum(r.eco) });
}

export function startServer(port = MP.port) {
  const wss = new WebSocketServer({ port, maxPayload: MP.maxMsgBytes });
  wss.on("connection", (ws) => {
    const state: { room?: Room; player?: Player } = {};
    ws.on("message", (data, isBinary) => { if (!isBinary) handle(ws, data.toString(), state).catch((err) => console.error("erro na mensagem:", err)); });
    ws.on("close", () => { if (state.room && state.player) leave(state.room, state.player); });
  });
  const loop = setInterval(() => {
    for (const r of rooms.values()) {
      for (const [key, t] of r.eventSeen) { // 2 minutos sem resposta: o servidor escolhe a 1ª opção
        const [k, wk] = key.split(":").map(Number);
        if (r.eco.choices?.[k]?.week !== wk) { r.eventSeen.delete(key); continue; }
        if (Date.now() - t >= MP.choiceTimeoutMs) { r.eventSeen.delete(key); applyNow(r, k, { t: "choose", option: 0 }); }
      }
      if (r.paused) continue;
      r.runningMs += MP.tickMs;
      if (r.runningMs >= MP.saveEveryMs) { r.runningMs = 0; saveRoom(r).catch((err) => console.error(`falha ao salvar a sala ${r.code}:`, err)); }
      r.acc = Math.min(r.acc + (MP.tickMs / 1000) * MP.speeds[r.speed] * ERA_WEEKS_PER_SECOND[worldEra(r.eco)], 10);
      for (; r.acc >= 1; r.acc--) step(r);
    }
  }, MP.tickMs);
  wss.on("close", () => clearInterval(loop));
  return wss;
}

/** Comando que vale mesmo com a sala pausada (resposta a evento): aplica e manda já, sem avançar a semana. */
function applyNow(r: Room, country: number, cmd: Cmd) {
  applyCommand(r.world, r.eco, country, cmd);
  broadcast(r, { t: "cmds", week: r.eco.week, cmds: [[country, cmd]] });
}

/** Salva todas as salas abertas (ao fechar o servidor). */
export const saveAll = () => Promise.all([...rooms.values()].map((r) => saveRoom(r).catch((err) => console.error(`falha ao salvar a sala ${r.code}:`, err))));

if (process.argv[1]?.endsWith("server.ts")) {
  startServer();
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, async () => {
    console.log("Salvando as salas...");
    await saveAll();
    process.exit(0);
  });
  console.log(`Salas salvas em ${MP.saveDir}`);
  console.log(`Servidor do Jogo Civilizatório na porta ${MP.port}. Os jogadores conectam em ws://<IP deste PC>:${MP.port}`);
}
