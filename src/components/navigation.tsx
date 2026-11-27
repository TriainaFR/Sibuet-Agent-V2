"use client";

import { CalendarRange, Database, Gauge, Globe2, Home, Layers, Network, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Trois rubriques : ce qu'il faut lancer cette semaine, la stratégie de la saison, le pilotage.
export const RUBRIQUES = [
  { titre: null, pages: [{ href: "/", label: "Cette semaine", icone: Home }] },
  {
    titre: "Stratégie",
    pages: [
      { href: "/sujets", label: "Sujets", icone: Sparkles },
      { href: "/marches", label: "Marchés", icone: Globe2 },
      { href: "/calendrier", label: "Calendrier", icone: CalendarRange },
      { href: "/canaux", label: "Canaux", icone: Route },
    ],
  },
  {
    titre: "Pilotage",
    pages: [
      { href: "/mesure", label: "Mesure", icone: Gauge },
      { href: "/donnees", label: "Vos données", icone: Database },
      { href: "/maisons", label: "Maisons", icone: Layers },
      { href: "/sources", label: "Sources des données", icone: Network },
    ],
  },
];

export const estDans = (chemin: string, href: string) =>
  href === "/" ? chemin === "/" || chemin.startsWith("/plan-semaine") : chemin === href || chemin.startsWith(`${href}/`);

/** Navigation latérale : une ligne par écran, l'écran courant marqué. */
export function Navigation({ onNaviguer, compteurs }: { onNaviguer?: () => void; compteurs?: Record<string, number> }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Navigation principale" className="space-y-5">
      {RUBRIQUES.map((r, i) => (
        <div key={i}>
          {r.titre && <p className="mb-1 px-2 text-[0.6875rem] font-medium text-taupe">{r.titre}</p>}
          <ul className="space-y-px">
            {r.pages.map((p) => {
              const actif = estDans(chemin, p.href);
              const I = p.icone;
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    onClick={onNaviguer}
                    aria-current={actif ? "page" : undefined}
                    className={`group flex h-8 items-center gap-2.5 rounded-lg px-2 text-[0.8125rem] transition-colors ${
                      actif ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(28,28,26,0.08),0_0_0_1px_rgba(28,28,26,0.06)]" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                    }`}
                  >
                    <I className={`h-4 w-4 shrink-0 ${actif ? "text-nav" : "text-taupe group-hover:text-ink-soft"}`} strokeWidth={1.7} />
                    <span className="flex-1 truncate">{p.label}</span>
                    {compteurs?.[p.href] ? <span className="rounded-md bg-nav px-1.5 text-[0.6875rem] font-semibold leading-5 text-white tabular-nums">{compteurs[p.href]}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

