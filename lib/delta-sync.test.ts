import { describe, expect, it } from "vitest";
import { maxUpdatedAt, mergeByKey, needsFullReload, sinceWithOverlap } from "./delta-sync";

type Row = { id: string; v: number; updated_at?: string };
const key = (r: Row) => r.id;

describe("mergeByKey", () => {
  it("substitui as alteradas e acrescenta as novas, mantendo a ordem", () => {
    const rows: Row[] = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
    ];
    expect(mergeByKey(rows, [{ id: "b", v: 2 }, { id: "c", v: 1 }], key)).toEqual([
      { id: "a", v: 1 },
      { id: "b", v: 2 },
      { id: "c", v: 1 },
    ]);
  });

  it("é idempotente e não recria a lista sem mudanças", () => {
    const rows: Row[] = [{ id: "a", v: 1 }];
    expect(mergeByKey(rows, [], key)).toBe(rows);
    const once = mergeByKey(rows, [{ id: "a", v: 2 }], key);
    expect(mergeByKey(once, [{ id: "a", v: 2 }], key)).toEqual(once);
  });
});

describe("maxUpdatedAt / sinceWithOverlap", () => {
  it("pega o maior horário, aceitando microssegundos do Postgres", () => {
    const max = maxUpdatedAt([
      { updated_at: "2026-10-12T08:00:01.123456+00:00" },
      { updated_at: "2026-10-12T08:00:05.5+00:00" },
      { updated_at: null },
    ]);
    expect(max).toBe(Date.UTC(2026, 9, 12, 8, 0, 5, 500));
    expect(sinceWithOverlap(max, 10_000)).toBe("2026-10-12T07:59:55.500Z");
  });

  it("sem linhas: busca tudo", () => {
    expect(maxUpdatedAt([])).toBeNull();
    expect(sinceWithOverlap(null)).toBeNull();
  });
});

describe("needsFullReload", () => {
  it("contagem diferente indica exclusão", () => {
    expect(needsFullReload(10, 10)).toBe(false);
    expect(needsFullReload(10, 9)).toBe(true);
  });
});
