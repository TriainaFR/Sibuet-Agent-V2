"use client";

import { CalendarDays, Gauge, LayoutList, Layers, PencilLine, Radio } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const liens = [
  { href: "/", label: "À faire", icone: LayoutList },
  { href: "/sujets", label: "Sujets", icone: Layers },
  { href: "/calendrier", label: "Calendrier", icone: CalendarDays },
  { href: "/donnees", label: "Vos données", icone: PencilLine },
  { href: "/mesure", label: "Mesure", icone: Gauge },
  { href: "/sources", label: "Sources", icone: Radio },
];

export function Navigation() {
  const chemin = usePathname();
  return (
    <nav className="scrollbar-thin -mb-px mt-2 flex justify-start gap-1 overflow-x-auto sm:justify-center sm:gap-4">
      {liens.map(({ href, label, icone: Icone }) => {
        const actif = href === "/" ? chemin === "/" : chemin.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-2.5 pb-3 pt-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition ${
              actif ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <Icone className="h-3.5 w-3.5" strokeWidth={1.6} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
