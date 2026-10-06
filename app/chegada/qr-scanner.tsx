"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { cameraErrorMessage, parseBibFromQr, ScanDebouncer } from "@/lib/qr";

type Status = { kind: "starting" } | { kind: "running" } | { kind: "error"; message: string };

interface Props {
  onScan: (bib: number) => void;
  onInvalid: (text: string) => void;
}

/** Intervalo mínimo entre leituras (o decodificador em JS no iPhone leva mais tempo por quadro). */
const SCAN_EVERY_MS = 120;

interface Detector {
  detect(source: HTMLVideoElement): Promise<string[]>;
}

/**
 * Leitor nativo do aparelho (Android/Chrome); no iPhone, jsQR.
 * Os dois analisam a imagem na resolução real da câmera: o QR do número de
 * peito é pequeno quando o corredor está longe, e reduzir a imagem antes de
 * procurar (como fazia a biblioteca anterior) impedia a leitura.
 */
async function createDetector(): Promise<Detector> {
  type NativeDetector = { detect(s: HTMLVideoElement): Promise<{ rawValue: string }[]> };
  const Native = (globalThis as { BarcodeDetector?: new (o: { formats: string[] }) => NativeDetector }).BarcodeDetector;
  if (Native) {
    try {
      const native = new Native({ formats: ["qr_code"] });
      return { detect: async (video) => (await native.detect(video)).map((c) => c.rawValue) };
    } catch {
      // aparelho sem suporte a QR no leitor nativo: usa o jsQR
    }
  }

  // jsQR vem junto com a tela (não sob demanda): precisa funcionar offline no iPhone
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return {
    detect: async (video) => {
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) return [];
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      return found ? [found.data] : [];
    },
  };
}

/** Câmera traseira lendo QR Codes continuamente. */
export function QrScanner({ onScan, onInvalid }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "starting" });
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onScan, onInvalid });
  useEffect(() => {
    callbacks.current = { onScan, onInvalid };
  });

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ambiente sem câmera
      setStatus({ kind: "error", message: cameraErrorMessage(null, false) });
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debouncer = new ScanDebouncer();

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // foco contínuo onde o aparelho permite (Android)
            advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
          },
        });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const detector = await createDetector();
        if (cancelled) return;
        setStatus({ kind: "running" });

        const loop = async () => {
          if (cancelled) return;
          const started = performance.now();
          try {
            for (const text of await detector.detect(video)) {
              if (!debouncer.accept(text)) continue;
              const bib = parseBibFromQr(text);
              if (bib) callbacks.current.onScan(bib);
              else callbacks.current.onInvalid(text);
            }
          } catch {
            // quadro inválido (câmera trocando de resolução etc.): tenta no próximo
          }
          timer = setTimeout(loop, Math.max(0, SCAN_EVERY_MS - (performance.now() - started)));
        };
        loop();
      } catch (e) {
        if (!cancelled) setStatus({ kind: "error", message: cameraErrorMessage(e) });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  return (
    <div className="relative flex flex-col gap-2">
      <div className="aspect-4/3 w-full overflow-hidden rounded-2xl bg-ink">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      </div>
      {status.kind === "running" && (
        // só orientação: a leitura usa a imagem inteira
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end p-3">
          <div className="absolute inset-[12%] rounded-2xl border-2 border-dashed border-white/50" />
          <p className="relative rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-white">
            Enquadre o número de peito inteiro
          </p>
        </div>
      )}
      {status.kind === "starting" && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-bold text-white">
          Abrindo câmera…
        </p>
      )}
      {status.kind === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-red-600 p-4 text-center text-white">
          <p className="text-lg font-bold">{status.message}</p>
          <button
            onClick={() => {
              setStatus({ kind: "starting" });
              setAttempt((n) => n + 1);
            }}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-red-700"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
