import { friendlyError, isNetworkError } from "./errors";
import type { OutboxOp } from "./outbox";
import { getSupabase } from "./supabase";
import type { Finish } from "./types";

/** Cria a chegada no aparelho; `client_id` identifica o registro antes e depois de enviado. */
export function newFinish(
  raceId: string,
  finishTimeMs: number,
  athleteId: string | null,
  deviceId: string,
): Finish {
  const clientId = crypto.randomUUID();
  return {
    id: clientId,
    client_id: clientId,
    race_id: raceId,
    athlete_id: athleteId,
    finish_time: new Date(finishTimeMs).toISOString(),
    device_id: deviceId,
    created_at: new Date().toISOString(),
  };
}

export async function fetchFinishes(raceId: string): Promise<Finish[]> {
  const { data, error } = await getSupabase()
    .from("finishes")
    .select("*")
    .eq("race_id", raceId)
    .order("finish_time", { ascending: false });
  if (error) throw error;
  return data as Finish[];
}

/** Grava a chegada; reenviar a mesma (mesmo client_id) não duplica. */
async function insertFinish(f: Finish) {
  return getSupabase()
    .from("finishes")
    .upsert(
      {
        race_id: f.race_id,
        athlete_id: f.athlete_id,
        finish_time: f.finish_time,
        device_id: f.device_id,
        client_id: f.client_id,
      },
      { onConflict: "client_id", ignoreDuplicates: true },
    );
}

export type PushResult =
  | { kind: "ok"; applied: OutboxOp }
  /** servidor recusou; `applied` é o que de fato ficou gravado (ou null) */
  | { kind: "conflict"; message: string; applied: OutboxOp | null }
  | { kind: "network" };

const ATHLETE_TAKEN = "finishes_one_per_athlete";

/** Envia uma operação da fila ao Supabase. */
export async function pushOp(op: OutboxOp): Promise<PushResult> {
  const supabase = getSupabase();
  let error: { code?: string; message: string } | null;

  switch (op.type) {
    case "insert": {
      ({ error } = await insertFinish(op.finish));
      if (error?.code === "23505" && error.message.includes(ATHLETE_TAKEN)) {
        // outro aparelho registrou este atleta enquanto este estava offline:
        // guarda o horário sem número para corrigir na classificação
        const unassigned = { ...op.finish, athlete_id: null };
        const retry = await insertFinish(unassigned);
        if (!retry.error) {
          return {
            kind: "conflict",
            message: "Atleta já tinha chegada registrada em outro aparelho. Esta chegada ficou sem número.",
            applied: { type: "insert", finish: unassigned },
          };
        }
        error = retry.error;
      }
      break;
    }
    case "assign":
      ({ error } = await supabase.from("finishes").update({ athlete_id: op.athlete_id }).eq("client_id", op.client_id));
      if (error?.code === "23505" && error.message.includes(ATHLETE_TAKEN)) {
        return {
          kind: "conflict",
          message: "Atleta já tinha chegada registrada em outro aparelho. Esta chegada ficou sem número.",
          applied: null,
        };
      }
      break;
    case "delete":
      ({ error } = await supabase.from("finishes").delete().eq("client_id", op.client_id));
      break;
  }

  if (!error) return { kind: "ok", applied: op };
  if (isNetworkError(error)) return { kind: "network" };
  return { kind: "conflict", message: friendlyError(error), applied: null };
}
