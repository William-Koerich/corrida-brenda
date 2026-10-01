"use client";

import { useMemo } from "react";
import { buildResults } from "@/lib/results";
import { runnerEntries } from "@/lib/runners";
import type { Race } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";

/** Inscritos com resultado (em tempo real) para a área pública. */
export function useRunners(race: Race) {
  const athletes = useAthletes(race.id);
  const { finishes } = useFinishes(race.id, () => {});
  const { rows } = useMemo(() => buildResults(race, athletes.byBib.values(), finishes), [race, athletes.byBib, finishes]);
  const entries = useMemo(() => runnerEntries(athletes.byBib.values(), rows), [athletes.byBib, rows]);
  return { entries, totalFinishers: rows.length, loaded: athletes.byBib.size > 0 };
}
