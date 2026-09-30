"use client";

import { useState } from "react";
import { resolveBib } from "@/lib/finish-logic";
import { formatDuration, elapsedMs } from "@/lib/time";
import type { Athlete, Finish } from "@/lib/types";

interface Props {
  unidentified: Finish[];
  allFinishes: Finish[];
  athletesByBib: ReadonlyMap<number, Athlete>;
  startTime: string;
  onAssign: (clientId: string, athlete: Athlete) => void;
  onDelete: (clientId: string) => void;
}

/** Chegadas sem atleta: associar um número ou excluir. */
export function UnidentifiedList({ unidentified, allFinishes, athletesByBib, startTime, onAssign, onDelete }: Props) {
  if (!unidentified.length) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border-4 border-orange-500 bg-orange-50 p-3">
      <h2 className="text-xl font-bold text-orange-800">
        {unidentified.length} {unidentified.length === 1 ? "chegada sem atleta identificado" : "chegadas sem atleta identificado"}
      </h2>
      <ul className="flex flex-col gap-2">
        {unidentified.map((f) => (
          <UnidentifiedRow
            key={f.client_id}
            finish={f}
            time={formatDuration(elapsedMs(startTime, f.finish_time))}
            resolve={(bib) => resolveBib(bib, athletesByBib, allFinishes, f)}
            onAssign={(athlete) => onAssign(f.client_id, athlete)}
            onDelete={() => {
              if (window.confirm("Excluir esta chegada sem número?")) onDelete(f.client_id);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function UnidentifiedRow({
  finish,
  time,
  resolve,
  onAssign,
  onDelete,
}: {
  finish: Finish;
  time: string;
  resolve: (bib: number) => ReturnType<typeof resolveBib>;
  onAssign: (athlete: Athlete) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const bib = Number(value);
    if (!bib) return;
    const result = resolve(bib);
    if (result.kind === "not_found") setError(`Número ${bib} não cadastrado`);
    else if (result.kind === "duplicate") setError(`Nº ${bib} (${result.athlete.name}) já tem chegada`);
    else {
      setError(null);
      onAssign(result.athlete);
    }
  }

  return (
    <li className="flex flex-col gap-1 rounded-lg bg-white p-2" data-client-id={finish.client_id}>
      <form onSubmit={submit} className="flex items-center gap-2">
        <span className="w-24 shrink-0 font-mono text-lg font-bold tabular-nums">{time}</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Nº"
          aria-label={`Número para a chegada de ${time}`}
          className="w-20 min-w-0 flex-1 rounded-lg border-2 border-black px-2 py-2 text-lg font-bold"
        />
        <button type="submit" className="rounded-lg bg-black px-3 py-2 font-bold text-white">
          Associar
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir chegada"
          className="rounded-lg border-2 border-red-700 px-3 py-2 font-bold text-red-700"
        >
          ✕
        </button>
      </form>
      {error && <p className="text-sm font-bold text-red-700">{error}</p>}
    </li>
  );
}
