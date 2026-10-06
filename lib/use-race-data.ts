"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { maxUpdatedAt, mergeByKey, needsFullReload, sinceWithOverlap } from "./delta-sync";
import { friendlyError, isNetworkError } from "./errors";
import { fetchFinishes, pushOp } from "./finishes";
import { cacheGet, cacheSet, outboxAdd, outboxAll, outboxDelete } from "./local-db";
import { applyOp, applyOutbox, pendingCount, type OutboxOp } from "./outbox";
import { getSupabase } from "./supabase";
import { countRows, fetchChangedRows } from "./table-sync";
import type { Athlete, Finish } from "./types";
import { useLiveRefresh } from "./use-live-refresh";

const RETRY_MS = 10_000;
/** De quanto em quanto tempo as telas conferem o servidor (além do tempo real). */
export const DEFAULT_LIVE_MS = 5_000;
const ATHLETES_LIVE_MS = 15_000;

// um único envio por vez nesta aba, mesmo com mais de um hook montado
let flushing = false;

export interface SyncStatus {
  online: boolean;
  /** chegadas com alterações ainda não enviadas */
  pending: number;
  syncing: boolean;
  /** quando a tela conferiu o servidor com sucesso pela última vez (Date.now()) */
  lastSync: number | null;
}

/**
 * Executa `run` sem sobrepor chamadas: se pedirem de novo enquanto roda,
 * roda mais uma vez no final (vários avisos seguidos viram uma consulta só).
 */
function useSerialized(run: () => Promise<void>) {
  const busy = useRef(false);
  const again = useRef(false);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  return useCallback(async () => {
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      do {
        again.current = false;
        await runRef.current();
      } while (again.current);
    } finally {
      busy.current = false;
    }
  }, []);
}

/**
 * Chegadas da corrida, offline-first: toda ação vai primeiro para a fila
 * no IndexedDB e aparece na hora; a fila é enviada em ordem quando há
 * conexão. A tela mostra o último estado do servidor + a fila por cima.
 *
 * O servidor é conferido pelo tempo real e também a cada `liveMs`
 * (a conexão em tempo real cai e perde avisos), buscando só o que mudou.
 */
export function useFinishes(raceId: string, onError: (message: string) => void, { liveMs = DEFAULT_LIVE_MS } = {}) {
  const [server, setServer] = useState<Finish[]>([]);
  const serverRef = useRef<Finish[]>([]);
  const [outbox, setOutbox] = useState<OutboxOp[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cacheKey = `finishes:${raceId}`;
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const commit = useCallback((next: Finish[]) => {
    serverRef.current = next;
    setServer(next);
  }, []);

  /** Busca só as chegadas novas/alteradas; recarrega tudo se algo foi excluído. */
  const reload = useSerialized(async () => {
    try {
      const since = sinceWithOverlap(maxUpdatedAt(serverRef.current));
      const [changed, total] = await Promise.all([
        fetchChangedRows<Finish>("finishes", raceId, since),
        countRows("finishes", raceId),
      ]);
      let next = since === null ? changed : mergeByKey(serverRef.current, changed, (f) => f.client_id);
      if (needsFullReload(next.length, total)) next = await fetchFinishes(raceId);
      if (next !== serverRef.current) {
        commit(next);
        await cacheSet(cacheKey, next);
      }
      setOnline(true);
      setLoadError(null);
      setLastSync(Date.now());
    } catch (e) {
      if (isNetworkError(e)) setOnline(false);
      else setLoadError(friendlyError(e));
    }
  });

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
        if (applied) commit(applyOp(serverRef.current, applied));
        setOutbox((prev) => prev.filter((o) => o.seq !== op.seq));
        setOnline(true);
      }
    } finally {
      flushing = false;
      setSyncing(false);
    }
  }, [commit]);

  useEffect(() => {
    let active = true;
    (async () => {
      // primeiro o que está no aparelho (funciona sem internet)
      const [cached, ops] = await Promise.all([cacheGet<Finish[]>(cacheKey), outboxAll()]);
      if (!active) return;
      if (cached) commit(cached);
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
  }, [cacheKey, commit, flush, reload]);

  // conferência periódica: cobre avisos perdidos pelo tempo real
  useLiveRefresh(reload, liveMs);

  // Wi-Fi sem internet não dispara "online": tenta enviar a fila periodicamente
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
  const status: SyncStatus = { online, pending: pendingCount(outbox), syncing, lastSync };

  return { finishes, loadError, status, reload, add, assign, remove };
}

/** Atletas da corrida, com cópia no aparelho para reconhecer números sem internet. */
export function useAthletes(raceId: string, { liveMs = ATHLETES_LIVE_MS } = {}) {
  const [byBib, setByBib] = useState<Map<number, Athlete>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const list = useRef<Athlete[]>([]);
  const current = useRef(byBib);
  const cacheKey = `athletes:${raceId}`;

  const apply = useCallback((next: Athlete[]) => {
    list.current = next;
    const map = new Map(next.map((a) => [a.bib_number, a]));
    current.current = map;
    setByBib(map);
    return map;
  }, []);

  const sync = useSerialized(async () => {
    // sem internet nem tenta: segue com a cópia local
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try {
      const since = sinceWithOverlap(maxUpdatedAt(list.current));
      const [changed, total] = await Promise.all([
        fetchChangedRows<Athlete>("athletes", raceId, since),
        countRows("athletes", raceId),
      ]);
      let next = since === null ? changed : mergeByKey(list.current, changed, (a) => a.id);
      if (needsFullReload(next.length, total)) next = await fetchChangedRows<Athlete>("athletes", raceId, null);
      setError(null);
      if (next !== list.current) {
        apply(next);
        await cacheSet(cacheKey, next);
      }
    } catch (e) {
      if (!isNetworkError(e)) setError(friendlyError(e));
    }
  });

  /** Recarrega e devolve o mapa novo (para checar número recém-cadastrado). */
  const reload = useCallback(async (): Promise<Map<number, Athlete>> => {
    await sync();
    return current.current;
  }, [sync]);

  useEffect(() => {
    let active = true;
    cacheGet<Athlete[]>(cacheKey).then((cached) => {
      if (active && cached && list.current.length === 0) apply(cached);
    });
    sync();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`athletes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "athletes" }, () => {
        sync();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [cacheKey, sync, apply]);

  useLiveRefresh(sync, liveMs);

  return { byBib, error, reload };
}
