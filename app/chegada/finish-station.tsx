"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseTimestamp } from "@/lib/clock";
import { getDeviceId } from "@/lib/device";
import { pendingFinishes, resolveBib } from "@/lib/finish-logic";
import { newFinish } from "@/lib/finishes";
import { useServerClock } from "@/lib/server-clock";
import { elapsedMs, formatDuration, formatPace } from "@/lib/time";
import type { Athlete, Finish, Race } from "@/lib/types";
import { Stopwatch } from "../stopwatch";
import { SyncBar } from "../sync-indicator";
import { useAthletes, useFinishes } from "@/lib/use-race-data";
import { Keypad } from "./keypad";
import { QrScanner } from "./qr-scanner";
import { RecentList } from "./recent-list";

type Feedback =
  | { kind: "ok"; athlete: Athlete; time: string; pace: string }
  | { kind: "info"; title: string; detail?: string }
  | { kind: "error"; title: string; detail?: string };

const VIBRATE_OK = 200;
const VIBRATE_ERROR = [120, 80, 120, 80, 120];

type InputMode = "keypad" | "camera";
const MODE_KEY = "corrida.chegada.modo";

/** Teclado ou câmera; lembra a escolha neste aparelho. */
function useInputMode() {
  const [mode, setMode] = useState<InputMode>("keypad");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preferência salva só existe no navegador
      if (localStorage.getItem(MODE_KEY) === "camera") setMode("camera");
    } catch {
      // sem storage: fica no teclado
    }
  }, []);

  const change = useCallback((next: InputMode) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // sem storage: vale só nesta sessão
    }
  }, []);

  return [mode, change] as const;
}

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
  const [mode, setMode] = useInputMode();

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
  const startMs = race.start_time ? parseTimestamp(race.start_time) : null;

  function describe(finishTime: string) {
    if (!race.start_time) return { time: "--:--:--", pace: "" };
    const ms = elapsedMs(race.start_time, finishTime);
    return { time: formatDuration(ms), pace: formatPace(ms, Number(race.distance_km)) };
  }

  function handleChegou() {
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
    let result = resolveBib(bib, athletes.byBib, finishes, target);
    if (result.kind === "not_found") {
      // pode ter sido cadastrado depois que a tela abriu
      result = resolveBib(bib, await athletes.reload(), finishes, target);
    }

    switch (result.kind) {
      case "not_found":
        showError(`Número ${bib} não cadastrado`, "Confira o número no peito do atleta.");
        return;
      case "duplicate": {
        const { time } = describe(result.existing.finish_time);
        if (source === "camera" && result.existing.device_id === deviceId) {
          // mesmo peito ainda na frente da câmera: só lembra, sem alarme
          setFeedback({ kind: "info", title: `Nº ${bib} já registrado`, detail: `${result.athlete.name} · ${time}` });
          return;
        }
        showError(
          `Nº ${bib} já chegou`,
          `${result.athlete.name} · ${time}. A chegada não foi duplicada.`,
        );
        return;
      }
      case "assign":
        assign(result.target.client_id, result.athlete);
        setSelectedId(null);
        vibrate(VIBRATE_OK);
        setFeedback({ kind: "ok", athlete: result.athlete, ...describe(result.target.finish_time) });
        return;
      case "create": {
        const f = newFinish(race.id, clock.now(), result.athlete.id, deviceId);
        add(f);
        vibrate(VIBRATE_OK);
        setFeedback({ kind: "ok", athlete: result.athlete, ...describe(f.finish_time) });
        return;
      }
    }
  }

  function handleDelete(f: Finish) {
    const athlete = f.athlete_id ? athletesById.get(f.athlete_id) : undefined;
    const label = athlete ? `nº ${athlete.bib_number} — ${athlete.name}` : "sem número";
    if (!window.confirm(`Excluir a chegada ${label} (${describe(f.finish_time).time})?`)) return;
    remove(f.client_id);
    if (selectedId === f.client_id) setSelectedId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* conexão + cronômetro */}
      <SyncBar status={syncStatus}>
        {started && startMs !== null && race.status === "running" ? (
          <Stopwatch startMs={startMs} now={clock.now} className="shrink-0 text-2xl font-bold" />
        ) : (
          <span className="shrink-0 font-bold">{race.status === "finished" ? "Encerrada" : "Aguardando largada"}</span>
        )}
      </SyncBar>
      {clock.state.status === "error" && (
        <p className="rounded-lg bg-yellow-300 p-2 text-sm font-bold">
          Relógio não sincronizado com o servidor ({clock.state.message}). Usando o relógio do celular.{" "}
          <button onClick={clock.sync} className="underline">
            Tentar de novo
          </button>
        </p>
      )}
      {(loadError || athletes.error) && (
        <p className="rounded-lg bg-red-100 p-2 font-bold text-red-800">{loadError ?? athletes.error}</p>
      )}

      {!started ? (
        <p className="rounded-lg border-4 border-black p-6 text-center text-2xl font-bold">
          A corrida ainda não largou.
          <br />
          <span className="text-base font-normal">Dê a largada na tela Largada.</span>
        </p>
      ) : (
        <button
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
          className="h-[18vh] min-h-28 rounded-2xl bg-yellow-400 text-6xl font-black text-black shadow-lg select-none touch-manipulation active:scale-[0.98] active:bg-yellow-500"
        >
          CHEGOU
        </button>
      )}

      {/* confirmação: altura fixa para o teclado não mudar de lugar */}
      {started && (
        <div className="h-20">
          {feedback ? (
            <FeedbackBox feedback={feedback} onClose={() => setFeedback(null)} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-black/20 text-black/40">
              {mode === "camera" ? "Toque CHEGOU ou aponte a câmera" : "Toque CHEGOU ou digite o número"}
            </div>
          )}
        </div>
      )}
      {!started && feedback && <FeedbackBox feedback={feedback} onClose={() => setFeedback(null)} />}

      {/* alvo do próximo número */}
      {started && (
        <div
          className={`rounded-lg px-3 py-2 text-center font-bold ${
            selected ? "bg-blue-600 text-white" : pending.length ? "bg-orange-500 text-white" : "bg-black/5"
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
              {pending.length} {pending.length === 1 ? "chegada aguardando" : "chegadas aguardando"} número ·
              próxima: {describe(pending[0].finish_time).time}
            </>
          ) : (
            "Sem pendências: o número digitado registra a chegada agora"
          )}
        </div>
      )}

      {started && (
        <>
          <div role="tablist" className="grid grid-cols-2 rounded-lg border-2 border-black">
            {(
              [
                ["keypad", "Teclado"],
                ["camera", "Câmera (QR)"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`py-2 text-lg font-bold ${mode === id ? "bg-black text-white" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === "keypad" ? (
            <Keypad value={input} onChange={setInput} onSubmit={handleSubmit} />
          ) : (
            <QrScanner
              onScan={(bib) => submitBib(bib, "camera")}
              onInvalid={(text) =>
                showError("QR Code não reconhecido", `Conteúdo: "${text.slice(0, 40)}". Esperado só o número.`)
              }
            />
          )}
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Últimas chegadas</h2>
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
          onDelete={handleDelete}
        />
      </section>
    </div>
  );
}

function FeedbackBox({ feedback, onClose }: { feedback: Feedback; onClose: () => void }) {
  const base = "flex h-full w-full items-center gap-4 overflow-hidden rounded-2xl px-4 text-left text-white";
  if (feedback.kind === "ok") {
    return (
      <button onClick={onClose} className={`${base} bg-green-600`}>
        <span className="text-5xl font-black tabular-nums">{feedback.athlete.bib_number}</span>
        <span className="min-w-0">
          <span className="block truncate text-2xl font-bold">{feedback.athlete.name}</span>
          <span className="block text-xl">
            <span className="font-mono font-bold">{feedback.time}</span> · {feedback.pace}
          </span>
        </span>
      </button>
    );
  }
  return (
    <button onClick={onClose} className={`${base} ${feedback.kind === "error" ? "bg-red-600" : "bg-black"}`}>
      <span className="min-w-0">
        <span className="block text-2xl font-black leading-tight">{feedback.title}</span>
        {feedback.detail && <span className="block leading-tight">{feedback.detail}</span>}
      </span>
    </button>
  );
}
