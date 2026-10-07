"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Preferência guardada neste aparelho (localStorage). Começa com `initial`
 * (igual no servidor e no navegador) e carrega o valor salvo depois de montar.
 */
export function useStoredState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key) as T | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva só existe no navegador
      if (saved && allowed.includes(saved)) setValue(saved);
    } catch {
      // sem storage: fica no padrão
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `allowed` é fixo

  const change = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        // sem storage: vale só nesta sessão
      }
    },
    [key],
  );

  return [value, change] as const;
}
