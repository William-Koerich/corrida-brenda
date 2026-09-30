"use client";

import { useEffect } from "react";

const MAX_DIGITS = 5;

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
        className="flex h-16 items-center justify-center rounded-lg border-4 border-black bg-white text-6xl font-black tabular-nums"
        aria-live="polite"
      >
        {value || <span className="text-3xl font-bold text-black/30">Nº do peito</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            disabled={disabled || (key === "OK" && !value)}
            className={`h-14 rounded-lg text-3xl font-black active:scale-95 disabled:opacity-40 ${
              key === "OK"
                ? "bg-green-600 text-white"
                : key === "⌫"
                  ? "bg-black/10"
                  : "border-2 border-black bg-white"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
