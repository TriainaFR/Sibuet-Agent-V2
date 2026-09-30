"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Calendrier" },
  { href: "/fenetres", label: "Fenêtres de réservation" },
  { href: "/sources", label: "Sources de données" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto text-sm">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" || pathname.startsWith("/fiches") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 transition ${
              active ? "bg-ink text-white" : "text-ink-soft hover:bg-sand hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
