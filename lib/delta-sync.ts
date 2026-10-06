import { parseTimestamp } from "./clock";

/**
 * Atualização incremental: busca só as linhas com `updated_at` depois da última
 * consulta e junta com o que a tela já tem. Exclusões não aparecem na busca
 * incremental, então a contagem total é conferida à parte (ver `needsFullReload`).
 */

/** Substitui as linhas que mudaram (pela chave) e acrescenta as novas. */
export function mergeByKey<T>(rows: T[], delta: T[], key: (row: T) => string): T[] {
  if (!delta.length) return rows;
  const changed = new Map(delta.map((r) => [key(r), r]));
  const merged = rows.map((r) => changed.get(key(r)) ?? r);
  const existing = new Set(rows.map(key));
  for (const r of delta) if (!existing.has(key(r))) merged.push(r);
  return merged;
}

/** Maior `updated_at` (em ms) das linhas; null se não houver. */
export function maxUpdatedAt(rows: { updated_at?: string | null }[]): number | null {
  let max: number | null = null;
  for (const r of rows) {
    if (!r.updated_at) continue;
    const t = parseTimestamp(r.updated_at);
    if (max === null || t > max) max = t;
  }
  return max;
}

/**
 * A partir de quando buscar. Volta alguns segundos para não perder uma
 * gravação que terminou um pouco depois do horário dela (as gravações aqui
 * levam milissegundos; 3 s é folga de sobra). Reprocessar linhas repetidas
 * não tem problema: `mergeByKey` é idempotente.
 */
export function sinceWithOverlap(maxMs: number | null, overlapMs = 3_000): string | null {
  return maxMs === null ? null : new Date(maxMs - overlapMs).toISOString();
}

/** Algo foi excluído (ou a tela está incompleta): a contagem não bate. */
export function needsFullReload(localCount: number, serverCount: number): boolean {
  return localCount !== serverCount;
}
