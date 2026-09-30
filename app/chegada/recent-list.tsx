"use client";

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

export function RecentList({
  finishes,
  athletesById,
  startTime,
  deviceId,
  selectedId,
  onSelect,
  onDelete,
}: Props) {
  const recent = [...finishes]
    .sort((a, b) => b.finish_time.localeCompare(a.finish_time))
    .slice(0, MAX_ITEMS);

  if (!recent.length) {
    return <p className="text-center text-black/60">Nenhuma chegada registrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {recent.map((f) => {
        const athlete = f.athlete_id ? athletesById.get(f.athlete_id) : undefined;
        const selected = f.client_id === selectedId;
        return (
          <li
            key={f.client_id}
            className={`flex items-center gap-3 rounded-lg border-2 p-2 ${
              selected ? "border-blue-600 bg-blue-50" : athlete ? "border-black/20" : "border-orange-500 bg-orange-50"
            }`}
          >
            <span className="w-24 shrink-0 font-mono text-lg font-bold tabular-nums">
              {startTime
                ? formatDuration(elapsedMs(startTime, f.finish_time))
                : new Date(parseTimestamp(f.finish_time)).toLocaleTimeString("pt-BR")}
            </span>
            <span className="min-w-0 flex-1">
              {athlete ? (
                <>
                  <span className="text-lg font-black">{athlete.bib_number}</span>{" "}
                  <span className="truncate">{athlete.name}</span>
                </>
              ) : (
                <span className="font-bold text-orange-700">
                  SEM NÚMERO{f.device_id !== deviceId && " · outro aparelho"}
                </span>
              )}
            </span>
            <button
              onClick={() => onSelect(f)}
              className="rounded-lg border-2 border-black px-3 py-2 text-sm font-bold"
            >
              {athlete ? "Corrigir" : "Identificar"}
            </button>
            <button
              onClick={() => onDelete(f)}
              aria-label="Excluir chegada"
              className="rounded-lg border-2 border-red-700 px-3 py-2 text-sm font-bold text-red-700"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
