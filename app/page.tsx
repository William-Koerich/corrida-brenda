"use client";

import { ArrowRight, Flag, Monitor, Timer, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { RaceGate } from "@/components/app-shell";
import { RaceStatusBadge } from "@/components/ui/badge";
import { Card, Stat } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";
import { parseTimestamp } from "@/lib/clock";
import { useServerClock } from "@/lib/server-clock";
import { elapsedMs, formatDuration } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { Stopwatch } from "./stopwatch";

const STEPS = [
  { href: "/atletas", icon: Users, title: "Atletas", text: "Cadastre, importe CSV e gere os números de peito." },
  { href: "/largada", icon: Flag, title: "Largada", text: "Dê a largada com o horário oficial do servidor." },
  { href: "/chegada", icon: Timer, title: "Chegada", text: "Registre as chegadas no celular, até sem internet." },
  { href: "/resultados", icon: Trophy, title: "Resultados", text: "Classificação ao vivo, pódios e exportação." },
  { href: "/telao", icon: Monitor, title: "Telão", text: "Classificação em tela cheia para TV ou projetor." },
];

export default function Home() {
  return <RaceGate>{(race) => <Dashboard race={race} />}</RaceGate>;
}

function Dashboard({ race }: { race: Race }) {
  const athletes = useAthletes(race.id);
  const { finishes } = useFinishes(race.id, () => {});
  const clock = useServerClock();
  const identified = finishes.filter((f) => f.athlete_id).length;
  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;

  return (
    <div className="flex flex-col gap-8">
      {/* corrida atual */}
      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{BRAND.tagline}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{race.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <RaceStatusBadge status={race.status} />
              <span>{Number(race.distance_km).toLocaleString("pt-BR")} km</span>
              {startMs && <span>· largada às {new Date(startMs).toLocaleTimeString("pt-BR")}</span>}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium tracking-widest text-white/50 uppercase">Tempo de prova</p>
            {race.status === "running" && startMs ? (
              <Stopwatch startMs={startMs} now={clock.now} className="text-5xl font-semibold text-brand sm:text-6xl" />
            ) : (
              <p className="tabular font-mono text-5xl font-semibold text-white/40 sm:text-6xl">
                {race.status === "finished" && race.start_time && race.finished_at
                  ? formatDuration(elapsedMs(race.start_time, race.finished_at))
                  : "00:00:00"}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Atletas" value={athletes.byBib.size} />
        <Stat label="Chegaram" value={identified} hint={athletes.byBib.size ? `de ${athletes.byBib.size}` : undefined} />
        <Stat label="Sem número" value={finishes.length - identified} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-soft uppercase">Etapas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} className="group">
              <Card className="flex h-full items-start gap-4 p-5 transition group-hover:shadow-md group-hover:ring-black/10">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-ink ring-1 ring-brand-strong/30">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between font-semibold">
                    {title}
                    <ArrowRight size={16} className="text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{text}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
