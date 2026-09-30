"use client";

import { Flag, Lock, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRace } from "@/components/race-provider";
import { RaceStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Card, CardHeader, PageHeader, Stat } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { parseTimestamp } from "@/lib/clock";
import { friendlyError } from "@/lib/errors";
import { useServerClock } from "@/lib/server-clock";
import { getSupabase } from "@/lib/supabase";
import { elapsedMs, formatDuration } from "@/lib/time";
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
      .on("postgres_changes", { event: "*", schema: "public", table: "finishes" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "athletes" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return counts;
}

type Action = "start" | "finish" | "reset";

export function StartPanel({ race }: { race: Race }) {
  const { reload } = useRace();
  const counts = useRaceCounts(race.id);
  const clock = useServerClock();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);

  async function run(action: Action) {
    setError(null);
    const fn = { start: "start_race", finish: "finish_race", reset: "reset_race" }[action];
    const { error } = await getSupabase().rpc(fn, { p_race_id: race.id });
    if (error) setError(friendlyError(error));
    await reload();
  }

  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;
  const time = (iso: string) => new Date(parseTimestamp(iso)).toLocaleTimeString("pt-BR");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Largada"
        description={
          <span className="flex flex-wrap items-center gap-2">
            {race.name} · {Number(race.distance_km).toLocaleString("pt-BR")} km <RaceStatusBadge status={race.status} />
          </span>
        }
      />

      {/* painel principal */}
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-center text-white shadow-lg sm:py-14">
        <div className="pointer-events-none absolute -bottom-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6">
          {race.status === "not_started" && (
            <>
              <p className="max-w-md text-white/70">
                A largada é gravada com o <strong className="text-white">relógio do servidor</strong>, igual para todos
                os aparelhos.
              </p>
              <button
                onClick={() => setConfirming("start")}
                className="flex size-52 flex-col items-center justify-center gap-2 rounded-full bg-brand text-ink shadow-[0_0_0_12px_rgba(255,77,157,0.18)] transition hover:bg-brand-strong active:scale-95 sm:size-60"
              >
                <Flag size={40} strokeWidth={2.5} />
                <span className="text-2xl font-black tracking-tight">DAR LARGADA</span>
              </button>
            </>
          )}

          {race.status === "running" && startMs !== null && (
            <>
              <p className="text-xs font-medium tracking-widest text-white/50 uppercase">Tempo de prova</p>
              <Stopwatch startMs={startMs} now={clock.now} className="text-6xl font-semibold text-brand sm:text-8xl" />
              <p className="text-white/70">Largada às {time(race.start_time!)} · horário do servidor</p>
            </>
          )}

          {race.status === "finished" && race.start_time && (
            <>
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
                <Lock size={14} /> Corrida encerrada · chegadas bloqueadas
              </span>
              <p className="tabular font-mono text-6xl font-semibold text-white sm:text-8xl">
                {race.finished_at ? formatDuration(elapsedMs(race.start_time, race.finished_at)) : "—"}
              </p>
              <p className="text-white/70">
                Largada às {time(race.start_time)}
                {race.finished_at && ` · encerrada às ${time(race.finished_at)}`}
              </p>
            </>
          )}
        </div>
      </section>

      {error && <Alert tone="danger">{error}</Alert>}

      {race.status !== "not_started" && counts && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Chegaram" value={counts.identified} hint={`de ${counts.athletes} atletas`} />
          <Stat label="Sem número" value={counts.finishes - counts.identified} />
          <Stat label="Faltam" value={Math.max(0, counts.athletes - counts.identified)} />
        </div>
      )}
      {race.status === "not_started" && counts && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Atletas inscritos" value={counts.athletes} />
          <Stat label="Distância" value={`${Number(race.distance_km).toLocaleString("pt-BR")} km`} />
        </div>
      )}

      {race.status === "running" && (
        <Card>
          <CardHeader
            title="Encerrar corrida"
            description="Depois de encerrada, novas chegadas não são aceitas. Chegadas já registradas ainda podem ser identificadas e corrigidas."
            action={
              <Button variant="primary" icon={<Square size={14} />} onClick={() => setConfirming("finish")}>
                Encerrar
              </Button>
            }
            divider={false}
          />
        </Card>
      )}

      {race.status !== "not_started" && (
        <Card className="ring-red-200">
          <CardHeader
            title={<span className="text-red-800">Reiniciar corrida</span>}
            description="Apaga todas as chegadas e volta para “aguardando largada”. Os atletas cadastrados são mantidos."
            action={
              <Button variant="danger-outline" icon={<RotateCcw size={14} />} onClick={() => setConfirming("reset")}>
                Reiniciar
              </Button>
            }
            divider={false}
          />
        </Card>
      )}

      <p className="text-center text-xs text-ink-soft">
        {clock.state.status === "syncing" && "Sincronizando relógio com o servidor…"}
        {clock.state.status === "synced" &&
          `Relógio sincronizado · diferença ${(clock.state.offset.offsetMs / 1000).toFixed(1)} s · precisão ±${Math.round(
            clock.state.offset.rttMs / 2,
          )} ms`}
        {clock.state.status === "error" && (
          <>
            Relógio não sincronizado: {clock.state.message}{" "}
            <button onClick={clock.sync} className="font-semibold underline">
              Tentar de novo
            </button>
          </>
        )}
      </p>

      <ConfirmDialog
        open={confirming === "start"}
        onClose={() => setConfirming(null)}
        onConfirm={() => run("start")}
        tone="accent"
        title={`Dar a largada da ${race.name}?`}
        description="O cronômetro começa agora em todos os aparelhos."
        confirmLabel="Sim, largar"
      />
      <ConfirmDialog
        open={confirming === "finish"}
        onClose={() => setConfirming(null)}
        onConfirm={() => run("finish")}
        title="Encerrar a corrida?"
        description="Novas chegadas passam a ser recusadas em todos os aparelhos. Chegadas registradas antes do encerramento em celulares offline ainda serão aceitas quando sincronizarem."
        confirmLabel="Encerrar corrida"
      />
      <ConfirmDialog
        open={confirming === "reset"}
        onClose={() => setConfirming(null)}
        onConfirm={() => run("reset")}
        tone="danger"
        title="Reiniciar a corrida?"
        description={
          <>
            Todas as <strong>{counts?.finishes ?? 0} chegadas</strong> serão apagadas e a corrida volta para “aguardando
            largada”. Os atletas continuam cadastrados. Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Reiniciar corrida"
        confirmText="REINICIAR"
      />
    </div>
  );
}
