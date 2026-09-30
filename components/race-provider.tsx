"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCurrentRace } from "@/lib/race";

type RaceContextValue = ReturnType<typeof useCurrentRace>;

const RaceContext = createContext<RaceContextValue | null>(null);

/** Corrida atual compartilhada por todas as telas (uma assinatura Realtime só). */
export function RaceProvider({ children }: { children: ReactNode }) {
  const value = useCurrentRace();
  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}

export function useRace(): RaceContextValue {
  const value = useContext(RaceContext);
  if (!value) throw new Error("useRace fora do RaceProvider");
  return value;
}
