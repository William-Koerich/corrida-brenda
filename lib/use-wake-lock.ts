"use client";

import { useEffect } from "react";

type WakeLockSentinel = { release(): Promise<void> };
type WakeLockApi = { request(type: "screen"): Promise<WakeLockSentinel> };

/**
 * Mantém a tela acesa enquanto `active` (celular/tablet fixo na chegada).
 * O sistema solta o bloqueio quando a aba some; ele é pedido de novo ao voltar.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!api) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const s = await api.request("screen");
        if (cancelled) s.release().catch(() => {});
        else sentinel = s;
      } catch {
        // economia de bateria ou navegador sem permissão: a tela pode apagar
      }
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
