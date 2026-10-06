"use client";

import { useEffect, useRef } from "react";

/**
 * Chama `refresh` a cada `intervalMs` enquanto a tela estiver visível, e na hora
 * em que ela volta a ficar visível, ganha foco ou a internet volta.
 * Garante a atualização mesmo quando a conexão em tempo real caiu e perdeu avisos
 * (TV que apagou, celular bloqueado, Wi-Fi oscilando).
 */
export function useLiveRefresh(refresh: () => unknown, intervalMs: number) {
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });

  useEffect(() => {
    const visible = () => typeof document === "undefined" || document.visibilityState === "visible";
    const tick = () => {
      if (visible()) ref.current();
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
    };
  }, [intervalMs]);
}
