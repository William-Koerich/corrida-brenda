import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { OutboxOp } from "./outbox";

interface CorridaDB extends DBSchema {
  outbox: { key: number; value: OutboxOp & { seq: number } };
  cache: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<CorridaDB> | null> | null = null;

/** IndexedDB do app; null onde não existe (servidor, navegação privada restrita). */
function db(): Promise<IDBPDatabase<CorridaDB> | null> {
  dbPromise ??= (async () => {
    if (typeof indexedDB === "undefined") return null;
    try {
      return await openDB<CorridaDB>("corrida", 1, {
        upgrade(d) {
          d.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
          d.createObjectStore("cache");
        },
      });
    } catch {
      return null;
    }
  })();
  return dbPromise;
}

// sem IndexedDB, a fila vive só na memória desta aba
const memory = { outbox: [] as (OutboxOp & { seq: number })[], seq: 0, cache: new Map<string, unknown>() };

/** Grava a operação no aparelho antes de qualquer envio. */
export async function outboxAdd(op: OutboxOp): Promise<OutboxOp & { seq: number }> {
  const d = await db();
  const rest = { ...op };
  delete rest.seq;
  if (!d) {
    const saved = { ...rest, seq: ++memory.seq } as OutboxOp & { seq: number };
    memory.outbox.push(saved);
    return saved;
  }
  const seq = await d.add("outbox", rest as OutboxOp & { seq: number });
  return { ...rest, seq } as OutboxOp & { seq: number };
}

/** Fila em ordem de gravação. */
export async function outboxAll(): Promise<(OutboxOp & { seq: number })[]> {
  const d = await db();
  return d ? d.getAll("outbox") : [...memory.outbox];
}

export async function outboxDelete(seq: number): Promise<void> {
  const d = await db();
  if (d) await d.delete("outbox", seq);
  else memory.outbox = memory.outbox.filter((o) => o.seq !== seq);
}

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return (d ? await d.get("cache", key) : memory.cache.get(key)) as T | undefined;
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  const d = await db();
  if (d) await d.put("cache", value, key);
  else memory.cache.set(key, value);
}
