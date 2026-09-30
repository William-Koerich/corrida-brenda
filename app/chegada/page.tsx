"use client";

import { useCurrentRace } from "@/lib/race";
import { FinishStation } from "./finish-station";

export default function ChegadaPage() {
  const current = useCurrentRace();

  return (
    <div className="flex flex-col gap-3">
      {current.status === "loading" && <p>Carregando…</p>}
      {current.status === "error" && <p className="font-bold text-red-700">{current.message}</p>}
      {current.status === "empty" && (
        <p>Nenhuma corrida cadastrada. Rode o supabase/seed.sql (veja o README).</p>
      )}
      {current.status === "ready" && <FinishStation race={current.race} />}
    </div>
  );
}
