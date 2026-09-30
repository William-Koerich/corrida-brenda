import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { cacheGet, cacheSet, outboxAdd, outboxAll, outboxDelete } from "./local-db";

describe("local-db (IndexedDB)", () => {
  it("fila preserva a ordem de gravação e remove por seq", async () => {
    const a = await outboxAdd({ type: "delete", client_id: "c1" });
    const b = await outboxAdd({ type: "assign", client_id: "c2", athlete_id: "a1" });
    const c = await outboxAdd({ type: "delete", client_id: "c3" });
    expect(a.seq).toBeLessThan(b.seq);
    expect((await outboxAll()).map((o) => o.seq)).toEqual([a.seq, b.seq, c.seq]);

    await outboxDelete(b.seq);
    expect((await outboxAll()).map((o) => o.seq)).toEqual([a.seq, c.seq]);
  });

  it("não grava um seq vindo de fora", async () => {
    const saved = await outboxAdd({ seq: 999, type: "delete", client_id: "x" });
    expect(saved.seq).not.toBe(999);
  });

  it("cache guarda e devolve valores", async () => {
    await cacheSet("race", { id: "r1", name: "Teste" });
    expect(await cacheGet("race")).toEqual({ id: "r1", name: "Teste" });
    expect(await cacheGet("nada")).toBeUndefined();
  });
});
