"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Podium } from "@/components/podium";
import { BRAND } from "@/lib/brand";
import { SEX_LABEL } from "@/lib/categories";
import { parseTimestamp } from "@/lib/clock";
import { buildResults, filterResults, podiums, type SexFilter } from "@/lib/results";
import { useServerClock } from "@/lib/server-clock";
import { elapsedMs, formatDuration, formatPace } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { Stopwatch } from "../stopwatch";
import { useAutoScroll } from "./use-auto-scroll";

type View = "classificacao" | "premiacao" | "alternar";

const ALTERNATE_MS = 40_000;
const NEW_ARRIVAL_MS = 20_000;
const MEDAL = ["bg-brand text-ink", "bg-zinc-300 text-ink", "bg-amber-600 text-white"];

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
  const list = useMemo(() => filterResults(rows, sex), [rows, sex]);
  const podiumList = useMemo(() => podiums(rows).filter((p) => sex === "all" || p.category.sex === sex), [rows, sex]);
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
      <header className="flex items-center justify-between gap-[2vw] px-[2.5vw] pt-[1.6vw] pb-[1.2vw]">
        <div className="flex min-w-0 items-center gap-[1.2vw]">
          <span className="flex size-[4vw] shrink-0 items-center justify-center rounded-[1vw] bg-brand text-ink">
            <Flag className="size-[2vw]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[2.6vw] leading-tight font-semibold tracking-tight">{race.name}</p>
            <p className="text-[1.3vw] text-white/60">
              {rows.length} {rows.length === 1 ? "atleta chegou" : "atletas chegaram"}
              {sex !== "all" && ` · ${SEX_LABEL[sex]}`}
              {!status.online && <span className="ml-3 text-red-400">● sem conexão</span>}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {race.status === "running" && startMs !== null ? (
            <Stopwatch startMs={startMs} now={clock.now} className="text-[5.5vw] leading-none font-semibold text-brand" />
          ) : race.status === "finished" ? (
            <div>
              <p className="text-[1.2vw] font-medium tracking-[0.3em] text-white/50 uppercase">Resultado final</p>
              {race.start_time && race.finished_at && (
                <p className="tabular font-mono text-[3.5vw] leading-none font-semibold text-brand">
                  {formatDuration(elapsedMs(race.start_time, race.finished_at))}
                </p>
              )}
            </div>
          ) : (
            <span className="text-[2.2vw] font-semibold text-white/60">Aguardando largada</span>
          )}
        </div>
      </header>

      {/* últimas chegadas */}
      {latest.length > 0 && (
        <div className="mx-[2.5vw] flex items-center gap-[1vw] rounded-[1vw] bg-white/[0.06] px-[1.2vw] py-[0.8vw] text-[1.7vw]">
          <span className="shrink-0 text-[1.2vw] font-medium tracking-[0.2em] text-white/50 uppercase">Chegando</span>
          {latest.map((r) => (
            <span
              key={r.finish.client_id}
              className={`min-w-0 truncate rounded-[0.6vw] px-[0.8vw] py-[0.2vw] font-semibold ${
                isNew(r.finish.finish_time) ? "bg-brand text-ink" : "text-white/80"
              }`}
            >
              {r.athlete.bib_number} {r.athlete.name.split(" ")[0]} · {formatDuration(r.elapsedMs)}
            </span>
          ))}
        </div>
      )}

      {/* conteúdo com rolagem automática */}
      <div ref={scrollRef} className="flex-1 overflow-hidden px-[2.5vw] py-[1.2vw]">
        {shown === "classificacao" ? (
          list.length === 0 ? (
            <p className="mt-[12vh] text-center text-[3vw] text-white/50">Aguardando as primeiras chegadas…</p>
          ) : (
            <table className="w-full text-[2.4vw] leading-tight">
              <thead>
                <tr className="text-left text-[1.1vw] font-medium tracking-[0.2em] text-white/40 uppercase">
                  <th className="pr-[1vw] pb-[0.6vw]">Pos</th>
                  <th className="pr-[1vw] pb-[0.6vw]">Nº</th>
                  <th className="pr-[1vw] pb-[0.6vw]">Atleta</th>
                  <th className="pr-[1vw] pb-[0.6vw]">Sexo</th>
                  <th className="pr-[1vw] pb-[0.6vw] text-right">Tempo</th>
                  <th className="pb-[0.6vw] text-right">Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const fresh = isNew(r.finish.finish_time);
                  return (
                    <tr key={r.finish.client_id} className={`border-t border-white/10 ${fresh ? "bg-brand text-ink" : ""}`}>
                      <td className="py-[0.5vw] pr-[1vw]">
                        <span
                          className={`tabular inline-flex size-[3.2vw] items-center justify-center rounded-full text-[1.6vw] font-bold ${
                            fresh ? "bg-ink text-brand" : (MEDAL[r.position - 1] ?? "text-white/70")
                          }`}
                        >
                          {r.position}º
                        </span>
                      </td>
                      <td className="tabular py-[0.5vw] pr-[1vw] font-mono font-semibold">{r.athlete.bib_number}</td>
                      <td className="max-w-[40vw] truncate py-[0.5vw] pr-[1vw] font-semibold">{r.athlete.name}</td>
                      <td className={`py-[0.5vw] pr-[1vw] text-[1.8vw] ${fresh ? "" : "text-white/60"}`}>{r.athlete.sex}</td>
                      <td className="tabular py-[0.5vw] pr-[1vw] text-right font-mono font-semibold">{formatDuration(r.elapsedMs)}</td>
                      <td className={`tabular py-[0.5vw] text-right font-mono text-[1.8vw] ${fresh ? "" : "text-white/60"}`}>
                        {formatPace(r.elapsedMs, distance).replace(" /km", "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          <div className={`mx-auto grid gap-[3vw] pt-[2vw] text-[1.6vw] ${podiumList.length > 1 ? "grid-cols-2" : "max-w-[50vw]"}`}>
            {podiumList.map((p) => (
              <div key={p.category.id} className="rounded-[1.5vw] bg-white/[0.04] p-[2vw] ring-1 ring-white/10">
                <Podium podium={p} tv />
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-[2.5vw] pb-[1vw] text-[1vw] text-white/30">
        <span>{BRAND.name}</span>
        {/* controles discretos */}
        <div className="flex gap-2 text-sm opacity-50 transition-opacity focus-within:opacity-100 hover:opacity-100">
          <select aria-label="Visão" value={view} onChange={(e) => setView(e.target.value as View)} className="rounded-lg bg-white/10 px-2 py-1 text-white">
            <option value="classificacao">Classificação</option>
            <option value="premiacao">Premiação</option>
            <option value="alternar">Alternar</option>
          </select>
          <select aria-label="Sexo" value={sex} onChange={(e) => setSex(e.target.value as SexFilter)} className="rounded-lg bg-white/10 px-2 py-1 text-white">
            <option value="all">Geral</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="rounded-lg bg-white/10 px-2 py-1 text-white">
            Tela cheia
          </button>
          <Link href="/resultados" className="rounded-lg bg-white/10 px-2 py-1 text-white">
            Sair
          </Link>
        </div>
      </footer>
    </>
  );
}
