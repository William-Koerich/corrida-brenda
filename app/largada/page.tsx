"use client";

import { useCurrentRace } from "@/lib/race";
import { StartPanel } from "./start-panel";

export default function LargadaPage() {
  const current = useCurrentRace();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Largada</h1>
      {current.status === "loading" && <p>Carregando…</p>}
      {current.status === "error" && (
        <p className="font-bold text-red-700">{current.message}</p>
      )}
      {current.status === "empty" && (
        <p>Nenhuma corrida cadastrada. Rode o supabase/seed.sql (veja o README).</p>
      )}
      {current.status === "ready" && (
        <StartPanel race={current.race} onChanged={current.reload} />
      )}
    </div>
  );
}
