import type { ReactNode } from "react";
import type { RaceStatus, Sex } from "@/lib/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft ring-line",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  brand: "bg-volt-soft text-ink ring-volt-strong/40",
  dark: "bg-ink text-white ring-ink",
};

export function Badge({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const RACE_STATUS: Record<RaceStatus, { label: string; tone: Tone }> = {
  not_started: { label: "Aguardando largada", tone: "neutral" },
  running: { label: "Em andamento", tone: "success" },
  finished: { label: "Encerrada", tone: "dark" },
};

export function RaceStatusBadge({ status }: { status: RaceStatus }) {
  const { label, tone } = RACE_STATUS[status];
  return (
    <Badge tone={tone} dot={status === "running"}>
      {label}
    </Badge>
  );
}

export function SexBadge({ sex }: { sex: Sex }) {
  return (
    <span
      className={`inline-flex size-6 items-center justify-center rounded-md text-xs font-bold ${
        sex === "F" ? "bg-fuchsia-100 text-fuchsia-800" : "bg-sky-100 text-sky-800"
      }`}
      title={sex === "F" ? "Feminino" : "Masculino"}
    >
      {sex}
    </span>
  );
}

export function BibChip({ bib, size = "md" }: { bib: number; size?: "md" | "lg" }) {
  return (
    <span
      className={`tabular inline-flex items-center justify-center rounded-lg bg-ink font-mono font-bold text-white ${
        size === "lg" ? "h-11 min-w-14 px-2 text-xl" : "h-8 min-w-11 px-1.5 text-sm"
      }`}
    >
      {bib}
    </span>
  );
}
