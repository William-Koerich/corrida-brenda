import { getSupabase } from "./supabase";

type SyncedTable = "finishes" | "athletes";

/** Linhas da corrida alteradas depois de `since` (ou todas, se null). */
export async function fetchChangedRows<T>(table: SyncedTable, raceId: string, since: string | null): Promise<T[]> {
  let query = getSupabase().from(table).select("*").eq("race_id", raceId);
  if (since) query = query.gt("updated_at", since);
  const { data, error } = await query;
  if (error) throw error;
  return data as T[];
}

/** Quantas linhas a corrida tem no servidor (só o cabeçalho da resposta, sem dados). */
export async function countRows(table: SyncedTable, raceId: string): Promise<number> {
  const { count, error } = await getSupabase().from(table).select("*", { count: "exact", head: true }).eq("race_id", raceId);
  if (error) throw error;
  return count ?? 0;
}
