// Salvamento automático no navegador (IndexedDB): os 3 últimos saves em rodízio.
// O armazenamento pode não existir ou estar bloqueado (aba anônima, dados apagados): tudo aqui falha sem quebrar o jogo.

export const AUTOSAVE = { everyMs: 5 * 60 * 1000, slots: 3 };

export type AutosaveMeta = { slot: number; savedAt: number; label: string; size: number };

/** Próxima vaga do rodízio: a mais antiga (ou uma vazia). */
export function nextSlot(metas: AutosaveMeta[], slots = AUTOSAVE.slots) {
  for (let s = 0; s < slots; s++) if (!metas.some((m) => m.slot === s)) return s;
  return metas.reduce((a, m) => (m.savedAt < a.savedAt ? m : a)).slot;
}

/** Conta só o tempo com o jogo andando; diz quando é hora de salvar. */
export function autosaveClock(everyMs = AUTOSAVE.everyMs) {
  let running = 0;
  return {
    /** Soma `dt` ms de jogo rodando; retorna true quando passou do intervalo (e zera). */
    tick(dt: number, playing: boolean) {
      if (!playing) return false;
      running += dt;
      if (running < everyMs) return false;
      running = 0;
      return true;
    },
  };
}

const DB = "jogo-civilizatorio", STORE = "autosaves";
function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "slot" });
    req.onsuccess = () => ok(req.result);
    req.onerror = () => fail(req.error);
  });
}
async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((ok, fail) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => { ok(req.result); db.close(); };
    req.onerror = () => { fail(req.error); db.close(); };
  });
}

/** Lista os autosaves, do mais novo para o mais velho (vazio se o armazenamento não estiver disponível). */
export async function listAutosaves(): Promise<AutosaveMeta[]> {
  try {
    const all = await run<{ slot: number; savedAt: number; label: string; blob: Blob }[]>("readonly", (s) => s.getAll());
    return all.map(({ slot, savedAt, label, blob }) => ({ slot, savedAt, label, size: blob.size })).sort((a, b) => b.savedAt - a.savedAt);
  } catch { return []; }
}

/** Grava o save na próxima vaga. Retorna a meta gravada, ou lança Error se o navegador não deixar. */
export async function writeAutosave(blob: Blob, label: string): Promise<AutosaveMeta> {
  const slot = nextSlot(await listAutosaves());
  const savedAt = Date.now();
  await run("readwrite", (s) => s.put({ slot, savedAt, label, blob }));
  return { slot, savedAt, label, size: blob.size };
}

export async function readAutosave(slot: number): Promise<Blob | null> {
  try {
    const r = await run<{ blob: Blob } | undefined>("readonly", (s) => s.get(slot));
    return r?.blob ?? null;
  } catch { return null; }
}
