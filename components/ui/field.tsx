import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "h-11 w-full rounded-xl bg-white px-3 text-base ring-1 ring-inset ring-line placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-ink";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}
