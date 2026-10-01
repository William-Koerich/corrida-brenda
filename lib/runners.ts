import { stripAccents } from "./athletes";
import { PODIUM_SIZE } from "./categories";
import { filterResults, type ResultRow } from "./results";
import type { Athlete } from "./types";

/** Um corredor na área pública: com resultado (se já chegou) e posição no sexo. */
export interface RunnerEntry {
  athlete: Athlete;
  row?: ResultRow;
  sexPosition?: number;
  /** quantos do mesmo sexo já chegaram */
  sexFinishers: number;
  /** está entre os premiados do seu sexo */
  prize: boolean;
}

/** Todos os inscritos: quem chegou em ordem de classificação, depois quem não chegou (por nome). */
export function runnerEntries(athletes: Iterable<Athlete>, rows: ResultRow[]): RunnerEntry[] {
  const bySex = { F: filterResults(rows, "F"), M: filterResults(rows, "M") };
  const positions = new Map<string, number>();
  for (const list of Object.values(bySex)) for (const r of list) positions.set(r.athlete.id, r.position);
  const rowById = new Map(rows.map((r) => [r.athlete.id, r]));

  const entries = [...athletes].map((athlete): RunnerEntry => {
    const sexPosition = positions.get(athlete.id);
    return {
      athlete,
      row: rowById.get(athlete.id),
      sexPosition,
      sexFinishers: bySex[athlete.sex].length,
      prize: sexPosition !== undefined && sexPosition <= PODIUM_SIZE[athlete.sex],
    };
  });

  return entries.sort((a, b) => {
    if (a.row && b.row) return a.row.overall - b.row.overall;
    if (a.row) return -1;
    if (b.row) return 1;
    return a.athlete.name.localeCompare(b.athlete.name, "pt-BR");
  });
}

const normalize = (s: string) => stripAccents(s.toLowerCase()).replace(/\s+/g, " ").trim();

/**
 * Busca por número (exato primeiro, depois começando com) ou por nome
 * (todas as palavras, sem diferenciar acentos/maiúsculas, em qualquer ordem).
 */
export function searchRunners(entries: RunnerEntry[], query: string): RunnerEntry[] {
  const q = normalize(query);
  if (!q) return entries;

  if (/^\d+$/.test(q)) {
    const exact = entries.filter((e) => String(e.athlete.bib_number) === q);
    const prefix = entries.filter((e) => String(e.athlete.bib_number).startsWith(q) && String(e.athlete.bib_number) !== q);
    return [...exact, ...prefix];
  }

  const words = q.split(" ");
  return entries.filter((e) => {
    const name = normalize(e.athlete.name);
    return words.every((w) => name.includes(w));
  });
}
