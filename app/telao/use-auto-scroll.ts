"use client";

import { useEffect, type RefObject } from "react";

const PAUSE_MS = 5000;
const SPEED_PX_PER_S = 60;

/**
 * Rolagem automática para telão: pausa no topo, desce devagar,
 * pausa no fim e volta ao topo. Não rola se o conteúdo couber na tela.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, resetKey: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;

    let phase: "top" | "down" | "bottom" = "top";
    let phaseStart = performance.now();
    let last = phaseStart;
    let pos = 0;
    let frame = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0) {
        phase = "top";
        phaseStart = now;
      } else if (phase === "top" && now - phaseStart > PAUSE_MS) {
        phase = "down";
        pos = el.scrollTop;
      } else if (phase === "down") {
        pos = Math.min(max, pos + (SPEED_PX_PER_S * dt) / 1000);
        el.scrollTop = pos;
        if (pos >= max) {
          phase = "bottom";
          phaseStart = now;
        }
      } else if (phase === "bottom" && now - phaseStart > PAUSE_MS) {
        el.scrollTop = 0;
        phase = "top";
        phaseStart = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ref, resetKey]);
}
