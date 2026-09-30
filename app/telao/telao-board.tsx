"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SEX_LABEL } from "@/lib/categories";
import { parseTimestamp } from "@/lib/clock";
import { buildResults, filterResults, podiums } from "@/lib/results";
import { useServerClock } from "@/lib/server-clock";
import { formatDuration, formatPace } from "@/lib/time";
import type { Race, Sex } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { Stopwatch } from "../stopwatch";
import { useAutoScroll } from "./use-auto-scroll";

type View = "classificacao" | "premiacao" | "alternar";
type SexFilter = "all" | Sex;

const ALTERNATE_MS = 40_000;
const NEW_ARRIVAL_MS = 20_000;
const MEDALS = ["🥇", "🥈", "🥉"];

/** Configuração pela URL (?view=premiacao&sexo=F) para deixar a TV pronta. */
function useTelaoSettings() {
  const [view, setView] = useState<View>("classificacao");
  const [sex, setSex] = useState<SexFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    const s = params.get("sexo");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL só existe no navegador
    if (v === "premiacao" || v === "alternar") setView(v);
    if (s === "M" || s === "F") setSex(s);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "classificacao") params.set("view", view);
    if (sex !== "all") params.set("sexo", sex);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [view, sex]);

  return { view, setView, sex, setSex };
}

