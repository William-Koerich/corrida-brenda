"use client";

import { Flag, Home, Monitor, Timer, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { RaceStatusBadge } from "./ui/badge";
import { useRace } from "./race-provider";

export const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/atletas", label: "Atletas", icon: Users },
  { href: "/largada", label: "Largada", icon: Flag },
  { href: "/chegada", label: "Chegada", icon: Timer },
  { href: "/resultados", label: "Resultados", icon: Trophy },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-ink shadow-sm">
        <Flag size={18} strokeWidth={2.5} />
      </span>
      {!compact && <span className="text-[15px] font-semibold tracking-tight">{BRAND.name}</span>}
    </Link>
  );
}

function StatusPill() {
  const race = useRace();
  if (race.status !== "ready") return null;
  return <RaceStatusBadge status={race.race.status} />;
}

/**
 * Moldura do app:
 * - telas de gestão: cabeçalho (desktop) + abas embaixo (celular)
 * - /chegada: modo foco, sem moldura (a tela tem o próprio topo)
 * - /telao: tela inteira
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/telao")) return <>{children}</>;
  if (pathname.startsWith("/chegada")) {
    return <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-3 pt-3 pb-6">{children}</main>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${
                  isActive(pathname, href) ? "bg-ink text-white" : "text-ink-soft hover:bg-black/5 hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <Link
              href="/telao"
              className="ml-1 flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-black/5 hover:text-ink"
            >
              <Monitor size={16} />
              Telão
            </Link>
          </nav>
          <StatusPill />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12">{children}</main>

      {/* abas embaixo, ao alcance do polegar */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-ink" : "text-ink-soft"}`}
              >
                <span className={`rounded-full px-4 py-1 ${active ? "bg-brand" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/** Estado padrão das telas enquanto a corrida carrega / falha / não existe. */
export function RaceGate({ children }: { children: (race: Extract<ReturnType<typeof useRace>, { status: "ready" }>["race"]) => ReactNode }) {
  const race = useRace();
  if (race.status === "loading") {
    return <div className="py-24 text-center text-ink-soft">Carregando…</div>;
  }
  if (race.status === "error") {
    return <div className="mx-auto max-w-md rounded-2xl bg-red-50 p-6 text-center text-red-800 ring-1 ring-red-200">{race.message}</div>;
  }
  if (race.status === "empty") {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
        Nenhuma corrida cadastrada. Rode o <code>supabase/seed.sql</code> (veja o README).
      </div>
    );
  }
  return <>{children(race.race)}</>;
}
