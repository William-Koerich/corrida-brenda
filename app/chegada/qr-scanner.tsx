"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cameraErrorMessage, parseBibFromQr, ScanDebouncer } from "@/lib/qr";

type Status = { kind: "starting" } | { kind: "running" } | { kind: "error"; message: string };

interface Props {
  onScan: (bib: number) => void;
  onInvalid: (text: string) => void;
}

/** Câmera traseira lendo QR Codes continuamente. */
export function QrScanner({ onScan, onInvalid }: Props) {
  const elementId = `qr-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
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
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    const debouncer = new ScanDebouncer();

    (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode(elementId, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
      });
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (w, h) => {
              const size = Math.floor(Math.min(w, h) * 0.75);
              return { width: size, height: size };
            },
          },
          (text) => {
            if (!debouncer.accept(text)) return;
            const bib = parseBibFromQr(text);
            if (bib) callbacks.current.onScan(bib);
            else callbacks.current.onInvalid(text);
          },
          undefined,
        );
        if (cancelled) await scanner.stop();
        else setStatus({ kind: "running" });
      } catch (e) {
        if (!cancelled) setStatus({ kind: "error", message: cameraErrorMessage(e) });
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [elementId, attempt]);

  return (
    <div className="relative flex flex-col gap-2">
      <div
        id={elementId}
        className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover"
      />
      {status.kind === "starting" && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-bold text-white">
          Abrindo câmera…
        </p>
      )}
      {status.kind === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-red-600 p-4 text-center text-white">
          <p className="text-lg font-bold">{status.message}</p>
          <button
            onClick={() => {
              setStatus({ kind: "starting" });
              setAttempt((n) => n + 1);
            }}
            className="rounded-lg bg-white px-4 py-2 font-bold text-red-700"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  );
}
