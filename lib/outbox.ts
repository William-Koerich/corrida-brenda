import type { Finish } from "./types";

/** Operação gravada no aparelho e enviada ao servidor em ordem. */
export type OutboxOp =
  | { seq?: number; type: "insert"; finish: Finish }
  | { seq?: number; type: "assign"; client_id: string; athlete_id: string | null }
  | { seq?: number; type: "delete"; client_id: string };

/** Aplica uma operação sobre a lista (servidor ou local). Idempotente. */
export function applyOp(finishes: Finish[], op: OutboxOp): Finish[] {
  switch (op.type) {
    case "insert":
      return finishes.some((f) => f.client_id === op.finish.client_id)
        ? finishes
        : [op.finish, ...finishes];
    case "assign":
      return finishes.map((f) =>
        f.client_id === op.client_id ? { ...f, athlete_id: op.athlete_id } : f,
      );
    case "delete":
      return finishes.filter((f) => f.client_id !== op.client_id);
  }
}

/** O que a tela mostra: último estado do servidor + operações ainda não enviadas. */
export function applyOutbox(finishes: Finish[], ops: OutboxOp[]): Finish[] {
  return ops.reduce(applyOp, finishes);
}

/** Chegadas afetadas por operações pendentes (o "X pendentes de envio"). */
export function pendingCount(ops: OutboxOp[]): number {
  return new Set(ops.map((op) => (op.type === "insert" ? op.finish.client_id : op.client_id))).size;
}
