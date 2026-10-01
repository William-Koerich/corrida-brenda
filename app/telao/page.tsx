"use client";

import { useRace } from "@/components/race-provider";
import { TelaoBoard } from "./telao-board";

export default function TelaoPage() {
  const current = useRace();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-stage text-white"
      style={{
        // brilho sutil da marca no canto e vinheta nas bordas
        backgroundImage:
          "radial-gradient(60vw 40vw at 0% 0%, rgba(255,77,157,0.14), transparent 70%), radial-gradient(50vw 40vw at 100% 100%, rgba(80,90,140,0.18), transparent 70%)",
      }}
    >
      {current.status === "loading" && <p className="m-auto text-[3vw] text-white/60">Carregando…</p>}
      {current.status === "error" && <p className="m-auto text-[3vw] text-red-400">{current.message}</p>}
      {current.status === "empty" && <p className="m-auto text-[3vw]">Nenhuma corrida cadastrada.</p>}
      {current.status === "ready" && <TelaoBoard race={current.race} />}
    </div>
  );
}
