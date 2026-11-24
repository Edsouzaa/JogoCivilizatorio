// Servidor de salas do multiplayer (roda no PC de quem hospeda: npm run server).
// Lockstep: o servidor simula e manda a cada semana só os comandos dos jogadores; cada navegador aplica os mesmos
// comandos e simula igual. Quem entra recebe uma foto (save) e segue a partir dela. Uma vez por ano vai uma soma de
// conferência; navegador que divergir pede a foto de novo.
// Mensagens do cliente são dados não confiáveis: tudo é validado (formato, tamanhos, dono do país).
import { WebSocketServer, type WebSocket } from "ws";
import { generateWorld, type World } from "../src/world.ts";
import { createEconomy, type Economy } from "../src/economy.ts";
import { advanceWeek, checksum } from "../src/sim.ts";
import { applyCommand, type Cmd } from "../src/commands.ts";
import { saveGame } from "../src/save.ts";
import { ERA_WEEKS_PER_SECOND } from "../src/tech.ts";

export const MP = { port: Number(process.env.PORT) || 8787, maxPlayers: 20, speeds: [0, 0.5, 1, 3, 10, 30], tickMs: 50, maxMsgBytes: 4096 };

type Player = { ws: WebSocket; id: number; name: string; country: number; syncing: boolean; buffer: string[] };
export type Room = {
  code: string; world: World; eco: Economy; players: Player[];
  speed: number; paused: { by: number } | null; votes: Set<number>;
  pending: [number, Cmd, Player][]; acc: number;
};

const rooms = new Map<string, Room>();
let nextId = 1;

const code = () => { let c; do c = Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[(Math.random() * 24) | 0]).join(""); while (rooms.has(c)); return c; };
const send = (p: Player, o: unknown) => { const s = JSON.stringify(o); if (p.syncing) p.buffer.push(s); else if (p.ws.readyState === 1) p.ws.send(s); };
const broadcast = (r: Room, o: unknown) => { for (const p of r.players) send(p, o); };
const worldEra = (e: Economy) => Math.max(...e.countries.map((c) => c.research.era));

function status(r: Room) {
  broadcast(r, {
    t: "status", code: r.code, speed: r.speed, paused: r.paused ? r.players.find((p) => p.id === r.paused!.by)?.name ?? "?" : null,
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
  const p: Player = { ws, id: nextId++, name, country: 0, syncing: false, buffer: [] };
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
  if (!r.players.length) rooms.delete(r.code);
  else status(r);
}

const cleanName = (v: unknown) => (typeof v === "string" ? v.replace(/[<>&"']/g, "").trim().slice(0, 24) : "") || "Jogador";
const intIn = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export function handle(ws: WebSocket, raw: string, state: { room?: Room; player?: Player }) {
  let m: any;
  try { m = JSON.parse(raw); } catch { return; }
  if (!m || typeof m !== "object") return;
  const { room: r, player: p } = state;
  if (m.t === "create" && !r) {
    const W = intIn(m.w, 50, 1600) ? m.w : 1600, H = intIn(m.h, 30, 640) ? m.h : 640;
    const seed = intIn(m.seed, 0, 2 ** 31) ? m.seed : (Math.random() * 2 ** 31) | 0;
    const world = generateWorld(W, H, seed);
    const room: Room = { code: code(), world, eco: createEconomy(world), players: [], speed: 2, paused: { by: 0 }, votes: new Set(), pending: [], acc: 0 };
    rooms.set(room.code, room);
    state.room = room; state.player = join(room, ws, cleanName(m.name));
    room.paused = { by: state.player.id }; // começa pausado por quem criou
    status(room);
  } else if (m.t === "join" && !r) {
    const room = rooms.get(String(m.code ?? "").toUpperCase());
    if (!room) return ws.send(JSON.stringify({ t: "err", msg: "Sala não encontrada" }));
    if (room.players.length >= MP.maxPlayers) return ws.send(JSON.stringify({ t: "err", msg: `Sala cheia (${MP.maxPlayers} jogadores)` }));
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
      r.pending.push([p.country, m.cmd as Cmd, p]);
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
  if (r.eco.week % 52 === 0) broadcast(r, { t: "check", week: r.eco.week, sum: checksum(r.eco) });
}

export function startServer(port = MP.port) {
  const wss = new WebSocketServer({ port, maxPayload: MP.maxMsgBytes });
  wss.on("connection", (ws) => {
    const state: { room?: Room; player?: Player } = {};
    ws.on("message", (data, isBinary) => { if (!isBinary) handle(ws, data.toString(), state); });
    ws.on("close", () => { if (state.room && state.player) leave(state.room, state.player); });
  });
  const loop = setInterval(() => {
    for (const r of rooms.values()) {
      if (r.paused) continue;
      r.acc = Math.min(r.acc + (MP.tickMs / 1000) * MP.speeds[r.speed] * ERA_WEEKS_PER_SECOND[worldEra(r.eco)], 10);
      for (; r.acc >= 1; r.acc--) step(r);
    }
  }, MP.tickMs);
  wss.on("close", () => clearInterval(loop));
  return wss;
}

if (process.argv[1]?.endsWith("server.ts")) {
  startServer();
  console.log(`Servidor do Jogo Civilizatório na porta ${MP.port}. Os jogadores conectam em ws://<IP deste PC>:${MP.port}`);
}
