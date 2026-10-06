"use client";

import { useEffect, useState } from "react";
import type { SyncStatus } from "@/lib/use-race-data";

/** Passou disso sem conseguir atualizar: avisa que pode estar desatualizado. */
const STALE_MS = 20_000;

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function liveState(status: Pick<SyncStatus, "online" | "lastSync">, now: number) {
  if (!status.online) return { tone: "offline" as const, text: "Sem conexão · tentando de novo" };
  if (status.lastSync === null) return { tone: "loading" as const, text: "Conectando…" };
  const age = Math.max(0, Math.round((now - status.lastSync) / 1000));
  if (age * 1000 > STALE_MS) return { tone: "stale" as const, text: `Atualizado há ${age} s` };
  return { tone: "live" as const, text: age <= 1 ? "Ao vivo · atualizado agora" : `Ao vivo · atualizado há ${age} s` };
}

const LIGHT = {
  live: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  loading: "bg-canvas text-ink-soft ring-line",
  stale: "bg-amber-50 text-amber-900 ring-amber-200",
  offline: "bg-red-50 text-red-800 ring-red-200",
};
const DARK = {
  live: "text-white/60",
  loading: "text-white/50",
  stale: "text-gold",
  offline: "text-red-400",
};

/** "Ao vivo · atualizado há 3 s" — mostra que a tela está se atualizando sozinha. */
export function LiveIndicator({ status, dark = false, className = "" }: { status: SyncStatus; dark?: boolean; className?: string }) {
  const now = useNow();
  const { tone, text } = liveState(status, now);
  const dot = tone === "live" ? "animate-pulse bg-emerald-500" : tone === "offline" ? "bg-red-500" : tone === "stale" ? "bg-amber-500" : "bg-ink-soft";

  if (dark) {
    return (
      <span data-testid="live-indicator" className={`inline-flex items-center gap-[0.5em] ${DARK[tone]} ${className}`}>
        <span className={`size-[0.55em] rounded-full ${dot}`} />
        {text}
      </span>
    );
  }
  return (
    <span
      data-testid="live-indicator"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LIGHT[tone]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}
