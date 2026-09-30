import type { Podium as PodiumData } from "@/lib/results";
import { formatDuration } from "@/lib/time";

const PLACES = [
  { index: 1, label: "2º", height: "h-20", tvHeight: "h-[7vw]", color: "bg-zinc-300 text-ink" },
  { index: 0, label: "1º", height: "h-28", tvHeight: "h-[10vw]", color: "bg-volt text-ink" },
  { index: 2, label: "3º", height: "h-14", tvHeight: "h-[5vw]", color: "bg-amber-600 text-white" },
];

/** Pódio visual: 2º à esquerda, 1º no centro, 3º à direita. `tv` = escala para telão. */
export function Podium({ podium, tv = false }: { podium: PodiumData; tv?: boolean }) {
  return (
    <div>
      <h3 className={`text-center font-semibold tracking-tight ${tv ? "mb-[1.5vw] text-[2.4vw] text-volt" : "mb-4 text-lg"}`}>
        {podium.category.label}
      </h3>
      <div className={`grid grid-cols-3 items-end ${tv ? "gap-[0.6vw]" : "gap-2"}`}>
        {PLACES.map(({ index, label, height, tvHeight, color }) => {
          const w = podium.winners[index];
          return (
            <div key={label} className={`flex min-w-0 flex-col items-center text-center ${tv ? "gap-[0.6vw]" : "gap-2"}`}>
              {w ? (
                <div className="w-full min-w-0 px-1">
                  <p className={`truncate font-semibold ${tv ? "text-[1.7vw] text-white" : "text-sm"}`}>{w.athlete.name}</p>
                  <p className={`tabular font-mono ${tv ? "text-[1.4vw] text-white/60" : "text-xs text-ink-soft"}`}>
                    {formatDuration(w.elapsedMs)}
                  </p>
                  <p className={tv ? "text-[1.1vw] text-white/40" : "text-[11px] text-ink-soft"}>nº {w.athlete.bib_number}</p>
                </div>
              ) : (
                <p className={tv ? "text-[1.6vw] text-white/30" : "text-sm text-ink-soft/50"}>—</p>
              )}
              <div
                className={`flex w-full items-start justify-center font-black ${color} ${
                  tv ? `${tvHeight} rounded-t-[0.8vw] pt-[0.6vw] text-[2.4vw]` : `${height} rounded-t-xl pt-2 text-xl`
                }`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MEDAL = ["bg-volt text-ink", "bg-zinc-300 text-ink", "bg-amber-600 text-white"];

/** Posição com destaque para o top 3. */
export function PositionBadge({ position }: { position: number }) {
  return (
    <span
      className={`tabular inline-flex size-8 items-center justify-center rounded-full text-sm font-bold ${
        MEDAL[position - 1] ?? "text-ink-soft"
      }`}
    >
      {position}º
    </span>
  );
}
