import type { Podium as PodiumData } from "@/lib/results";
import { formatDuration } from "@/lib/time";

// altura e cor de cada degrau, do 1º ao 5º
const STEP_HEIGHT = ["h-28", "h-20", "h-14", "h-10", "h-8"];
const STEP_HEIGHT_TV = ["h-[14vw]", "h-[10vw]", "h-[7vw]", "h-[5vw]", "h-[3.8vw]"];
const STEP_COLOR = ["bg-brand text-ink", "bg-zinc-300 text-ink", "bg-amber-600 text-white"];
// telão (fundo escuro): ouro, prata e bronze
const STEP_COLOR_TV = [
  "bg-linear-to-b from-gold to-[#c9962c] text-ink",
  "bg-linear-to-b from-silver to-[#a3abb6] text-ink",
  "bg-linear-to-b from-bronze to-[#9c6232] text-ink",
];

/** Ordem dos degraus da esquerda para a direita: 1º no centro (3 → 2,1,3 · 5 → 4,2,1,3,5). */
export function podiumOrder(size: number): number[] {
  const places = Array.from({ length: size }, (_, i) => i + 1);
  const left = places.filter((p) => p % 2 === 0).reverse();
  const right = places.filter((p) => p % 2 === 1 && p > 1);
  return [...left, 1, ...right];
}

/** Pódio visual com o 1º no centro. `tv` = escala e cores do telão (fundo escuro). */
export function Podium({ podium, tv = false }: { podium: PodiumData; tv?: boolean }) {
  const size = podium.category.podiumSize;
  const compact = size > 3;

  return (
    <div>
      <h3 className={`text-center font-semibold tracking-tight ${tv ? "mb-[1.5vw] text-[2.4vw] font-black text-white" : "mb-4 text-lg"}`}>
        {podium.category.label}{" "}
        <span className={`ml-1 font-normal ${tv ? "text-[1.4vw] text-brand" : "text-sm text-ink-soft"}`}>top {size}</span>
      </h3>
      <div
        className={`grid items-end ${tv ? "gap-[0.6vw]" : compact ? "gap-1" : "gap-2"}`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {podiumOrder(size).map((place) => {
          const w = podium.winners[place - 1];
          const color = (tv ? STEP_COLOR_TV : STEP_COLOR)[place - 1] ?? (tv ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-zinc-200 text-ink");
          return (
            <div key={place} className={`flex min-w-0 flex-col items-center text-center ${tv ? "gap-[0.6vw]" : "gap-2"}`}>
              {w ? (
                <div className="w-full min-w-0 px-0.5" title={w.athlete.name}>
                  <p
                    className={`font-semibold ${compact || tv ? "line-clamp-2 leading-tight break-words" : "truncate"} ${
                      tv ? (compact ? "text-[1.5vw] text-white" : "text-[2vw] text-white") : compact ? "text-xs" : "text-sm"
                    }`}
                  >
                    {w.athlete.name}
                  </p>
                  <p
                    className={`tabular font-mono ${
                      tv ? (compact ? "text-[1.1vw] text-white/80" : "text-[1.4vw] text-white/80") : compact ? "text-[10px] text-ink-soft" : "text-xs text-ink-soft"
                    }`}
                  >
                    {formatDuration(w.elapsedMs)}
                  </p>
                  <p className={tv ? "text-[1vw] text-white/70" : "text-[10px] text-ink-soft"}>nº {w.athlete.bib_number}</p>
                </div>
              ) : (
                <p className={tv ? "text-[1.6vw] text-white/50" : "text-sm text-ink-soft/50"}>—</p>
              )}
              <div
                className={`flex w-full items-start justify-center font-black ${color} ${
                  tv
                    ? `${STEP_HEIGHT_TV[place - 1]} rounded-t-[0.8vw] pt-[0.5vw] ${compact ? "text-[1.8vw]" : "text-[2.4vw]"}`
                    : `${STEP_HEIGHT[place - 1]} rounded-t-xl pt-1.5 ${compact ? "text-base" : "text-xl"}`
                }`}
              >
                {place}º
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MEDAL = ["bg-brand text-ink", "bg-zinc-300 text-ink", "bg-amber-600 text-white"];

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
