"use client";

import { Compass, Gauge, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Trois rubriques : ce qu'il faut lancer cette semaine, la stratégie de la saison, le pilotage.
const RUBRIQUES = [
  { id: "semaine", label: "Cette semaine", href: "/", icone: ListChecks, pages: [] as { href: string; label: string }[] },
  {
    id: "strategie",
    label: "Stratégie",
    href: "/sujets",
    icone: Compass,
    pages: [
      { href: "/sujets", label: "Sujets" },
      { href: "/marches", label: "Marchés" },
      { href: "/calendrier", label: "Calendrier" },
      { href: "/canaux", label: "Canaux" },
    ],
  },
  {
    id: "pilotage",
    label: "Pilotage",
    href: "/mesure",
    icone: Gauge,
    pages: [
      { href: "/mesure", label: "Mesure" },
      { href: "/donnees", label: "Vos données" },
      { href: "/maisons", label: "Maisons" },
      { href: "/sources", label: "D'où viennent les données" },
    ],
  },
];

export function Navigation() {
  const chemin = usePathname();
  const dans = (href: string) => (href === "/" ? chemin === "/" || chemin.startsWith("/plan-semaine") : chemin === href || chemin.startsWith(`${href}/`));
  const active = RUBRIQUES.find((r) => (r.pages.length ? r.pages.some((p) => dans(p.href)) : dans(r.href))) ?? null;
  return (
    <>
      <nav aria-label="Rubriques" className="-mb-px mt-1 flex justify-center gap-1 sm:gap-6">
        {RUBRIQUES.map((r) => {
          const actif = active?.id === r.id;
          const I = r.icone;
          return (
            <Link
              key={r.id}
              href={r.href}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 pb-3 pt-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition sm:px-3 ${
                actif ? "border-maison text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              <I className="h-3.5 w-3.5" strokeWidth={1.6} />
              {r.label}
            </Link>
          );
        })}
      </nav>
      {active && active.pages.length > 0 && (
        <div className="-mx-4 border-t border-line bg-cream/80 px-4 sm:-mx-6 sm:px-6">
          <nav aria-label={active.label} className="scrollbar-thin flex justify-start gap-1 overflow-x-auto py-2 sm:justify-center">
            {active.pages.map((p) => {
              const actif = dans(p.href);
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  aria-current={actif ? "page" : undefined}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[0.78rem] transition ${actif ? "bg-ink text-white" : "text-ink-soft hover:bg-white hover:text-ink"}`}
                >
                  {p.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
