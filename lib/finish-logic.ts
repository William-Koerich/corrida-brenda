import type { Athlete, Finish } from "./types";

/** Chegadas sem atleta registradas por este aparelho, da mais antiga para a mais nova. */
export function pendingFinishes(finishes: Finish[], deviceId: string): Finish[] {
  return finishes
    .filter((f) => f.athlete_id === null && f.device_id === deviceId)
    .sort((a, b) => a.finish_time.localeCompare(b.finish_time));
}

export type BibResolution =
  | { kind: "not_found"; bib: number }
  | { kind: "duplicate"; athlete: Athlete; existing: Finish }
  /** associar o atleta à chegada `target` já existente */
  | { kind: "assign"; athlete: Athlete; target: Finish }
  /** não há chegada pendente: criar uma nova com o horário atual */
  | { kind: "create"; athlete: Athlete };

/**
 * Decide o que fazer quando um número é digitado/lido.
 * `target` é a chegada que vai receber o número (pendente ou em correção);
 * sem target, uma nova chegada é criada.
 */
export function resolveBib(
  bib: number,
  athletesByBib: ReadonlyMap<number, Athlete>,
  finishes: Finish[],
  target?: Finish,
): BibResolution {
  const athlete = athletesByBib.get(bib);
  if (!athlete) return { kind: "not_found", bib };

  const existing = finishes.find((f) => f.athlete_id === athlete.id);
  if (existing && existing.client_id !== target?.client_id) {
    return { kind: "duplicate", athlete, existing };
  }
  return target ? { kind: "assign", athlete, target } : { kind: "create", athlete };
}