export function TelaoBoard({ race }: { race: Race }) {
  const athletes = useAthletes(race.id);
  const { finishes, status } = useFinishes(race.id, () => {});
  const clock = useServerClock();
  const { view, setView, sex, setSex } = useTelaoSettings();
  const [alternate, setAlternate] = useState<"classificacao" | "premiacao">("classificacao");
  const [now, setNow] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  const clockNow = clock.now;
  useEffect(() => {
    const id = setInterval(() => setNow(clockNow()), 1000);
    return () => clearInterval(id);
  }, [clockNow]);

  useEffect(() => {
    if (view !== "alternar") return;
    const id = setInterval(() => setAlternate((a) => (a === "classificacao" ? "premiacao" : "classificacao")), ALTERNATE_MS);
    return () => clearInterval(id);
  }, [view]);

  const shown = view === "alternar" ? alternate : view;
  const distance = Number(race.distance_km);
  const { rows } = useMemo(() => buildResults(race, athletes.byBib.values(), finishes), [race, athletes.byBib, finishes]);
  const list = useMemo(
    () => filterResults(rows, sex === "all" ? { kind: "all" } : { kind: "sex", sex }),
    [rows, sex],
  );
  const podiumList = useMemo(
    () => podiums(rows).filter((p) => sex === "all" || p.category.sex === sex),
    [rows, sex],
  );
  const latest = useMemo(
    () => [...rows].sort((a, b) => b.finish.finish_time.localeCompare(a.finish.finish_time)).slice(0, 3),
    [rows],
  );
  const isNew = (finishTime: string) => {
    const age = now - parseTimestamp(finishTime);
    return age >= -2000 && age < NEW_ARRIVAL_MS;
  };

  useAutoScroll(scrollRef, `${shown}-${sex}`);

  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;

  return (
    <>
      {/* cabeçalho */}
      <header className="flex items-center justify-between gap-[2vw] border-b-4 border-yellow-400 px-[2vw] py-[1vw]">
        <div className="min-w-0">
          <p className="truncate text-[2.6vw] font-black leading-tight">{race.name}</p>
          <p className="text-[1.4vw] text-white/70">
            {rows.length} {rows.length === 1 ? "atleta chegou" : "atletas chegaram"}
            {sex !== "all" && ` · ${SEX_LABEL[sex]}`}
            {!status.online && <span className="ml-3 text-red-400">● sem conexão</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {race.status === "running" && startMs !== null ? (
            <Stopwatch startMs={startMs} now={clock.now} className="text-[5vw] font-black text-yellow-400" />
          ) : (
            <span className="text-[3vw] font-black text-yellow-400">
              {race.status === "finished" ? "RESULTADO FINAL" : "AGUARDANDO LARGADA"}
            </span>
          )}
        </div>
      </header>

      {/* últimas chegadas */}
      {latest.length > 0 && (
        <div className="flex gap-[1vw] bg-white/10 px-[2vw] py-[0.8vw] text-[1.8vw]">
          <span className="shrink-0 font-bold text-white/60">Últimas chegadas:</span>
          {latest.map((r) => (
            <span
              key={r.finish.client_id}
              className={`min-w-0 truncate rounded px-[0.6vw] font-bold ${isNew(r.finish.finish_time) ? "bg-yellow-400 text-black" : ""}`}
            >
              {r.athlete.bib_number} {r.athlete.name.split(" ")[0]} · {formatDuration(r.elapsedMs)}
            </span>
          ))}
        </div>
      )}

      {/* conteúdo com rolagem automática */}
      <div ref={scrollRef} className="flex-1 overflow-hidden px-[2vw] py-[1vw]">
        {shown === "classificacao" ? (
          list.length === 0 ? (
            <p className="mt-[10vh] text-center text-[3vw] text-white/60">Aguardando as primeiras chegadas…</p>
          ) : (
            <table className="w-full text-[2.4vw] leading-tight">
              <thead>
                <tr className="text-left text-[1.3vw] uppercase text-white/50">
                  <th className="pb-[0.5vw] pr-[1vw]">Pos</th>
                  <th className="pb-[0.5vw] pr-[1vw]">Nº</th>
                  <th className="pb-[0.5vw] pr-[1vw]">Nome</th>
                  <th className="pb-[0.5vw] pr-[1vw]">Categoria</th>
                  <th className="pb-[0.5vw] pr-[1vw] text-right">Tempo</th>
                  <th className="pb-[0.5vw] text-right">Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.finish.client_id}
                    className={`border-t border-white/15 ${isNew(r.finish.finish_time) ? "bg-yellow-400 text-black" : ""}`}
                  >
                    <td className="py-[0.4vw] pr-[1vw] font-black tabular-nums">{r.position}º</td>
                    <td className="py-[0.4vw] pr-[1vw] font-bold tabular-nums">{r.athlete.bib_number}</td>
                    <td className="max-w-[35vw] truncate py-[0.4vw] pr-[1vw] font-bold">{r.athlete.name}</td>
                    <td className="py-[0.4vw] pr-[1vw] text-[1.8vw]">
                      {r.band?.label} {r.athlete.sex}
                    </td>
                    <td className="py-[0.4vw] pr-[1vw] text-right font-mono font-black tabular-nums">
                      {formatDuration(r.elapsedMs)}
                    </td>
                    <td className="py-[0.4vw] text-right font-mono text-[1.8vw] tabular-nums">
                      {formatPace(r.elapsedMs, distance).replace(" /km", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="grid grid-cols-2 gap-[1.2vw] lg:grid-cols-3">
            {podiumList.map(({ category, winners }) => (
              <section key={category.id} className="rounded-lg border-2 border-white/30 p-[1vw]">
                <h3 className="mb-[0.5vw] text-[1.8vw] font-black text-yellow-400">{category.label}</h3>
                {MEDALS.map((medal, i) => {
                  const w = winners[i];
                  return (
                    <p key={medal} className="flex items-center gap-[0.6vw] text-[1.6vw] leading-snug">
                      <span>{medal}</span>
                      {w ? (
                        <>
                          <span className="min-w-0 flex-1 truncate font-bold">
                            {w.athlete.bib_number} {w.athlete.name}
                          </span>
                          <span className="font-mono tabular-nums">{formatDuration(w.elapsedMs)}</span>
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </p>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* controles discretos */}
      <div className="absolute bottom-2 right-2 flex gap-2 text-sm opacity-40 transition-opacity hover:opacity-100 focus-within:opacity-100">
        <select
          aria-label="Visão"
          value={view}
          onChange={(e) => setView(e.target.value as View)}
          className="rounded bg-white/20 px-2 py-1"
        >
          <option value="classificacao">Classificação</option>
          <option value="premiacao">Premiação</option>
          <option value="alternar">Alternar</option>
        </select>
        <select
          aria-label="Sexo"
          value={sex}
          onChange={(e) => setSex(e.target.value as SexFilter)}
          className="rounded bg-white/20 px-2 py-1"
        >
          <option value="all">Geral</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
        <button
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="rounded bg-white/20 px-2 py-1"
        >
          Tela cheia
        </button>
        <Link href="/resultados" className="rounded bg-white/20 px-2 py-1">
          Sair
        </Link>
      </div>
    </>
  );
}
