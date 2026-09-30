"use client";

import { RaceGate } from "@/components/app-shell";
import { AthletesManager } from "./athletes-manager";

export default function AtletasPage() {
  return <RaceGate>{(race) => <AthletesManager race={race} />}</RaceGate>;
}
