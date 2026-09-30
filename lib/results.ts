import { CATEGORIES, SEX_LABEL, type Category } from "./categories";
import { elapsedMs, formatDuration, formatPace } from "./time";
import type { Athlete, Finish, Race, Sex } from "./types";

export interface ResultRow {
  /** posição na classificação geral (todos os sexos) */
  overall: number;
  athlete: Athlete;
  finish: Finish;
  elapsedMs: number;
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
    rows.push({ athlete, finish, elapsedMs: elapsedMs(race.start_time, finish.finish_time) });
  }

  rows.sort((a, b) => a.elapsedMs - b.elapsedMs || a.athlete.bib_number - b.athlete.bib_number);
  unidentified.sort((a, b) => a.finish_time.localeCompare(b.finish_time));
  return { rows: rows.map((r, i) => ({ ...r, overall: i + 1 })), unidentified };
}

/** "all" = geral (todos); M/F = só aquele sexo. */
export type SexFilter = "all" | Sex;

/** Linhas do filtro, com a posição recalculada dentro dele. */
export function filterResults(rows: ResultRow[], filter: SexFilter): (ResultRow & { position: number })[] {
  const list = filter === "all" ? rows : rows.filter((r) => r.athlete.sex === filter);
  return list.map((r, i) => ({ ...r, position: i + 1 }));
}

export interface Podium {
  category: Category;
  winners: ResultRow[];
}

/** Pódio geral masculino e geral feminino, cada um com o seu tamanho. */
export function podiums(rows: ResultRow[]): Podium[] {
  return CATEGORIES.map((category) => ({
    category,
    winners: rows.filter((r) => r.athlete.sex === category.sex).slice(0, category.podiumSize),
  }));
}

/** CSV para Excel em português: separador ";" e BOM UTF-8. */
export function resultsToCsv(rows: ResultRow[], distanceKm: number): string {
  const header = ["Posição", "Posição no sexo", "Número", "Nome", "Idade", "Sexo", "Tempo", "Ritmo (min/km)"];
  const bySex = new Map<Sex, number>();
  const lines = rows.map((r) => {
    const sexPosition = (bySex.get(r.athlete.sex) ?? 0) + 1;
    bySex.set(r.athlete.sex, sexPosition);
    return [
      r.overall,
      sexPosition,
      r.athlete.bib_number,
      r.athlete.name,
      r.athlete.age,
      SEX_LABEL[r.athlete.sex],
      formatDuration(r.elapsedMs),
      formatPace(r.elapsedMs, distanceKm).replace(" /km", ""),
    ]
      .map(csvCell)
      .join(";");
  });
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
