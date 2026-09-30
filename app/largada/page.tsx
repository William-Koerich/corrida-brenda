"use client";

import { RaceGate } from "@/components/app-shell";
import { StartPanel } from "./start-panel";

export default function LargadaPage() {
  return <RaceGate>{(race) => <StartPanel race={race} />}</RaceGate>;
}
