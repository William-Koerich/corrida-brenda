"use client";

import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** Abas / seletor de opções exclusivas. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  size?: "md" | "lg";
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex w-full rounded-xl bg-black/5 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg font-semibold transition ${
              size === "lg" ? "h-11 text-base" : "h-9 text-sm"
            } ${active ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
