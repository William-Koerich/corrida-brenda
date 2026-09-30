"use client";

import { Delete } from "lucide-react";
import { useEffect } from "react";

const MAX_DIGITS = 5;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/** Teclado numérico grande; também aceita o teclado físico (dígitos, Backspace, Enter). */
export function Keypad({ value, onChange, onSubmit, disabled }: Props) {
  const press = (key: string) => {
    if (disabled) return;
    if (key === "⌫") onChange(value.slice(0, -1));
    else if (key === "OK") onSubmit();
    else if (value.length < MAX_DIGITS) onChange(value + key);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled || e.target instanceof HTMLInputElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") press("OK");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-2">
      <div
        className="tabular flex h-16 items-center justify-center rounded-2xl bg-white font-mono text-5xl font-semibold ring-2 ring-ink"
        aria-live="polite"
      >
        {value || <span className="font-sans text-2xl font-medium text-ink-soft/50">Nº do peito</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            disabled={disabled || (key === "OK" && !value)}
            aria-label={key === "⌫" ? "Apagar" : key}
            className={`flex h-14 items-center justify-center rounded-2xl text-3xl font-semibold transition select-none active:scale-95 disabled:opacity-30 ${
              key === "OK"
                ? "bg-emerald-600 text-white"
                : key === "⌫"
                  ? "bg-black/5 text-ink"
                  : "bg-white text-ink shadow-sm ring-1 ring-line"
            }`}
          >
            {key === "⌫" ? <Delete size={26} /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
