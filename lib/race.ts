"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError, isNetworkError } from "./errors";
import { cacheGet, cacheSet } from "./local-db";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Race } from "./types";
import { useLiveRefresh } from "./use-live-refresh";

const RACE_LIVE_MS = 10_000;

type RaceState =
  | { status: "loading" }
  | { status: "ready"; race: Race }
  | { status: "empty" }
  | { status: "error"; message: string };

/** Corrida atual = a mais recente cadastrada. */
export function useCurrentRace() {
  const [state, setState] = useState<RaceState>(
    isSupabaseConfigured
      ? { status: "loading" }
      : { status: "error", message: "Supabase não configurado (veja o README)." },
  );

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await getSupabase()
      .from("races")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Race>();
    if (error) {
      // falha passageira com a corrida já na tela: mantém o que está (o telão não pode apagar)
      // sem internet na abertura: usa a última corrida vista neste aparelho
      const cached = isNetworkError(error) ? await cacheGet<Race>("race") : undefined;
      setState((prev) =>
        prev.status === "ready"
          ? prev
          : cached
            ? { status: "ready", race: cached }
            : { status: "error", message: friendlyError(error) },
      );
      return;
    }
    if (data) await cacheSet("race", data);
    // só troca o estado se algo mudou (evita redesenhar as telas a cada conferência)
    setState((prev) => {
      if (!data) return prev.status === "empty" ? prev : { status: "empty" };
      if (prev.status === "ready" && JSON.stringify(prev.race) === JSON.stringify(data)) return prev;
      return { status: "ready", race: data };
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial assíncrona
    reload();
    if (!isSupabaseConfigured) return;

    // largada/encerramento feitos em outro aparelho chegam por Realtime
    const supabase = getSupabase();
    const channel = supabase
      .channel(`races-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "races" }, () => {
        reload();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  // conferência periódica: largada/encerramento chegam mesmo se o tempo real caiu
  useLiveRefresh(reload, RACE_LIVE_MS);

  return { ...state, reload };
}
