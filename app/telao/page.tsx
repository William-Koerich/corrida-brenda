"use client";

import { useCurrentRace } from "@/lib/race";
import { TelaoBoard } from "./telao-board";

export default function TelaoPage() {
  const current = useCurrentRace();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {current.status === "loading" && <p className="m-auto text-[3vw]">Carregando…</p>}
      {current.status === "error" && <p className="m-auto text-[3vw] text-red-400">{current.message}</p>}
      {current.status === "empty" && <p className="m-auto text-[3vw]">Nenhuma corrida cadastrada.</p>}
      {current.status === "ready" && <TelaoBoard race={current.race} />}
    </div>
  );
}
