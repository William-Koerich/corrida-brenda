"use client";

import { ArrowLeft, Check, Download, Link2, Share2, Timer, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { RaceGate } from "@/components/app-shell";
import { LiveIndicator } from "@/components/live-indicator";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { BRAND } from "@/lib/brand";
import { SEX_LABEL } from "@/lib/categories";
import type { RunnerEntry } from "@/lib/runners";
import { downloadBlob, renderResultCard, shareOrDownload, type CardData, type CardFormat } from "@/lib/share-card";
import { formatDuration, formatPace } from "@/lib/time";
import type { Race } from "@/lib/types";
import { useRunners } from "../use-runners";

export default function RunnerResultPage() {
  const { numero } = useParams<{ numero: string }>();
  return <RaceGate>{(race) => <RunnerResult race={race} bib={Number(numero)} />}</RaceGate>;
}

function RunnerResult({ race, bib }: { race: Race; bib: number }) {
  const { entries, totalFinishers, loaded, status } = useRunners(race);
  const entry = entries.find((e) => e.athlete.bib_number === bib);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/meu-resultado" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Todos os resultados
      </Link>

      {!entry ? (
        <Card>
          <EmptyState
            icon={<Timer size={22} />}
            title={loaded ? `Nenhum corredor com o número ${bib}` : "Carregando…"}
            description={loaded ? "Confira o número do peito ou busque pelo nome." : undefined}
          />
        </Card>
      ) : !entry.row ? (
        <Card className="p-6 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">nº {bib}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{entry.athlete.name}</h1>
          <p className="mt-3 text-ink-soft">
            {race.status === "not_started"
              ? "A corrida ainda não começou. Boa prova!"
              : "Ainda não registramos a sua chegada. O resultado aparece aqui assim que você cruzar a linha."}
          </p>
          <LiveIndicator status={status} className="mt-4" />
        </Card>
      ) : (
        <ResultView race={race} entry={entry} totalFinishers={totalFinishers} />
      )}
    </div>
  );
}

function ResultView({ race, entry, totalFinishers }: { race: Race; entry: RunnerEntry; totalFinishers: number }) {
  const row = entry.row!;
  const { athlete } = entry;
  const distance = Number(race.distance_km);
  const time = formatDuration(row.elapsedMs);
  const pace = formatPace(row.elapsedMs, distance);
  const sexLabel = SEX_LABEL[athlete.sex];

  const [format, setFormat] = useState<CardFormat>("story");
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const data: CardData = useMemo(
    () => ({
      brand: BRAND.name,
      raceName: race.name,
      distanceKm: distance,
      date: race.start_time ? new Date(race.start_time).toLocaleDateString("pt-BR") : null,
      name: athlete.name,
      bib: athlete.bib_number,
      time,
      pace,
      overall: row.overall,
      totalFinishers,
      sexLabel,
      sexPosition: entry.sexPosition!,
      sexFinishers: entry.sexFinishers,
      prize: entry.prize,
      url: publicUrl(athlete.bib_number),
    }),
    [race, distance, athlete, time, pace, row.overall, totalFinishers, sexLabel, entry],
  );

  // a imagem fica pronta antes do toque: o menu de compartilhar precisa abrir direto do clique.
  // Só refaz quando o conteúdo muda (a classificação em tempo real recria os objetos a todo momento).
  const dataKey = JSON.stringify(data);
  const lastUrl = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    renderResultCard(JSON.parse(dataKey) as CardData, format).then((blob) => {
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      // a imagem anterior só é descartada depois que a nova está pronta
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = url;
      setCard({ blob, url });
    });
    return () => {
      cancelled = true;
    };
  }, [dataKey, format]);
  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    [],
  );

  const fileName = `resultado-${athlete.bib_number}-${format}.png`;
  const shareText = `Completei a ${race.name} (${distance.toLocaleString("pt-BR")} km) em ${time}! 🏁`;

  async function share() {
    if (!card) return;
    const result = await shareOrDownload(card.blob, fileName, shareText);
    if (result === "downloaded") setNotice("Imagem salva. Abra o Instagram ou o Strava e escolha a foto.");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/meu-resultado/${athlete.bib_number}`);
    setNotice("Link copiado!");
  }

  return (
    <>
      {/* resultado */}
      <section className="relative overflow-hidden rounded-3xl bg-stage p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.25em] text-brand uppercase">
            {race.name} · nº {athlete.bib_number}
          </p>
          <h1 data-testid="runner-name" className="mt-2 text-3xl font-bold tracking-tight">
            {athlete.name}
          </h1>
          {entry.prize && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-sm font-bold text-ink">
              <Trophy size={14} /> Pódio · {entry.sexPosition}º {sexLabel.toLowerCase()}
            </p>
          )}
          <p className="mt-5 text-xs font-semibold tracking-[0.25em] text-white/50 uppercase">Tempo</p>
          <p data-testid="runner-time" className="tabular font-mono text-6xl font-semibold sm:text-7xl">
            {time}
          </p>
          <p className="tabular mt-1 font-mono text-lg text-white/60">{pace}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Position title="Geral" pos={row.overall} total={totalFinishers} />
            <Position title={sexLabel} pos={entry.sexPosition!} total={entry.sexFinishers} />
          </div>
        </div>
      </section>

      {/* compartilhar */}
      <Card className="p-5">
        <h2 className="font-semibold">Compartilhe sua conquista</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Gere a imagem e poste no Instagram, no Strava ou no WhatsApp.
        </p>
        <div className="mt-4">
          <Segmented<CardFormat>
            ariaLabel="Formato da imagem"
            value={format}
            onChange={(f) => {
              setCard(null);
              setFormat(f);
            }}
            options={[
              { value: "story", label: "Story (Instagram)" },
              { value: "square", label: "Quadrado (feed / Strava)" },
            ]}
          />
        </div>

        <div className="mt-4 flex justify-center rounded-2xl bg-canvas p-4">
          {card ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem gerada no aparelho (blob)
            <img
              src={card.url}
              alt={`Imagem do resultado de ${athlete.name}`}
              data-testid="card-preview"
              className={`rounded-xl shadow-md ${format === "story" ? "max-h-96" : "max-h-72"}`}
            />
          ) : (
            <p className="py-24 text-sm text-ink-soft">Gerando imagem…</p>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Button variant="accent" size="lg" icon={<Share2 size={18} />} onClick={share} disabled={!card} className="sm:col-span-3">
            Compartilhar
          </Button>
          <Button icon={<Download size={16} />} onClick={() => card && downloadBlob(card.blob, fileName)} disabled={!card} className="sm:col-span-2">
            Baixar imagem
          </Button>
          <Button icon={notice === "Link copiado!" ? <Check size={16} /> : <Link2 size={16} />} onClick={copyLink}>
            Copiar link
          </Button>
        </div>
        {notice && <p className="mt-3 text-center text-sm font-medium text-ink-soft">{notice}</p>}
        <p className="mt-3 text-center text-xs text-ink-soft">
          No Strava: salve a imagem e adicione como foto na sua atividade.
        </p>
      </Card>
    </>
  );
}

/** Endereço impresso na imagem; omitido em endereços locais, que não funcionam para quem vê o post. */
function publicUrl(bib: number): string {
  if (typeof window === "undefined") return "";
  const host = window.location.host;
  const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(host);
  return local ? "" : `${host}/meu-resultado/${bib}`;
}

function Position({ title, pos, total }: { title: string; pos: number; total: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
      <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">{title}</p>
      <p className="mt-1 text-3xl font-bold">
        {pos}º <span className="text-base font-medium text-white/50">de {total}</span>
      </p>
    </div>
  );
}
