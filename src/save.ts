// Salvar e carregar a partida: tudo vira JSON (arrays tipados em base64, Set e Map marcados) compactado com gzip.
// O arquivo vem do jogador, então a leitura valida formato, versão e tamanhos antes de usar.
import type { World } from "./world.ts";
import type { Economy } from "./economy.ts";

export const SAVE_VERSION = 4; // 2: zonas marítimas e frotas; 3: estados; 4: multiplayer (humanos, guerras da IA)
const MAGIC = "jogo-civilizatorio";

export type SaveData = {
  world: World; eco: Economy;
  ui: { active: number; cam: { x: number; y: number; zoom: number }; mode: number; speed: number; explored: [number, Uint8Array][] };
};

const TYPED: Record<string, new (b: ArrayBuffer) => ArrayBufferView> = {
  Uint8Array, Uint16Array, Int32Array, Float32Array, Float64Array,
};

function toB64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string) {
  const s = atob(b64), out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function encode(_key: string, v: unknown): unknown {
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
    const t = v.constructor.name;
    if (!TYPED[t]) throw new Error(`tipo não salvável: ${t}`);
    return { $t: t, d: toB64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  }
  if (v instanceof Set) return { $set: [...v] };
  if (v instanceof Map) return { $map: [...v] };
  return v;
}
function decode(_key: string, v: unknown): unknown {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.$t === "string" && typeof o.d === "string") {
      const Ctor = TYPED[o.$t];
      if (!Ctor) throw new Error(`tipo desconhecido no save: ${o.$t}`);
      return new Ctor(fromB64(o.d).buffer);
    }
    if (Array.isArray(o.$set)) return new Set(o.$set);
    if (Array.isArray(o.$map)) return new Map(o.$map as [unknown, unknown][]);
  }
  return v;
}

async function pipe(data: Uint8Array | Blob, stream: CompressionStream | DecompressionStream) {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  return new Uint8Array(await new Response(blob.stream().pipeThrough(stream)).arrayBuffer());
}

export async function saveGame(data: SaveData): Promise<Blob> {
  const json = JSON.stringify({ magic: MAGIC, version: SAVE_VERSION, ...data }, encode);
  return new Blob([await pipe(new TextEncoder().encode(json), new CompressionStream("gzip"))], { type: "application/gzip" });
}

/** Lê um save. Lança Error com mensagem para o jogador se o arquivo não for válido. */
export async function loadGame(file: Blob): Promise<SaveData> {
  let raw: any;
  try {
    raw = JSON.parse(new TextDecoder().decode(await pipe(file, new DecompressionStream("gzip"))), decode);
  } catch {
    throw new Error("Arquivo inválido: não é um save do jogo");
  }
  if (raw?.magic !== MAGIC) throw new Error("Arquivo inválido: não é um save do jogo");
  if (raw.version !== SAVE_VERSION) throw new Error(`Save da versão ${raw.version}; este jogo lê a versão ${SAVE_VERSION}`);
  const w = raw.world as World, e = raw.eco as Economy, N = w?.W * w?.H;
  const arrays: unknown[] = [w.terrain, w.resource, w.owner, w.pop, w.climate, w.river, w.navigable, w.seaZone, e.market, e.urban, e.occupier, ...(e.levels ?? [])];
  if (!(N > 0) || arrays.some((a) => !ArrayBuffer.isView(a) || (a as Uint8Array).length !== N) || !Array.isArray(e.countries) || !Array.isArray(e.cities))
    throw new Error("Save corrompido: tamanhos não batem");
  w.reserve ??= new Float32Array(N).fill(Infinity); // saves de antes das reservas
  e.exhausted ??= [];
  return raw as SaveData;
}
