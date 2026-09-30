"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, CUMULATIVE_AWARDS } from "@/lib/categories";
import { buildResults, filterResults, podiums, resultsToCsv, type ResultFilter } from "@/lib/results";
import { formatDuration, formatPace } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { UnidentifiedList } from "./unidentified-list";

type Tab = "classificacao" | "premiacao";

const MEDALS = ["🥇", "🥈", "🥉"];

function parseFilter(value: string): ResultFilter {
  if (value === "M" || value === "F") return { kind: "sex", sex: value };
  if (value.startsWith("cat:")) return { kind: "category", categoryId: value.slice(4) };
  return { kind: "all" };
}

export function ResultsBoard({ race }: { race: Race }) {
  const athletes = useAthletes(race.id);
  const [actionError, setActionError] = useState<string | null>(null);
  const { finishes, loadError, status: syncStatus, assign, remove } = useFinishes(race.id, setActionError);
  const [tab, setTab] = useState<Tab>("classificacao");
  const [filterValue, setFilterValue] = useState("all");

  const distance = Number(race.distance_km);
  const { rows, unidentified } = useMemo(
    () => buildResults(race, athletes.byBib.values(), finishes),
    [race, athletes.byBib, finishes],
  );
  const filtered = useMemo(() => filterResults(rows, parseFilter(filterValue)), [rows, filterValue]);
  const podiumList = useMemo(() => podiums(rows), [rows]);

  function exportCsv() {
    const blob = new Blob([resultsToCsv(rows, distance)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultados-${race.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!race.start_time) {
    return (
      <>
        <h1 className="text-3xl font-bold">Classificação</h1>
        <p className="rounded-lg border-4 border-black p-6 text-center text-xl font-bold">
          {race.name}: a corrida ainda não largou.
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Classificação</h1>
          <p>
            {race.name} · {rows.length} classificados
            {race.status === "running" && syncStatus.online && (
              <span className="ml-2 font-bold text-green-700">● ao vivo</span>
            )}
            {!syncStatus.online && <span className="ml-2 font-bold text-red-700">● offline (dados podem estar desatualizados)</span>}
            {race.status === "finished" && " · encerrada"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/telao" className="rounded-lg border-2 border-black px-4 py-2 font-bold">
            Modo telão
          </Link>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-lg border-2 border-black px-4 py-2 font-bold disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {(loadError || athletes.error || actionError) && (
        <p className="rounded-lg bg-red-100 p-2 font-bold text-red-800">
          {loadError ?? athletes.error ?? actionError}
        </p>
      )}

      <UnidentifiedList
        unidentified={unidentified}
        allFinishes={finishes}
        athletesByBib={athletes.byBib}
        startTime={race.start_time}
        onAssign={(clientId, athlete) => {
          setActionError(null);
          assign(clientId, athlete);
        }}
        onDelete={remove}
      />

      <div role="tablist" className="grid grid-cols-2 rounded-lg border-2 border-black">
        {(
          [
            ["classificacao", "Classificação"],
            ["premiacao", "Premiação"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-3 text-lg font-bold ${tab === id ? "bg-black text-white" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "classificacao" ? (
        <>
          <label className="flex items-center gap-2">
            <span className="font-bold">Filtro</span>
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-lg"
            >
              <option value="all">Geral</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <optgroup label="Categorias">
                {CATEGORIES.filter((c) => c.band).map((c) => (
                  <option key={c.id} value={`cat:${c.id}`}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-black/60">Nenhum atleta classificado neste filtro ainda.</p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-black text-sm">
                  <th className="py-2 pr-2">Pos.</th>
                  <th className="py-2 pr-2">Nº</th>
                  <th className="py-2 pr-2">Nome</th>
                  <th className="hidden py-2 pr-2 sm:table-cell">Idade</th>
                  <th className="hidden py-2 pr-2 sm:table-cell">Sexo</th>
                  <th className="py-2 pr-2 text-right">Tempo</th>
                  <th className="py-2 text-right">Ritmo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.finish.client_id} className="border-b border-black/10">
                    <td className="py-2 pr-2 text-xl font-black tabular-nums">
                      {r.position}º
                      {filterValue !== "all" && (
                        <span className="block text-xs font-normal text-black/50">{r.overall}º geral</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-bold tabular-nums">{r.athlete.bib_number}</td>
                    <td className="py-2 pr-2">
                      <span className="font-bold">{r.athlete.name}</span>
                      <span className="block text-sm text-black/60 sm:hidden">
                        {r.athlete.age} · {r.athlete.sex}
                      </span>
                    </td>
                    <td className="hidden py-2 pr-2 sm:table-cell">{r.athlete.age}</td>
                    <td className="hidden py-2 pr-2 sm:table-cell">{r.athlete.sex}</td>
                    <td className="py-2 pr-2 text-right font-mono font-bold tabular-nums">
                      {formatDuration(r.elapsedMs)}
                    </td>
                    <td className="py-2 text-right font-mono text-sm tabular-nums whitespace-nowrap">
                      {formatPace(r.elapsedMs, distance).replace(" /km", "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-black/60">
            {CUMULATIVE_AWARDS
              ? "Premiação cumulativa: quem está no pódio geral também concorre na faixa etária."
              : "Premiação não cumulativa: quem está no pódio geral não é premiado na faixa etária."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {podiumList.map(({ category, winners }) => (
              <section key={category.id} className="rounded-lg border-2 border-black p-3">
                <h3 className="mb-2 text-lg font-black">{category.label}</h3>
                <ol className="flex flex-col gap-1">
                  {MEDALS.map((medal, i) => {
                    const w = winners[i];
                    return (
                      <li key={medal} className="flex items-center gap-2">
                        <span className="text-2xl">{medal}</span>
                        {w ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">
                              <strong className="tabular-nums">{w.athlete.bib_number}</strong> {w.athlete.name}
                            </span>
                            <span className="font-mono font-bold tabular-nums">{formatDuration(w.elapsedMs)}</span>
                          </>
                        ) : (
                          <span className="text-black/40">—</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
