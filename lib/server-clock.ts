"use client";

import { useCallback, useEffect, useState } from "react";
import { measureOffset, parseTimestamp, type ClockOffset } from "./clock";
import { friendlyError } from "./errors";
import { getSupabase } from "./supabase";

export type ServerClockState =
  | { status: "syncing" }
  /** `measuredAt` preenchido = medição antiga reaproveitada (sem internet) */
  | { status: "synced"; offset: ClockOffset; measuredAt?: number }
  | { status: "error"; message: string };

const STORAGE_KEY = "corrida.clock_offset";

function saveOffset(offset: ClockOffset) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...offset, measuredAt: Date.now() }));
  } catch {
    // sem storage
  }
}

function loadOffset(): (ClockOffset & { measuredAt: number }) | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchServerTime(): Promise<number> {
  const { data, error } = await getSupabase().rpc("server_now");
  if (error) throw error;
  return parseTimestamp(data as string);
}

/**
 * Mede o offset entre o relógio do dispositivo e o do servidor ao montar.
 * `now()` devolve o horário oficial (servidor) em ms; sem sincronização,
 * usa o relógio do dispositivo.
 */
export function useServerClock() {
  const [state, setState] = useState<ServerClockState>({ status: "syncing" });

  const sync = useCallback(async () => {
    setState({ status: "syncing" });
    try {
      const offset = await measureOffset(fetchServerTime);
      saveOffset(offset);
      setState({ status: "synced", offset });
    } catch (e) {
      // sem internet: a última medição continua valendo (relógios derivam pouco)
      const saved = loadOffset();
      if (saved) {
        const { measuredAt, ...offset } = saved;
        setState({ status: "synced", offset, measuredAt });
      } else {
        setState({ status: "error", message: friendlyError(e) });
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização inicial
    sync();
  }, [sync]);

  // voltou a internet sem medição recente: mede de novo
  const needsResync = state.status === "error" || (state.status === "synced" && state.measuredAt !== undefined);
  useEffect(() => {
    if (!needsResync) return;
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [needsResync, sync]);

  // durante uma nova medição, continua usando a última diferença conhecida
  const [offsetMs, setOffsetMs] = useState(() => loadOffset()?.offsetMs ?? 0);
  const measured = state.status === "synced" ? state.offset.offsetMs : null;
  if (measured !== null && measured !== offsetMs) setOffsetMs(measured);
  const now = useCallback(() => Date.now() + offsetMs, [offsetMs]);

  return { state, now, sync };
}
