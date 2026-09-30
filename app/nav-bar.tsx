"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ROUTES = [
  { href: "/atletas", label: "Atletas" },
  { href: "/largada", label: "Largada" },
  { href: "/chegada", label: "Chegada" },
  { href: "/resultados", label: "Resultados" },
];

export function NavBar() {
  const pathname = usePathname();
  // o telão ocupa a tela inteira
  if (pathname.startsWith("/telao")) return null;

  return (
    <nav className="sticky top-0 z-10 bg-black text-white">
      <div className="flex max-w-3xl mx-auto overflow-x-auto">
        <Link href="/" className="px-4 py-3 font-bold whitespace-nowrap">
          🏁 3 km
        </Link>
        {ROUTES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className={`px-3 py-3 whitespace-nowrap ${
              pathname.startsWith(r.href) ? "bg-yellow-400 text-black font-bold" : ""
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
