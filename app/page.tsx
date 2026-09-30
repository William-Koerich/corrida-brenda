"use client";

import Link from "next/link";
import { useCurrentRace } from "@/lib/race";
import type { Race } from "@/lib/types";
import { ROUTES } from "./nav-bar";

const STATUS_LABEL: Record<Race["status"], string> = {
  not_started: "Aguardando largada",
  running: "Em andamento",
  finished: "Encerrada",
};

export default function Home() {
  const current = useCurrentRace();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Cronometragem 3 km</h1>

      <section className="rounded-lg border-2 border-black p-4">
        {current.status === "loading" && <p>Conectando ao Supabase…</p>}
        {current.status === "error" && <p className="font-bold text-red-700">{current.message}</p>}
        {current.status === "empty" && <p>Conectado, mas nenhuma corrida cadastrada ainda.</p>}
        {current.status === "ready" && (
          <>
            <p className="text-xl font-bold">{current.race.name}</p>
            <p>
              {current.race.distance_km} km · {STATUS_LABEL[current.race.status]}
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        {[...ROUTES, { href: "/telao", label: "Telão" }].map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-lg bg-black py-8 text-center text-xl font-bold text-white"
          >
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
