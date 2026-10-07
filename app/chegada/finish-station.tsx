"use client";

import { Camera, CheckCircle2, ChevronLeft, Keyboard, Lock, Maximize2, SwitchCamera, TriangleAlert, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { parseTimestamp } from "@/lib/clock";
import { getDeviceId } from "@/lib/device";
import { pendingFinishes, resolveBib } from "@/lib/finish-logic";
import { newFinish } from "@/lib/finishes";
import { useServerClock } from "@/lib/server-clock";
import { playTone, unlockAudio, type Tone } from "@/lib/sound";
import { elapsedMs, formatDuration, formatPace } from "@/lib/time";
import type { Athlete, Finish, Race } from "@/lib/types";
import { useAthletes, useFinishes, type SyncStatus } from "@/lib/use-race-data";
import { useStoredState } from "@/lib/use-stored-state";
import { useWakeLock } from "@/lib/use-wake-lock";
import { Stopwatch } from "../stopwatch";
import { SyncBar } from "../sync-indicator";
import { Keypad } from "./keypad";
import { QrScanner, type CameraFacing } from "./qr-scanner";
import { RecentList } from "./recent-list";

type Feedback =
  | { kind: "ok"; athlete: Athlete; time: string; pace: string }
  | { kind: "info"; title: string; detail?: string }
  | { kind: "error"; title: string; detail?: string };

const VIBRATE_OK = 200;
const VIBRATE_ERROR = [120, 80, 120, 80, 120];

type InputMode = "keypad" | "camera";
const INPUT_MODES = ["keypad", "camera"] as const;
const FACINGS = ["environment", "user"] as const;
const SOUND = ["on", "off"] as const;

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // iOS não suporta vibração pela web
  }
}

