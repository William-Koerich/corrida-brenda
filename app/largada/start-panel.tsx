"use client";

import { useCallback, useEffect, useState } from "react";
import { parseTimestamp } from "@/lib/clock";
import { friendlyError } from "@/lib/errors";
import { useServerClock } from "@/lib/server-clock";
import { getSupabase } from "@/lib/supabase";
import type { Race } from "@/lib/types";
import { Stopwatch } from "../stopwatch";

interface Counts {
  athletes: number;
  finishes: number;
  identified: number;
}

function useRaceCounts(raceId: string) {
  const [counts, setCounts] = useState<Counts | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [athletes, finishes] = await Promise.all([
      supabase.from("athletes").select("*", { count: "exact", head: true }).eq("race_id", raceId),
      supabase.from("finishes").select("athlete_id").eq("race_id", raceId),
    ]);
    if (athletes.error || finishes.error) return;
    setCounts({
      athletes: athletes.count ?? 0,
      finishes: finishes.data.length,
      identified: finishes.data.filter((f) => f.athlete_id).length,
    });
  }, [raceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial assíncrona
    load();
    const supabase = getSupabase();
    // sem filtro: exclusões não passam por filtros do Realtime
    const channel = supabase
      .channel(`finishes-count-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "finishes" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return counts;
}

function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
  className,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  className: string;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <button onClick={() => setAsking(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border-4 border-black p-4">
      <p className="text-center text-xl font-bold">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setAsking(false)}
          disabled={busy}
          className="rounded-lg border-2 border-black py-4 text-lg font-bold"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
            setAsking(false);
          }}
          disabled={busy}
          className="rounded-lg bg-black py-4 text-lg font-bold text-white disabled:opacity-50"
        >
          {busy ? "Aguarde…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function StartPanel({ race, onChanged }: { race: Race; onChanged: () => Promise<void> }) {
  const counts = useRaceCounts(race.id);
  const clock = useServerClock();
  const [error, setError] = useState<string | null>(null);

  async function callRpc(fn: "start_race" | "finish_race") {
    setError(null);
    const { error } = await getSupabase().rpc(fn, { p_race_id: race.id });
    if (error) setError(friendlyError(error));
    await onChanged();
  }

  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-2xl font-bold">{race.name}</p>
        <p className="text-lg">
          {race.distance_km} km · {counts ? `${counts.athletes} atletas cadastrados` : "…"}
        </p>
      </div>

      {race.status === "not_started" && (
        <ConfirmButton
          label="DAR LARGADA"
          question={`Dar a largada da ${race.name} agora?`}
          confirmLabel="SIM, LARGAR"
          onConfirm={() => callRpc("start_race")}
          className="rounded-2xl bg-green-600 py-16 text-4xl font-black text-white shadow-lg active:scale-95"
        />
      )}

      {startMs !== null && (
        <section className="flex flex-col gap-2 rounded-lg bg-black p-6 text-white">
          {race.status === "running" ? (
            <p className="text-center">
              <Stopwatch startMs={startMs} now={clock.now} className="text-6xl font-bold sm:text-8xl" />
            </p>
          ) : (
            <p className="text-center text-4xl font-bold">Corrida encerrada</p>
          )}
          <p className="text-center">
            Largada às {new Date(startMs).toLocaleTimeString("pt-BR")} (horário do servidor)
          </p>
        </section>
      )}

      {race.status !== "not_started" && counts && (
        <section className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border-2 border-black p-4">
            <p className="text-4xl font-bold tabular-nums">
              {counts.identified}
              <span className="text-xl">/{counts.athletes}</span>
            </p>
            <p>atletas chegaram</p>
          </div>
          <div className="rounded-lg border-2 border-black p-4">
            <p className="text-4xl font-bold tabular-nums">{counts.finishes - counts.identified}</p>
            <p>chegadas sem número</p>
          </div>
        </section>
      )}

      {race.status === "running" && (
        <ConfirmButton
          label="Encerrar corrida"
          question="Encerrar a corrida? O cronômetro para nesta tela."
          confirmLabel="Encerrar"
          onConfirm={() => callRpc("finish_race")}
          className="rounded-lg border-2 border-red-700 py-4 text-lg font-bold text-red-700"
        />
      )}

      {error && <p className="font-bold text-red-700">{error}</p>}

      <p className="text-sm text-black/60">
        {clock.state.status === "syncing" && "Sincronizando relógio com o servidor…"}
        {clock.state.status === "synced" &&
          `Relógio sincronizado (diferença ${(clock.state.offset.offsetMs / 1000).toFixed(1)} s, precisão ±${Math.round(
            clock.state.offset.rttMs / 2,
          )} ms)`}
        {clock.state.status === "error" && (
          <>
            Relógio não sincronizado: {clock.state.message}{" "}
            <button onClick={clock.sync} className="underline">
              Tentar de novo
            </button>
          </>
        )}
      </p>
    </div>
  );
}
