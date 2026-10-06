"use client";

import { Flag, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { Podium } from "@/components/podium";
import { BRAND } from "@/lib/brand";
import { PODIUM_SIZE, SEX_LABEL } from "@/lib/categories";
import { parseTimestamp } from "@/lib/clock";
import { buildResults, filterResults, podiums, type ResultRow, type SexFilter } from "@/lib/results";
import { useServerClock } from "@/lib/server-clock";
import { elapsedMs, formatDuration } from "@/lib/time";
import type { Race, Sex } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { Stopwatch } from "../stopwatch";
import { useAutoScroll } from "./use-auto-scroll";

type View = "classificacao" | "premiacao" | "alternar";
type Ranked = ResultRow & { position: number };

const ALTERNATE_MS = 40_000;
/** O telão confere o servidor a cada 3 s (além do tempo real). */
const TELAO_LIVE_MS = 3_000;
const NEW_ARRIVAL_MS = 20_000;
const RECENT_COUNT = 4;
// ouro, prata, bronze; 4º e 5º premiados com contorno rosa
const MEDAL = ["bg-gold text-ink", "bg-silver text-ink", "bg-bronze text-ink"];

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
  const { finishes, status } = useFinishes(race.id, () => {}, { liveMs: TELAO_LIVE_MS });
  const clock = useServerClock();
  const { view, setView, sex, setSex } = useTelaoSettings();
  const [alternate, setAlternate] = useState<"classificacao" | "premiacao">("classificacao");
  const [now, setNow] = useState(() => Date.now());

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
  const bySex = useMemo(() => ({ F: filterResults(rows, "F"), M: filterResults(rows, "M") }), [rows]);
  const podiumList = useMemo(() => podiums(rows).filter((p) => sex === "all" || p.category.sex === sex), [rows, sex]);
  // últimas chegadas, já com a posição dentro do sexo
  const latest = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.finish.finish_time.localeCompare(a.finish.finish_time))
        .slice(0, RECENT_COUNT + 1)
        .map((r) => bySex[r.athlete.sex].find((x) => x.finish.client_id === r.finish.client_id)!),
    [rows, bySex],
  );
  const isNew = (finishTime: string) => {
    const age = now - parseTimestamp(finishTime);
    return age >= -2000 && age < NEW_ARRIVAL_MS;
  };

  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;
  const columns: Sex[] = sex === "all" ? ["F", "M"] : [sex];

  return (
    <>
      {/* linha fina da marca no topo */}
      <div className="absolute inset-x-0 top-0 h-[0.35vw] bg-linear-to-r from-brand via-brand-strong to-transparent" />

      {/* cabeçalho */}
      <header className="relative flex items-end justify-between gap-[2vw] border-b border-white/10 px-[3vw] pt-[2.4vw] pb-[1.4vw]">
        <div className="flex min-w-0 items-center gap-[1.2vw]">
          <span className="flex size-[3.8vw] shrink-0 items-center justify-center rounded-[1vw] bg-brand text-white">
            <Flag className="size-[1.9vw]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-[0.8vw] text-[1vw] font-semibold tracking-[0.3em] text-white/50 uppercase">
              {race.status === "running" && (
                <span className="flex items-center gap-[0.4vw] text-brand">
                  <span className="size-[0.55vw] animate-pulse rounded-full bg-brand" /> Ao vivo
                </span>
              )}
              {race.status === "finished" && <span className="text-gold">Resultado final</span>}
              {race.status !== "not_started" && <span className="text-white/25">·</span>}
              <span>{distance.toLocaleString("pt-BR")} km</span>
            </p>
            <p className="truncate text-[2.6vw] leading-tight font-bold tracking-tight">{race.name}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-end gap-[2.5vw]">
          <Stat label="Chegaram" value={rows.length} />
          <div className="text-right">
            <p className="text-[1vw] font-semibold tracking-[0.3em] text-white/50 uppercase">Tempo de prova</p>
            {race.status === "running" && startMs !== null ? (
              <Stopwatch startMs={startMs} now={clock.now} className="text-[4.4vw] leading-none font-semibold" />
            ) : (
              <p className="tabular font-mono text-[4.4vw] leading-none font-semibold text-white/40">
                {race.status === "finished" && race.start_time && race.finished_at
                  ? formatDuration(elapsedMs(race.start_time, race.finished_at))
                  : "00:00:00"}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* conteúdo */}
      <main className="relative flex min-h-0 flex-1 gap-[2vw] px-[3vw] pt-[1.6vw] pb-[1vw]">
        {shown === "classificacao" ? (
          <>
            <aside className="flex w-[28vw] shrink-0 flex-col gap-[1.4vw]">
              <LatestCard row={latest[0]} fresh={latest[0] ? isNew(latest[0].finish.finish_time) : false} />
              {latest.length > 1 && (
                <div className="flex flex-col">
                  <p className="mb-[0.6vw] text-[0.95vw] font-semibold tracking-[0.3em] text-white/45 uppercase">Chegaram antes</p>
                  {latest.slice(1).map((r) => (
                    <div key={r.finish.client_id} className="flex items-center gap-[0.9vw] border-t border-white/8 py-[0.7vw]">
                      <span className="tabular w-[3vw] font-mono text-[1.3vw] font-semibold text-white/50">{r.athlete.bib_number}</span>
                      <span className="min-w-0 flex-1 truncate text-[1.4vw] font-medium text-white/90">{r.athlete.name}</span>
                      <span className="tabular font-mono text-[1.3vw] text-white/70">{formatDuration(r.elapsedMs)}</span>
                    </div>
                  ))}
                </div>
              )}
            </aside>

            <section className={`grid min-w-0 flex-1 gap-[2vw] ${columns.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {columns.map((s) => (
                <Leaderboard key={s} sex={s} list={bySex[s]} isNew={isNew} scrollKey={`${shown}-${sex}`} />
              ))}
            </section>
          </>
        ) : (
          <section className="flex flex-1 flex-col justify-center pb-[2vw]">
            <h2 className="mb-[2vw] flex items-center justify-center gap-[1vw] text-[2.4vw] font-bold tracking-tight">
              <Trophy className="size-[2.4vw] text-gold" /> Premiação
            </h2>
            <div className={`mx-auto grid w-full gap-[3vw] ${podiumList.length > 1 ? "grid-cols-2" : "max-w-[55vw]"}`}>
              {podiumList.map((p) => (
                <div key={p.category.id} className="rounded-[1.6vw] bg-white/[0.04] px-[2vw] pt-[2vw] ring-1 ring-white/10">
                  <Podium podium={p} tv />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="relative flex items-center justify-between px-[3vw] pb-[1vw] text-[0.95vw] text-white/35">
        <span className="flex items-center gap-[1.2vw]">
          {BRAND.name}
          <LiveIndicator status={status} dark />
        </span>
        {/* controles discretos */}
        <div className="flex gap-2 text-sm opacity-40 transition-opacity focus-within:opacity-100 hover:opacity-100">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="text-[1vw] font-semibold tracking-[0.3em] text-white/50 uppercase">{label}</p>
      <p className="tabular font-mono text-[2.6vw] leading-none font-semibold">{value}</p>
    </div>
  );
}

/** Destaque de quem acabou de cruzar a linha (anima a cada nova chegada). */
function LatestCard({ row, fresh }: { row?: Ranked; fresh: boolean }) {
  if (!row) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[1vw] rounded-[1.6vw] bg-white/[0.04] p-[2vw] text-center ring-1 ring-white/10">
        <Flag className="size-[3.5vw] text-white/40" />
        <p className="text-[1.8vw] font-semibold text-white/70">Aguardando os primeiros atletas</p>
      </div>
    );
  }
  const { athlete } = row;
  const prize = row.position <= PODIUM_SIZE[athlete.sex];
  return (
    <div
      key={row.finish.client_id}
      data-testid="latest-card"
      className={`animate-pop-in relative overflow-hidden rounded-[1.6vw] bg-white/[0.06] p-[2vw] ring-1 transition-[box-shadow] ${
        fresh ? "ring-brand/70 shadow-[0_0_4vw_-1vw_rgba(255,77,157,0.55)]" : "ring-white/10"
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-[0.35vw] ${fresh ? "bg-brand" : "bg-white/20"}`} />
      <p className={`text-[1vw] font-semibold tracking-[0.3em] uppercase ${fresh ? "text-brand" : "text-white/50"}`}>
        {fresh ? "Chegou agora" : "Última chegada"}
      </p>
      <div className="mt-[1.2vw] flex items-baseline gap-[1vw]">
        <span className="tabular font-mono text-[2vw] font-semibold text-white/50">#{athlete.bib_number}</span>
        <p className="line-clamp-2 text-[2.5vw] leading-[1.1] font-bold tracking-tight">{athlete.name}</p>
      </div>
      <p className="tabular mt-[1vw] font-mono text-[4.2vw] leading-none font-semibold">{formatDuration(row.elapsedMs)}</p>
      <div className="mt-[1.2vw] flex items-center gap-[0.8vw] text-[1.3vw] text-white/70">
        <span
          className={`tabular inline-flex h-[2.2vw] min-w-[2.2vw] items-center justify-center rounded-full px-[0.5vw] text-[1.1vw] font-bold ${
            MEDAL[row.position - 1] ?? (prize ? "text-brand ring-2 ring-brand" : "bg-white/10")
          }`}
        >
          {row.position}º
        </span>
        {athlete.sex === "F" ? "no feminino" : "no masculino"} · {row.overall}º geral
      </div>
    </div>
  );
}

/** Ranking de um sexo: premiados destacados com medalha; rola sozinho. */
function Leaderboard({
  sex,
  list,
  isNew,
  scrollKey,
}: {
  sex: Sex;
  list: Ranked[];
  isNew: (finishTime: string) => boolean;
  scrollKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoScroll(ref, `${scrollKey}-${sex}`);
  const prizes = PODIUM_SIZE[sex];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-[0.8vw] flex items-baseline justify-between border-b border-white/10 pb-[0.6vw]">
        <h2 className="text-[1.9vw] font-bold tracking-tight">{SEX_LABEL[sex]}</h2>
        <span className="text-[1vw] font-semibold tracking-[0.2em] text-white/45 uppercase">
          {list.length} {list.length === 1 ? "chegou" : "chegaram"} · <span className="text-brand">top {prizes}</span>
        </span>
      </div>
      <div ref={ref} data-testid={`leaderboard-${sex}`} className="min-h-0 flex-1 overflow-hidden">
        {list.length === 0 ? (
          <p className="pt-[4vw] text-center text-[1.5vw] text-white/40">Aguardando chegadas…</p>
        ) : (
          <ol className="flex flex-col gap-[0.4vw]">
            {list.map((r) => {
              const prize = r.position <= prizes;
              const fresh = isNew(r.finish.finish_time);
              return (
                <li
                  key={r.finish.client_id}
                  data-testid="rank-row"
                  className={`flex items-center gap-[1vw] rounded-[0.8vw] px-[1vw] py-[0.65vw] ${
                    fresh ? "animate-pop-in bg-brand/20 ring-1 ring-brand/60" : prize ? "bg-white/[0.07]" : ""
                  }`}
                >
                  <span
                    className={`tabular flex size-[2.5vw] shrink-0 items-center justify-center rounded-full text-[1.15vw] font-bold ${
                      prize ? (MEDAL[r.position - 1] ?? "text-brand ring-2 ring-brand") : "text-white/45"
                    }`}
                  >
                    {r.position}º
                  </span>
                  <span className="tabular w-[3.2vw] shrink-0 font-mono text-[1.25vw] font-semibold text-white/45">{r.athlete.bib_number}</span>
                  <span
                    data-testid="rank-name"
                    className={`min-w-0 flex-1 truncate text-[1.5vw] ${prize ? "font-semibold text-white" : "text-white/80"}`}
                  >
                    {r.athlete.name}
                  </span>
                  <span className={`tabular shrink-0 font-mono text-[1.45vw] font-semibold ${prize ? "text-white" : "text-white/70"}`}>
                    {formatDuration(r.elapsedMs)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
