"use client";

import { useCurrentRace } from "@/lib/race";
import { AthletesManager } from "./athletes-manager";

export default function AtletasPage() {
  const current = useCurrentRace();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Atletas</h1>
      {current.status === "loading" && <p>Carregando…</p>}
      {current.status === "error" && (
        <p className="font-bold text-red-700">{current.message}</p>
      )}
      {current.status === "empty" && (
        <p>Nenhuma corrida cadastrada. Rode o supabase/seed.sql (veja o README).</p>
      )}
      {current.status === "ready" && <AthletesManager race={current.race} />}
    </div>
  );
}