export function FinishStation({ race }: { race: Race }) {
  const [deviceId] = useState(getDeviceId);
  const clock = useServerClock();
  const athletes = useAthletes(race.id);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const showError = useCallback((title: string, detail?: string) => {
    vibrate(VIBRATE_ERROR);
    setFeedback({ kind: "error", title, detail });
  }, []);
  const { finishes, loadError, status: syncStatus, add, assign, remove } = useFinishes(race.id, showError);
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Finish | null>(null);
  // preferências guardadas neste aparelho
  const [mode, setMode] = useStoredState<InputMode>("corrida.chegada.modo", "keypad", INPUT_MODES);
  const [facing, setFacing] = useStoredState<CameraFacing>("corrida.chegada.camera", "environment", FACINGS);
  const [sound, setSound] = useStoredState<"on" | "off">("corrida.chegada.som", "on", SOUND);
  const [fullscreen, setFullscreen] = useState(false);
  const cameraActive = mode === "camera";
  useWakeLock(fullscreen && cameraActive);

  // navegadores só liberam áudio depois de um toque: destrava no primeiro toque na tela
  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio, { capture: true });
    return () => document.removeEventListener("pointerdown", unlockAudio, { capture: true });
  }, []);
  const beep = (tone: Tone) => {
    if (sound === "on") playTone(tone);
  };

  function openFullscreen() {
    setFullscreen(true);
    // esconde a barra do navegador onde dá (Android/computador); no iPhone a tela cheia é só no app
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, closeFullscreen]);

  const athletesById = useMemo(
    () => new Map([...athletes.byBib.values()].map((a) => [a.id, a])),
    [athletes.byBib],
  );
  const pending = useMemo(() => pendingFinishes(finishes, deviceId), [finishes, deviceId]);
  const selected = finishes.find((f) => f.client_id === selectedId);
  // quem recebe o próximo número: a chegada escolhida na lista ou a pendente mais antiga
  const target = selected ?? pending[0];

  // confirmação some sozinha; erros ficam até a próxima ação
  useEffect(() => {
    if (feedback?.kind !== "ok" && feedback?.kind !== "info") return;
    const id = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(id);
  }, [feedback]);

  const started = race.status !== "not_started" && race.start_time !== null;
  const finished = race.status === "finished";
  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;
  // encerrada: só dá para identificar/corrigir chegadas que já existem
  const canEnterNumber = started && (!finished || target !== undefined);

  function describe(finishTime: string) {
    if (!race.start_time) return { time: "--:--:--", pace: "" };
    const ms = elapsedMs(race.start_time, finishTime);
    return { time: formatDuration(ms), pace: formatPace(ms, Number(race.distance_km)) };
  }

  function handleChegou() {
    if (finished) return;
    const f = newFinish(race.id, clock.now(), null, deviceId);
    add(f);
    vibrate(60);
    setFeedback({
      kind: "info",
      title: `Chegada registrada · ${describe(f.finish_time).time}`,
      detail: mode === "camera" ? "Aponte a câmera para o peito" : "Digite o número do peito",
    });
  }

  function handleSubmit() {
    const bib = Number(input);
    if (!bib) return;
    setInput("");
    submitBib(bib, "keypad");
  }

  /** Número vindo do teclado ou da câmera. */
  async function submitBib(bib: number, source: InputMode) {
    // som só nas leituras da câmera (quem digita já está olhando a tela)
    const tone = (t: Tone) => {
      if (source === "camera") beep(t);
    };
    let result = resolveBib(bib, athletes.byBib, finishes, target);
    if (result.kind === "not_found") {
      // pode ter sido cadastrado depois que a tela abriu
      result = resolveBib(bib, await athletes.reload(), finishes, target);
    }

    switch (result.kind) {
      case "not_found":
        tone("error");
        showError(`Número ${bib} não cadastrado`, "Confira o número no peito do atleta.");
        return;
      case "duplicate": {
        const { time } = describe(result.existing.finish_time);
        if (source === "camera" && result.existing.device_id === deviceId) {
          // mesmo peito ainda na frente da câmera: só lembra, sem alarme
          tone("info");
          setFeedback({ kind: "info", title: `Nº ${bib} já registrado`, detail: `${result.athlete.name} · ${time}` });
          return;
        }
        tone("error");
        showError(`Nº ${bib} já chegou`, `${result.athlete.name} · ${time}. A chegada não foi duplicada.`);
        return;
      }
      case "assign":
        assign(result.target.client_id, result.athlete);
        setSelectedId(null);
        vibrate(VIBRATE_OK);
        tone("ok");
        setFeedback({ kind: "ok", athlete: result.athlete, ...describe(result.target.finish_time) });
        return;
      case "create": {
        if (finished) {
          tone("error");
          showError("Corrida encerrada", "Novas chegadas não são aceitas. Só dá para identificar as já registradas.");
          return;
        }
        const f = newFinish(race.id, clock.now(), result.athlete.id, deviceId);
        add(f);
        vibrate(VIBRATE_OK);
        tone("ok");
        setFeedback({ kind: "ok", athlete: result.athlete, ...describe(f.finish_time) });
        return;
      }
    }
  }

  function invalidQr(text: string) {
    beep("error");
    showError("QR Code não reconhecido", `Conteúdo: "${text.slice(0, 40)}". Esperado só o número.`);
  }

  const deletingAthlete = deleting?.athlete_id ? athletesById.get(deleting.athlete_id) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* topo: voltar + conexão + cronômetro */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Voltar ao início"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink ring-1 ring-black/5"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <SyncBar status={syncStatus}>
            {started && startMs !== null && race.status === "running" ? (
              <Stopwatch startMs={startMs} now={clock.now} className="shrink-0 text-xl font-semibold" />
            ) : (
              <span className="shrink-0 text-sm font-semibold">{finished ? "Encerrada" : "Aguardando largada"}</span>
            )}
          </SyncBar>
        </div>
      </div>

      {clock.state.status === "error" && (
        <Alert tone="warning" icon={<TriangleAlert size={16} />}>
          Relógio não sincronizado ({clock.state.message}). Usando o relógio do celular.{" "}
          <button onClick={clock.sync} className="font-semibold underline">
            Tentar de novo
          </button>
        </Alert>
      )}
      {(loadError || athletes.error) && <Alert tone="danger">{loadError ?? athletes.error}</Alert>}

      {!started ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-black/5">
          <p className="text-xl font-semibold">A corrida ainda não largou</p>
          <p className="text-sm text-ink-soft">
            Dê a largada na tela{" "}
            <Link href="/largada" className="font-semibold text-ink underline">
              Largada
            </Link>
            .
          </p>
        </div>
      ) : finished ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-ink px-6 py-8 text-center text-white">
          <Lock size={24} className="text-brand" />
          <p className="text-xl font-semibold">Corrida encerrada</p>
          <p className="text-sm text-white/70">Novas chegadas estão bloqueadas. Ainda dá para identificar e corrigir as já registradas.</p>
        </div>
      ) : (
        <button
          aria-label="CHEGOU"
          onPointerDown={(e) => {
            // pointerdown registra o horário no toque, sem esperar o dedo levantar
            if (e.button === 0) handleChegou();
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              handleChegou();
            }
          }}
          className="flex h-[18vh] min-h-28 flex-col items-center justify-center rounded-3xl bg-brand text-ink shadow-[0_8px_24px_-8px_rgba(240,39,127,0.55)] transition select-none touch-manipulation active:scale-[0.98] active:bg-brand-strong"
        >
          <span className="text-6xl font-black tracking-tight">CHEGOU</span>
          <span className="text-sm font-medium text-ink/60">toque quando o atleta cruzar a linha</span>
        </button>
      )}

      {/* confirmação: altura fixa para o teclado não mudar de lugar */}
      {started && (
        <div className="h-20">
          {feedback ? (
            <FeedbackBox feedback={feedback} onClose={() => setFeedback(null)} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-black/10 text-sm text-ink-soft">
              {finished
                ? "Escolha uma chegada abaixo para identificar"
                : mode === "camera"
                  ? "Toque CHEGOU ou aponte a câmera"
                  : "Toque CHEGOU ou digite o número"}
            </div>
          )}
        </div>
      )}

      {/* alvo do próximo número */}
      {started && (selected || pending.length > 0 || !finished) && (
        <div
          className={`rounded-2xl px-4 py-2.5 text-center text-sm font-semibold ${
            selected ? "bg-sky-600 text-white" : pending.length ? "bg-amber-400 text-ink" : "bg-white text-ink-soft ring-1 ring-black/5"
          }`}
        >
          {selected ? (
            <>
              {selected.athlete_id ? "Corrigindo" : "Identificando"} chegada de {describe(selected.finish_time).time}
              <button onClick={() => setSelectedId(null)} className="ml-3 underline">
                Cancelar
              </button>
            </>
          ) : pending.length ? (
            <>
              {pending.length} {pending.length === 1 ? "chegada aguardando" : "chegadas aguardando"} número · próxima:{" "}
              {describe(pending[0].finish_time).time}
            </>
          ) : (
            "Sem chegadas aguardando número"
          )}
        </div>
      )}

      {canEnterNumber && (
        <>
          <Segmented<InputMode>
            ariaLabel="Forma de identificar"
            value={mode}
            onChange={setMode}
            options={[
              { value: "keypad", label: <><Keyboard size={16} /> Teclado</> },
              { value: "camera", label: <><Camera size={16} /> Câmera (QR)</> },
            ]}
          />
          {mode === "keypad" ? (
            <Keypad value={input} onChange={setInput} onSubmit={handleSubmit} />
          ) : (
            <>
              {!fullscreen && <QrScanner facing={facing} onScan={(bib) => submitBib(bib, "camera")} onInvalid={invalidQr} />}
              <CameraControls
                facing={facing}
                sound={sound}
                onFacing={setFacing}
                onSound={setSound}
                onFullscreen={openFullscreen}
              />
            </>
          )}
        </>
      )}

      <section className="mt-3 flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold tracking-wide text-ink-soft uppercase">Últimas chegadas</h2>
        <RecentList
          finishes={finishes}
          athletesById={athletesById}
          startTime={race.start_time}
          deviceId={deviceId}
          selectedId={selectedId}
          onSelect={(f) => {
            setSelectedId(f.client_id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onDelete={setDeleting}
        />
      </section>

      {fullscreen && cameraActive && canEnterNumber && (
        <FullscreenCamera
          raceName={race.name}
          clock={startMs !== null && race.status === "running" ? <Stopwatch startMs={startMs} now={clock.now} className="text-2xl font-semibold" /> : null}
          syncStatus={syncStatus}
          pendingCount={pending.length}
          feedback={feedback}
          facing={facing}
          sound={sound}
          onFacing={setFacing}
          onSound={setSound}
          onClose={closeFullscreen}
          onScan={(bib) => submitBib(bib, "camera")}
          onInvalid={invalidQr}
          onDismissFeedback={() => setFeedback(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          remove(deleting.client_id);
          if (selectedId === deleting.client_id) setSelectedId(null);
        }}
        tone="danger"
        title="Excluir esta chegada?"
        description={
          deleting &&
          `${deletingAthlete ? `Nº ${deletingAthlete.bib_number} — ${deletingAthlete.name}` : "Chegada sem número"} · ${describe(deleting.finish_time).time}`
        }
        confirmLabel="Excluir chegada"
      />
    </div>
  );
}

function FeedbackBox({ feedback, onClose }: { feedback: Feedback; onClose: () => void }) {
  const base = "flex h-full w-full items-center gap-3 overflow-hidden rounded-2xl px-4 text-left text-white";
  if (feedback.kind === "ok") {
    return (
      <button data-testid="feedback" onClick={onClose} className={`${base} bg-emerald-600`}>
        <span className="tabular flex h-12 min-w-14 items-center justify-center rounded-xl bg-white px-2 font-mono text-2xl font-bold text-emerald-700">
          {feedback.athlete.bib_number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xl font-semibold">{feedback.athlete.name}</span>
          <span className="block text-base text-white/85">
            <span className="tabular font-mono font-semibold text-white">{feedback.time}</span> · {feedback.pace}
          </span>
        </span>
        <CheckCircle2 size={24} className="shrink-0" />
      </button>
    );
  }
  return (
    <button
      data-testid="feedback"
      onClick={onClose}
      className={`${base} ${feedback.kind === "error" ? "bg-red-600" : "bg-ink"}`}
    >
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-semibold">{feedback.title}</span>
        {feedback.detail && <span className="block text-sm leading-tight text-white/85">{feedback.detail}</span>}
      </span>
    </button>
  );
}

function CameraControls({
  facing,
  sound,
  onFacing,
  onSound,
  onFullscreen,
  dark = false,
}: {
  facing: CameraFacing;
  sound: "on" | "off";
  onFacing: (f: CameraFacing) => void;
  onSound: (s: "on" | "off") => void;
  onFullscreen?: () => void;
  dark?: boolean;
}) {
  const btn = dark
    ? "flex h-11 items-center justify-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-semibold text-white backdrop-blur active:scale-95"
    : "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-line active:scale-95";
  return (
    <div className={`flex gap-2 ${dark ? "" : "w-full"}`}>
      <button
        type="button"
        className={btn}
        onClick={() => onFacing(facing === "environment" ? "user" : "environment")}
        aria-label={facing === "environment" ? "Usar câmera frontal" : "Usar câmera traseira"}
      >
        <SwitchCamera size={18} />
        {facing === "environment" ? "Frontal" : "Traseira"}
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => onSound(sound === "on" ? "off" : "on")}
        aria-label={sound === "on" ? "Desligar som" : "Ligar som"}
        aria-pressed={sound === "on"}
      >
        {sound === "on" ? <Volume2 size={18} /> : <VolumeX size={18} />}
        {dark ? null : sound === "on" ? "Som ligado" : "Som desligado"}
      </button>
      {onFullscreen && (
        <button type="button" className={btn} onClick={onFullscreen} aria-label="Tela cheia">
          <Maximize2 size={18} />
          Tela cheia
        </button>
      )}
    </div>
  );
}

/**
 * Câmera em tela cheia: celular/tablet fixo na chegada, virado para os corredores
 * (normalmente com a câmera frontal). Confirmação grande, legível a alguns metros.
 */
function FullscreenCamera({
  raceName,
  clock,
  syncStatus,
  pendingCount,
  feedback,
  facing,
  sound,
  onFacing,
  onSound,
  onClose,
  onScan,
  onInvalid,
  onDismissFeedback,
}: {
  raceName: string;
  clock: React.ReactNode;
  syncStatus: SyncStatus;
  pendingCount: number;
  feedback: Feedback | null;
  facing: CameraFacing;
  sound: "on" | "off";
  onFacing: (f: CameraFacing) => void;
  onSound: (s: "on" | "off") => void;
  onClose: () => void;
  onScan: (bib: number) => void;
  onInvalid: (text: string) => void;
  onDismissFeedback: () => void;
}) {
  return (
    <div data-testid="camera-fullscreen" className="fixed inset-0 z-50 bg-black text-white">
      <div className="absolute inset-0">
        <QrScanner fill facing={facing} onScan={onScan} onInvalid={onInvalid} />
      </div>

      {/* topo: corrida, cronômetro, conexão e controles */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-linear-to-b from-black/70 to-transparent p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white/80">{raceName}</p>
          {clock}
          {(!syncStatus.online || syncStatus.pending > 0) && (
            <p className="text-xs font-semibold text-amber-300">
              {syncStatus.online ? "Enviando" : "Offline"} · {syncStatus.pending} pendente{syncStatus.pending === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <CameraControls dark facing={facing} sound={sound} onFacing={onFacing} onSound={onSound} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Sair da tela cheia"
            className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur active:scale-95"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* guia de enquadramento (a leitura usa a imagem inteira) */}
      <div className="pointer-events-none absolute inset-x-[10%] top-[22%] bottom-[30%] rounded-3xl border-4 border-dashed border-white/40" />

      {/* confirmação grande */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {feedback ? (
          <BigFeedback feedback={feedback} onClose={onDismissFeedback} />
        ) : (
          <p className="rounded-3xl bg-white/10 px-5 py-6 text-center text-xl font-semibold backdrop-blur">
            Mostre o QR Code do número de peito
            {pendingCount > 0 && (
              <span className="mt-1 block text-sm font-medium text-amber-300">
                {pendingCount} chegada{pendingCount === 1 ? "" : "s"} aguardando número
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function BigFeedback({ feedback, onClose }: { feedback: Feedback; onClose: () => void }) {
  if (feedback.kind === "ok") {
    return (
      <button
        data-testid="feedback-big"
        onClick={onClose}
        className="flex w-full items-center gap-4 rounded-3xl bg-emerald-600 p-5 text-left shadow-2xl"
      >
        <span className="tabular flex h-24 min-w-24 items-center justify-center rounded-2xl bg-white px-3 font-mono text-5xl font-black text-emerald-700">
          {feedback.athlete.bib_number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-3xl font-bold">{feedback.athlete.name}</span>
          <span className="tabular block font-mono text-3xl font-semibold">{feedback.time}</span>
          <span className="block text-lg text-white/85">{feedback.pace}</span>
        </span>
        <CheckCircle2 size={40} className="shrink-0" />
      </button>
    );
  }
  return (
    <button
      data-testid="feedback-big"
      onClick={onClose}
      className={`w-full rounded-3xl p-5 text-left shadow-2xl ${feedback.kind === "error" ? "bg-red-600" : "bg-white/15 backdrop-blur"}`}
    >
      <span className="block text-3xl font-bold">{feedback.title}</span>
      {feedback.detail && <span className="mt-1 block text-lg text-white/90">{feedback.detail}</span>}
    </button>
  );
}
