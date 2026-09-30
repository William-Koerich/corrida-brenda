"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/time";

/** Tempo decorrido desde `startMs`, usando o relógio sincronizado `now`. */
export function Stopwatch({
  startMs,
  now,
  className,
}: {
  startMs: number;
  now: () => number;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(() => now() - startMs);

  useEffect(() => {
    const id = setInterval(() => setElapsed(now() - startMs), 200);
    return () => clearInterval(id);
  }, [startMs, now]);

  return <span className={`font-mono tabular-nums ${className ?? ""}`}>{formatDuration(Math.max(0, elapsed))}</span>;
}
