import { describe, expect, it } from "vitest";
import { applyOp, applyOutbox, pendingCount, type OutboxOp } from "./outbox";
import type { Finish } from "./types";

function finish(clientId: string, athleteId: string | null = null): Finish {
  return {
    id: clientId,
    client_id: clientId,
    race_id: "r",
    athlete_id: athleteId,
    finish_time: "2026-10-12T08:15:00.000Z",
    device_id: "d",
    created_at: "",
  };
}

describe("applyOp", () => {
  it("insert é idempotente", () => {
    const list = applyOp([], { type: "insert", finish: finish("c1") });
    expect(applyOp(list, { type: "insert", finish: finish("c1") })).toHaveLength(1);
  });

  it("assign e delete pelo client_id", () => {
    const list = [finish("c1"), finish("c2")];
    expect(applyOp(list, { type: "assign", client_id: "c2", athlete_id: "a9" })[1].athlete_id).toBe("a9");
    expect(applyOp(list, { type: "delete", client_id: "c1" }).map((f) => f.client_id)).toEqual(["c2"]);
  });
});

describe("applyOutbox", () => {
  it("aplica a fila em ordem sobre o estado do servidor", () => {
    const server = [finish("s1", "a1")];
    const ops: OutboxOp[] = [
      { type: "insert", finish: finish("c1") },
      { type: "assign", client_id: "c1", athlete_id: "a2" },
      { type: "insert", finish: finish("c2") },
      { type: "delete", client_id: "c2" },
    ];
    expect(applyOutbox(server, ops).map((f) => [f.client_id, f.athlete_id])).toEqual([
      ["c1", "a2"],
      ["s1", "a1"],
    ]);
  });

  it("operação já refletida no servidor não duplica", () => {
    const server = [finish("c1", "a2")];
    const ops: OutboxOp[] = [
      { type: "insert", finish: finish("c1") },
      { type: "assign", client_id: "c1", athlete_id: "a2" },
    ];
    expect(applyOutbox(server, ops)).toEqual(server);
  });
});

describe("pendingCount", () => {
  it("conta chegadas distintas", () => {
    expect(
      pendingCount([
        { type: "insert", finish: finish("c1") },
        { type: "assign", client_id: "c1", athlete_id: "a1" },
        { type: "delete", client_id: "c2" },
      ]),
    ).toBe(2);
  });
});
