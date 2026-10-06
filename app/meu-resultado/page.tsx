"use client";

import { ChevronRight, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RaceGate } from "@/components/app-shell";
import { LiveIndicator } from "@/components/live-indicator";
import { Card, EmptyState } from "@/components/ui/card";
import { inputClass } from "@/components/ui/field";
import { searchRunners, type RunnerEntry } from "@/lib/runners";
import { formatDuration } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useRunners } from "./use-runners";

const MEDAL = ["bg-gold text-ink", "bg-silver text-ink", "bg-bronze text-ink"];

export default function MeuResultadoPage() {
  return <RaceGate>{(race) => <RunnerSearch race={race} />}</RaceGate>;
}

function RunnerSearch({ race }: { race: Race }) {
  const { entries, totalFinishers, status } = useRunners(race);
  const [query, setQuery] = useState("");
  const found = useMemo(() => searchRunners(entries, query), [entries, query]);
  const date = race.start_time ? new Date(race.start_time).toLocaleDateString("pt-BR") : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl bg-stage p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -top-20 -left-16 size-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">Resultados</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{race.name}</h1>
          <p className="mt-1 text-sm text-white/60">
            {Number(race.distance_km).toLocaleString("pt-BR")} km{date && ` · ${date}`} · {totalFinishers}{" "}
            {totalFinishers === 1 ? "atleta chegou" : "atletas chegaram"}
          </p>
          <LiveIndicator status={status} dark className="mt-3 text-xs font-medium" />
        </div>
      </section>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque pelo seu nome ou número"
          aria-label="Buscar corredor por nome ou número"
          autoComplete="off"
          className={`${inputClass} h-14 rounded-2xl pl-11 text-lg shadow-sm`}
        />
      </div>

      <Card className="overflow-hidden">
        {found.length === 0 ? (
          <EmptyState
            icon={<Search size={22} />}
            title={entries.length ? "Nenhum corredor encontrado" : "Nenhum corredor inscrito ainda"}
            description={entries.length ? "Confira o nome ou o número do peito." : undefined}
          />
        ) : (
          <ul className="divide-y divide-line">
            {found.map((e) => (
              <RunnerRow key={e.athlete.id} entry={e} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RunnerRow({ entry }: { entry: RunnerEntry }) {
  const { athlete, row, sexPosition, prize } = entry;
  return (
    <li>
      <Link
        href={`/meu-resultado/${athlete.bib_number}`}
        data-testid="runner-row"
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-canvas/60"
      >
        <span
          className={`tabular flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            row ? (MEDAL[row.overall - 1] ?? "bg-canvas text-ink") : "bg-canvas text-ink-soft"
          }`}
        >
          {row ? `${row.overall}º` : "—"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{athlete.name}</span>
            {prize && <Trophy size={14} className="shrink-0 text-gold" aria-label="Premiado" />}
          </span>
          <span className="text-sm text-ink-soft">
            nº {athlete.bib_number}
            {sexPosition && ` · ${sexPosition}º ${athlete.sex === "F" ? "feminino" : "masculino"}`}
          </span>
        </span>
        <span className="tabular shrink-0 font-mono font-semibold">
          {row ? formatDuration(row.elapsedMs) : <span className="font-sans text-sm font-normal text-ink-soft">Não chegou</span>}
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-soft" />
      </Link>
    </li>
  );
}
