"use client";

import { RaceGate } from "@/components/app-shell";
import { FinishStation } from "./finish-station";

export default function ChegadaPage() {
  return <RaceGate>{(race) => <FinishStation race={race} />}</RaceGate>;
}
