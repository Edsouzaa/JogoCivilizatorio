import assert from "node:assert/strict";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// saves da sala vão para uma pasta temporária (definida antes de carregar o servidor)
const saveDir = mkdtempSync(join(tmpdir(), "jogo-salas-"));
process.env.SAVE_DIR = saveDir;
const { startServer } = await import("../server/server.ts");
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
    if (m.t === "step" || m.t === "check" || m.t === "cmds") { if (c.game) apply(m); else c.queue.push(m); }
    // evento sorteado no meio do teste: responde e vota para despausar (o servidor pausa a sala)
    if (m.t === "status" && m.paused === "evento") { ws.send(JSON.stringify({ t: "cmd", cmd: { t: "choose", option: 0 } })); ws.send(JSON.stringify({ t: "unpause" })); }
  };
  const apply = (m: any) => {
    if (m.t === "check") { c.checks.push(checksum(c.game.e) === m.sum); return; }
    for (const [country, cmd] of m.cmds) applyCommand(c.game.w, c.game.e, country, cmd);
    if (m.t === "cmds") return;
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

// sala vazia é salva em disco; quem entra de novo com o código reabre ela, pausada e com os países na IA
const weekBefore = b.game.e.week;
a.ws.close(); b.ws.close();
await waitFor(() => existsSync(join(saveDir, `${code}.save`)));
const c = client();
await open(c);
c.ws.send(JSON.stringify({ t: "join", code, name: "Caio" }));
await waitFor(() => last(c, "welcome") && c.game);
assert.ok(c.game.e.week >= weekBefore, "sala reaberta voltou no tempo");
assert.deepEqual(c.game.e.humans, [], "países deveriam voltar para a IA");
assert.ok(last(c, "status").paused, "sala reaberta deveria começar pausada");
c.ws.close();
// código inválido não vira caminho de arquivo
const d = client();
await open(d);
d.ws.send(JSON.stringify({ t: "join", code: "../../package" }));
await waitFor(() => last(d, "err"));
assert.match(last(d, "err").msg, /não encontrada/);
d.ws.close();
// sala com senha: sem senha e com senha errada não entra; com a certa entra
const e1 = client(), e2 = client();
await Promise.all([open(e1), open(e2)]);
e1.ws.send(JSON.stringify({ t: "create", name: "Eva", w: 60, h: 40, password: "segredo" }));
await waitFor(() => last(e1, "welcome") && e1.game);
const code2 = last(e1, "welcome").code;
e2.ws.send(JSON.stringify({ t: "join", code: code2, name: "Fábio" }));
await waitFor(() => last(e2, "err"));
assert.match(last(e2, "err").msg, /tem senha/);
e2.msgs.length = 0;
e2.ws.send(JSON.stringify({ t: "join", code: code2, name: "Fábio", password: "errada" }));
await waitFor(() => last(e2, "err"));
assert.match(last(e2, "err").msg, /Senha errada/);
e2.ws.send(JSON.stringify({ t: "join", code: code2, name: "Fábio", password: "segredo" }));
await waitFor(() => last(e2, "welcome"));

// chat: chega para todos, sem HTML, cortado em 200 caracteres; mensagem colada na anterior é ignorada
e1.ws.send(JSON.stringify({ t: "chat", text: "<script>oi</script>" + "x".repeat(300) }));
e1.ws.send(JSON.stringify({ t: "chat", text: "spam" }));
await waitFor(() => last(e2, "chat"));
const msg = last(e2, "chat");
assert.equal(msg.from, "Eva");
assert.ok(!/[<>]/.test(msg.text) && msg.text.length === 200 && msg.text.startsWith("scriptoi/script"));
await new Promise((r) => setTimeout(r, 300));
assert.equal(e2.msgs.filter((m) => m.t === "chat").length, 1, "spam deveria ser ignorado");
e1.ws.close(); e2.ws.close();
wss.close();
rmSync(saveDir, { recursive: true, force: true });
console.log(`server ok (sala ${code}, semana ${b.game.e.week})`);
process.exit(0);
