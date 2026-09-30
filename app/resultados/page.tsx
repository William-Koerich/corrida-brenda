"use client";

import { useCurrentRace } from "@/lib/race";
import { ResultsBoard } from "./results-board";

export default function ResultadosPage() {
  const current = useCurrentRace();

  return (
    <div className="flex flex-col gap-4">
      {current.status === "loading" && <p>Carregando…</p>}
      {current.status === "error" && <p className="font-bold text-red-700">{current.message}</p>}
      {current.status === "empty" && (
        <p>Nenhuma corrida cadastrada. Rode o supabase/seed.sql (veja o README).</p>
      )}
      {current.status === "ready" && <ResultsBoard race={current.race} />}
    </div>
  );
}
