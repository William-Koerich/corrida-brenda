"use client";

import { Trash2 } from "lucide-react";
import { BibChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseTimestamp } from "@/lib/clock";
import { elapsedMs, formatDuration } from "@/lib/time";
import type { Athlete, Finish } from "@/lib/types";

const MAX_ITEMS = 30;

interface Props {
  finishes: Finish[];
  athletesById: ReadonlyMap<string, Athlete>;
  startTime: string | null;
  deviceId: string;
  selectedId: string | null;
  onSelect: (f: Finish) => void;
  onDelete: (f: Finish) => void;
}

export function RecentList({ finishes, athletesById, startTime, deviceId, selectedId, onSelect, onDelete }: Props) {
  const recent = [...finishes].sort((a, b) => b.finish_time.localeCompare(a.finish_time)).slice(0, MAX_ITEMS);

  if (!recent.length) {
    return <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink-soft ring-1 ring-black/5">Nenhuma chegada registrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {recent.map((f) => {
        const athlete = f.athlete_id ? athletesById.get(f.athlete_id) : undefined;
        const selected = f.client_id === selectedId;
        return (
          <li
            key={f.client_id}
            className={`flex items-center gap-3 rounded-2xl p-2.5 pl-3 ring-1 transition ${
              selected
                ? "bg-sky-50 ring-2 ring-sky-500"
                : athlete
                  ? "bg-white ring-black/5"
                  : "bg-amber-50 ring-amber-300"
            }`}
          >
            <span className="tabular w-22 shrink-0 font-mono text-base font-semibold">
              {startTime
                ? formatDuration(elapsedMs(startTime, f.finish_time))
                : new Date(parseTimestamp(f.finish_time)).toLocaleTimeString("pt-BR")}
            </span>
            {athlete ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <BibChip bib={athlete.bib_number} />
                <span className="truncate font-medium">{athlete.name}</span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 text-sm font-semibold text-amber-800">
                Sem número{f.device_id !== deviceId && <span className="font-normal"> · outro aparelho</span>}
              </span>
            )}
            <Button size="sm" variant={athlete ? "secondary" : "primary"} onClick={() => onSelect(f)}>
              {athlete ? "Corrigir" : "Identificar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Excluir chegada"
              className="text-red-700 hover:bg-red-50"
              onClick={() => onDelete(f)}
            >
              <Trash2 size={16} />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
