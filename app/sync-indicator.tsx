"use client";

import { CloudOff, CloudUpload, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import type { SyncStatus } from "@/lib/use-race-data";

function describe({ online, pending, syncing }: SyncStatus) {
  const pendingText = `${pending} ${pending === 1 ? "pendente" : "pendentes"} de envio`;
  if (!online) {
    return { tone: "bg-red-600 text-white", icon: <CloudOff size={16} />, text: pending ? `Offline · ${pendingText}` : "Offline" };
  }
  if (pending) {
    return { tone: "bg-amber-400 text-ink", icon: <CloudUpload size={16} />, text: `${syncing ? "Enviando" : "Online"} · ${pendingText}` };
  }
  return { tone: "bg-ink text-white", icon: <Wifi size={16} className="text-volt" />, text: "Online" };
}

/** Barra de status: online / offline / X chegadas pendentes de envio, com conteúdo à direita. */
export function SyncBar({ status, children }: { status: SyncStatus; children?: ReactNode }) {
  const { tone, icon, text } = describe(status);
  return (
    <div className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 transition-colors ${tone}`}>
      <span role="status" data-testid="sync-status" className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">
        {icon}
        {text}
      </span>
      {children}
    </div>
  );
}
