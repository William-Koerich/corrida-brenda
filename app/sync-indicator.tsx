"use client";

import type { ReactNode } from "react";
import type { SyncStatus } from "@/lib/use-race-data";

function describe({ online, pending, syncing }: SyncStatus) {
  const pendingText = `${pending} ${pending === 1 ? "pendente" : "pendentes"} de envio`;
  if (!online) return { tone: "bg-red-600 text-white", text: pending ? `Offline · ${pendingText}` : "Offline" };
  if (pending) return { tone: "bg-yellow-300 text-black", text: `${syncing ? "Enviando" : "Online"} · ${pendingText}` };
  return { tone: "bg-black text-white", text: "Online" };
}

/** Barra de status: online / offline / X chegadas pendentes de envio, com conteúdo à direita. */
export function SyncBar({ status, children }: { status: SyncStatus; children?: ReactNode }) {
  const { tone, text } = describe(status);
  const ok = status.online && !status.pending;
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg px-4 py-2 ${tone}`}>
      <span role="status" data-testid="sync-status" className="min-w-0 truncate text-sm font-bold">
        <span className={ok ? "text-green-400" : ""}>●</span> {text}
      </span>
      {children}
    </div>
  );
}
