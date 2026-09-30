"use client";

import { RaceGate } from "@/components/app-shell";
import { ResultsBoard } from "./results-board";

export default function ResultadosPage() {
  return <RaceGate>{(race) => <ResultsBoard race={race} />}</RaceGate>;
}
