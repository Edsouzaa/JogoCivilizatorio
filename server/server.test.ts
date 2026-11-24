import assert from "node:assert/strict";
import { startServer } from "./server.ts";
import { loadGame } from "../src/save.ts";
import { advanceWeek, checksum } from "../src/sim.ts";
import { applyCommand } from "../src/commands.ts";

const PORT = 18787;
const wss = startServer(PORT);

/** Cliente de teste: guarda mensagens e, depois da foto, simula os passos como um navegador. */
function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  ws.binaryType = "arraybuffer";
  const msgs: any[] = [];
  const c = { ws, msgs, game: null as any, checks: [] as boolean[], queue: [] as any[] };
  ws.onmessage = async (ev) => {
    if (ev.data instanceof ArrayBuffer) {
      const snap = await loadGame(new Blob([ev.data]));
      c.game = { w: snap.world, e: snap.eco };
      for (const m of c.queue.splice(0)) apply(m);
      return;
    }
    const m = JSON.parse(ev.data as string);
    msgs.push(m);
    if (m.t === "step" || m.t === "check") { if (c.game) apply(m); else c.queue.push(m); }
  };
  const apply = (m: any) => {
    if (m.t === "check") { c.checks.push(checksum(c.game.e) === m.sum); return; }
    for (const [country, cmd] of m.cmds) applyCommand(c.game.w, c.game.e, country, cmd);
    advanceWeek(c.game.w, c.game.e);
    assert.equal(c.game.e.week, m.week, "passo fora de ordem");
  };
  return c;
}
const open = (c: ReturnType<typeof client>) => new Promise((ok) => (c.ws.onopen = ok));
const waitFor = async (pred: () => unknown, ms = 15000) => {
  const t0 = Date.now();
  while (!pred()) { if (Date.now() - t0 > ms) throw new Error("tempo esgotado"); await new Promise((r) => setTimeout(r, 20)); }
};
const last = (c: ReturnType<typeof client>, t: string) => [...c.msgs].reverse().find((m) => m.t === t);

const a = client(), b = client();
await Promise.all([open(a), open(b)]);
a.ws.send(JSON.stringify({ t: "create", name: "Ana", w: 200, h: 100, seed: 3 }));
await waitFor(() => last(a, "welcome") && a.game);
const code = last(a, "welcome").code;
assert.match(code, /^[A-Z]{4}$/);
assert.ok(last(a, "status").paused, "sala nova começa pausada");

b.ws.send(JSON.stringify({ t: "join", code, name: "<b>Beto</b>" }));
await waitFor(() => last(b, "welcome") && b.game);
assert.equal(last(a, "status").players.length, 2);
assert.equal(last(a, "status").players[1].name, "bBeto/b", "nome deveria ser limpo de HTML");

// cada país tem um dono só
a.ws.send(JSON.stringify({ t: "claim", country: 1 }));
await waitFor(() => last(a, "status").players[0].country === 1);
b.ws.send(JSON.stringify({ t: "claim", country: 1 }));
await waitFor(() => last(b, "err"));
assert.match(last(b, "err").msg, /Outro jogador/);
b.ws.send(JSON.stringify({ t: "claim", country: 2 }));
await waitFor(() => last(a, "status").players[1].country === 2);

// pausa: quem não pausou vota; com 2 jogadores, 1 voto basta
b.ws.send(JSON.stringify({ t: "unpause" }));
await waitFor(() => !last(a, "status").paused);
b.ws.send(JSON.stringify({ t: "speed", i: 5 }));
a.ws.send(JSON.stringify({ t: "cmd", cmd: { t: "settlers" } }));

// um ano de jogo: o "navegador" de B, só com os comandos, confere igual ao servidor
await waitFor(() => b.checks.length >= 1 && a.checks.length >= 1, 30000);
assert.ok(b.checks.every(Boolean) && a.checks.every(Boolean), "cliente divergiu do servidor");
assert.deepEqual(b.game.e.humans.sort(), [1, 2]);

// pausa de quem pausou só ele (ou os outros por voto) tira
a.ws.send(JSON.stringify({ t: "pause" }));
await waitFor(() => last(b, "status").paused === "Ana");

a.ws.close(); b.ws.close();
wss.close();
console.log(`server ok (sala ${code}, semana ${b.game.e.week})`);
process.exit(0);
