"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const liens = [
  { href: "/", label: "À faire" },
  { href: "/donnees", label: "Vos données" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/sujets", label: "Sujets" },
  { href: "/mesure", label: "Mesure" },
  { href: "/sources", label: "Sources" },
];

export function Navigation() {
  const chemin = usePathname();
  return (
    <nav className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto">
      {liens.map((l) => {
        const actif = l.href === "/" ? chemin === "/" : chemin.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[0.93rem] transition ${
              actif ? "border-brown font-semibold text-ink" : "border-transparent text-ink-soft hover:border-line hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
