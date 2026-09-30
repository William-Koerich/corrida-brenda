import {
  ageBandFor,
  CATEGORIES,
  CUMULATIVE_AWARDS,
  PODIUM_SIZE,
  SEX_LABEL,
  type AgeBand,
  type Category,
} from "./categories";
import { elapsedMs, formatDuration, formatPace } from "./time";
import type { Athlete, Finish, Race, Sex } from "./types";

export interface ResultRow {
  /** posição na classificação geral (todos os sexos) */
  overall: number;
  athlete: Athlete;
  finish: Finish;
  elapsedMs: number;
  band: AgeBand | undefined;
}

export interface RaceResults {
  rows: ResultRow[];
  /** chegadas sem atleta identificado */
  unidentified: Finish[];
}

/** Classificação: chegadas identificadas ordenadas por tempo total crescente. */
export function buildResults(
  race: Pick<Race, "start_time">,
  athletes: Iterable<Athlete>,
  finishes: Finish[],
): RaceResults {
  const byId = new Map([...athletes].map((a) => [a.id, a]));
  const unidentified: Finish[] = [];
  const rows: Omit<ResultRow, "overall">[] = [];

  for (const finish of finishes) {
    const athlete = finish.athlete_id ? byId.get(finish.athlete_id) : undefined;
    if (!athlete || !race.start_time) {
      unidentified.push(finish);
      continue;
    }
    rows.push({
      athlete,
      finish,
      elapsedMs: elapsedMs(race.start_time, finish.finish_time),
      band: ageBandFor(athlete.age),
    });
  }

  rows.sort((a, b) => a.elapsedMs - b.elapsedMs || a.athlete.bib_number - b.athlete.bib_number);
  unidentified.sort((a, b) => a.finish_time.localeCompare(b.finish_time));
  return { rows: rows.map((r, i) => ({ ...r, overall: i + 1 })), unidentified };
}

export type ResultFilter =
  | { kind: "all" }
  | { kind: "sex"; sex: Sex }
  | { kind: "category"; categoryId: string };

export function inCategory(row: ResultRow, category: Category): boolean {
  return row.athlete.sex === category.sex && (!category.band || row.band?.id === category.band.id);
}

/** Linhas do filtro, com a posição recalculada dentro dele. */
export function filterResults(
  rows: ResultRow[],
  filter: ResultFilter,
): (ResultRow & { position: number })[] {
  let list = rows;
  if (filter.kind === "sex") list = rows.filter((r) => r.athlete.sex === filter.sex);
  if (filter.kind === "category") {
    const category = CATEGORIES.find((c) => c.id === filter.categoryId);
    list = category ? rows.filter((r) => inCategory(r, category)) : [];
  }
  return list.map((r, i) => ({ ...r, position: i + 1 }));
}

export interface Podium {
  category: Category;
  winners: ResultRow[];
}

/**
 * Pódio de cada categoria. Categorias gerais primeiro; sem premiação
 * cumulativa, quem está no pódio geral é pulado nas faixas etárias.
 */
export function podiums(
  rows: ResultRow[],
  options: { size?: number; cumulative?: boolean } = {},
): Podium[] {
  const size = options.size ?? PODIUM_SIZE;
  const cumulative = options.cumulative ?? CUMULATIVE_AWARDS;

  const general = CATEGORIES.filter((c) => !c.band).map((category) => ({
    category,
    winners: rows.filter((r) => inCategory(r, category)).slice(0, size),
  }));
  const awarded = new Set(general.flatMap((p) => p.winners.map((w) => w.athlete.id)));

  const byAge = CATEGORIES.filter((c) => c.band).map((category) => ({
    category,
    winners: rows
      .filter((r) => inCategory(r, category) && (cumulative || !awarded.has(r.athlete.id)))
      .slice(0, size),
  }));

  return [...general, ...byAge];
}

/** CSV para Excel em português: separador ";" e BOM UTF-8. */
export function resultsToCsv(rows: ResultRow[], distanceKm: number): string {
  const header = ["Posição", "Número", "Nome", "Idade", "Sexo", "Categoria", "Tempo", "Ritmo (min/km)"];
  const lines = rows.map((r) =>
    [
      r.overall,
      r.athlete.bib_number,
      r.athlete.name,
      r.athlete.age,
      SEX_LABEL[r.athlete.sex],
      r.band ? `${r.band.label} ${SEX_LABEL[r.athlete.sex]}` : "",
      formatDuration(r.elapsedMs),
      formatPace(r.elapsedMs, distanceKm).replace(" /km", ""),
    ]
      .map(csvCell)
      .join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
