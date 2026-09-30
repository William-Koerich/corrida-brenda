"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { resolveBib } from "@/lib/finish-logic";
import { elapsedMs, formatDuration } from "@/lib/time";
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
  const [deleting, setDeleting] = useState<Finish | null>(null);
  if (!unidentified.length) return null;

  return (
    <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300 sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-amber-900">
        <TriangleAlert size={18} />
        <h2 className="font-semibold">
          {unidentified.length}{" "}
          {unidentified.length === 1 ? "chegada sem atleta identificado" : "chegadas sem atleta identificado"}
        </h2>
      </div>
      <ul className="flex flex-col gap-2">
        {unidentified.map((f) => {
          const time = formatDuration(elapsedMs(startTime, f.finish_time));
          return (
            <UnidentifiedRow
              key={f.client_id}
              time={time}
              resolve={(bib) => resolveBib(bib, athletesByBib, allFinishes, f)}
              onAssign={(athlete) => onAssign(f.client_id, athlete)}
              onDelete={() => setDeleting(f)}
            />
          );
        })}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) onDelete(deleting.client_id);
        }}
        tone="danger"
        title="Excluir esta chegada sem número?"
        description={deleting ? `Chegada de ${formatDuration(elapsedMs(startTime, deleting.finish_time))}.` : undefined}
        confirmLabel="Excluir chegada"
      />
    </section>
  );
}

function UnidentifiedRow({
  time,
  resolve,
  onAssign,
  onDelete,
}: {
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
    <li className="rounded-xl bg-white p-2 ring-1 ring-amber-200">
      <form onSubmit={submit} className="flex items-center gap-2">
        <span className="tabular w-22 shrink-0 pl-1 font-mono font-semibold">{time}</span>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="Nº"
          aria-label={`Número para a chegada de ${time}`}
          className="h-10 min-w-0 flex-1"
        />
        <Button type="submit" variant="primary" size="sm" className="h-10">
          Associar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Excluir chegada"
          className="h-10 text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </Button>
      </form>
      {error && <p className="mt-1 px-1 text-sm font-medium text-red-700">{error}</p>}
    </li>
  );
}
