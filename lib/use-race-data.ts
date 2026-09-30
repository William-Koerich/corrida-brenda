"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { friendlyError, isNetworkError } from "./errors";
import { fetchFinishes, pushOp } from "./finishes";
import { cacheGet, cacheSet, outboxAdd, outboxAll, outboxDelete } from "./local-db";
import { applyOp, applyOutbox, pendingCount, type OutboxOp } from "./outbox";
import { getSupabase } from "./supabase";
import type { Athlete, Finish } from "./types";

const RETRY_MS = 10_000;

// um único envio por vez nesta aba, mesmo com mais de um hook montado
let flushing = false;

export interface SyncStatus {
  online: boolean;
  /** chegadas com alterações ainda não enviadas */
  pending: number;
  syncing: boolean;
}

/**
 * Chegadas da corrida, offline-first: toda ação vai primeiro para a fila
 * no IndexedDB e aparece na hora; a fila é enviada em ordem quando há
 * conexão. A tela mostra o último estado do servidor + a fila por cima.
 */
export function useFinishes(raceId: string, onError: (message: string) => void) {
  const [server, setServer] = useState<Finish[]>([]);
  const [outbox, setOutbox] = useState<OutboxOp[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cacheKey = `finishes:${raceId}`;
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const reload = useCallback(async () => {
    try {
      const data = await fetchFinishes(raceId);
      setServer(data);
      setOnline(true);
      setLoadError(null);
      await cacheSet(cacheKey, data);
    } catch (e) {
      if (isNetworkError(e)) setOnline(false);
      else setLoadError(friendlyError(e));
    }
  }, [raceId, cacheKey]);

  const flush = useCallback(async () => {
    if (flushing) return;
    flushing = true;
    setSyncing(true);
    try {
      for (;;) {
        const [op] = await outboxAll();
        if (!op) break;
        const result = await pushOp(op);
        if (result.kind === "network") {
          setOnline(false);
          return;
        }
        if (result.kind === "conflict") onErrorRef.current(result.message);
        await outboxDelete(op.seq!);
        const applied = result.applied;
        if (applied) setServer((prev) => applyOp(prev, applied));
        setOutbox((prev) => prev.filter((o) => o.seq !== op.seq));
        setOnline(true);
      }
    } finally {
      flushing = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // primeiro o que está no aparelho (funciona sem internet)
      const [cached, ops] = await Promise.all([cacheGet<Finish[]>(cacheKey), outboxAll()]);
      if (!active) return;
      if (cached) setServer(cached);
      setOutbox(ops);
      await flush();
      await reload();
    })();

    const supabase = getSupabase();
    const channel = supabase
      .channel(`finishes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "finishes" }, () => {
        reload();
      })
      .subscribe();

    const onOnline = async () => {
      await flush();
      await reload();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [cacheKey, flush, reload]);

  // Wi-Fi sem internet não dispara "online": tenta de novo periodicamente
  useEffect(() => {
    if (online && outbox.length === 0) return;
    const id = setInterval(async () => {
      await flush();
      await reload();
    }, RETRY_MS);
    return () => clearInterval(id);
  }, [online, outbox.length, flush, reload]);

  const enqueue = useCallback(
    async (op: OutboxOp) => {
      const saved = await outboxAdd(op);
      setOutbox((prev) => [...prev, saved]);
      flush();
    },
    [flush],
  );

  const add = useCallback((f: Finish) => enqueue({ type: "insert", finish: f }), [enqueue]);
  const assign = useCallback(
    (clientId: string, athlete: Athlete | null) =>
      enqueue({ type: "assign", client_id: clientId, athlete_id: athlete?.id ?? null }),
    [enqueue],
  );
  const remove = useCallback((clientId: string) => enqueue({ type: "delete", client_id: clientId }), [enqueue]);

  const finishes = useMemo(
    () => applyOutbox(server, outbox.filter((op) => op.type !== "insert" || op.finish.race_id === raceId)),
    [server, outbox, raceId],
  );
  const status: SyncStatus = { online, pending: pendingCount(outbox), syncing };

  return { finishes, loadError, status, reload, add, assign, remove };
}

/** Atletas da corrida, com cópia no aparelho para reconhecer números sem internet. */
export function useAthletes(raceId: string) {
  const [byBib, setByBib] = useState<Map<number, Athlete>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const current = useRef(byBib);
  const cacheKey = `athletes:${raceId}`;

  const apply = useCallback((list: Athlete[]) => {
    const map = new Map(list.map((a) => [a.bib_number, a]));
    current.current = map;
    setByBib(map);
    return map;
  }, []);

  /** Recarrega e devolve o mapa novo (para checar número recém-cadastrado). */
  const reload = useCallback(async (): Promise<Map<number, Athlete>> => {
    // sem internet nem tenta: responde na hora com a cópia local
    if (typeof navigator !== "undefined" && navigator.onLine === false) return current.current;
    const { data, error } = await getSupabase().from("athletes").select("*").eq("race_id", raceId);
    if (error) {
      // sem internet: segue com a cópia local
      if (!isNetworkError(error)) setError(friendlyError(error));
      return current.current;
    }
    setError(null);
    await cacheSet(cacheKey, data);
    return apply(data as Athlete[]);
  }, [raceId, cacheKey, apply]);

  useEffect(() => {
    let active = true;
    cacheGet<Athlete[]>(cacheKey).then((cached) => {
      if (active && cached && current.current.size === 0) apply(cached);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial assíncrona
    reload();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`athletes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "athletes" }, () => {
        reload();
      })
      .subscribe();
    window.addEventListener("online", reload);
    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.removeEventListener("online", reload);
    };
  }, [cacheKey, reload, apply]);

  return { byBib, error, reload };
}
