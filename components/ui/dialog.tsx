"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Input } from "./field";

/** Janela modal (elemento <dialog> nativo: Esc fecha, foco preso dentro). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clique fora
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/60 backdrop:backdrop-blur-sm ${
        size === "lg" ? "max-w-2xl" : "max-w-md"
      }`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              {description && <div className="mt-1 text-sm text-ink-soft">{description}</div>}
            </div>
            <button onClick={onClose} aria-label="Fechar" className="-mr-2 rounded-lg p-2 text-ink-soft hover:bg-black/5">
              <X size={18} />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-6 py-4">{children}</div>}
          {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/**
 * Confirmação de ação. `confirmText` exige digitar a palavra
 * (para ações irreversíveis como reiniciar a corrida).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "primary",
  confirmText,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger" | "accent";
  confirmText?: string;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = confirmText !== undefined && typed.trim().toUpperCase() !== confirmText;

  function close() {
    setTyped("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : tone}
            disabled={busy || blocked}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                setTyped("");
              }
              onClose();
            }}
          >
            {busy ? "Aguarde…" : confirmLabel}
          </Button>
        </>
      }
    >
      {confirmText && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span>
            Para confirmar, digite <strong className="font-mono">{confirmText}</strong>
          </span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoFocus />
        </label>
      )}
    </Dialog>
  );
}
