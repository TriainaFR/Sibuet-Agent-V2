"use client";

import { ChevronDown, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** Bandeau permanent de la démonstration : dit en clair où l'on se place, et pourquoi, sur demande. */
export function BandeauDemo({ jour, date, saison }: { jour: string; date: string; saison: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="bg-[#8a4b2a] text-white print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[0.8125rem] sm:px-6">
        <History className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.8} />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">
            Démo : l&apos;agent se place au {jour} {date}, avec les vraies ventes du Lodge Park.
          </span>
          <span className="hidden text-white/80 md:inline"> Il montre ce qu&apos;il aurait proposé ce jour-là. Rien n&apos;est envoyé.</span>
        </p>
        <button onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/12 px-2 py-0.5 text-xs font-medium hover:bg-white/20">
          Pourquoi ? <ChevronDown className={`h-3 w-3 transition ${ouvert ? "rotate-180" : ""}`} />
        </button>
      </div>
      {ouvert && (
        <div className="border-t border-white/15 px-4 pb-3 pt-2.5 text-[0.8125rem] leading-relaxed text-white/90 sm:px-6">
          <p className="max-w-3xl">
            Les exports Asterio ne contiennent pas encore les réservations de l&apos;hiver qui vient. Pour montrer l&apos;agent sur de vraies données, on rejoue
            l&apos;{saison.toLowerCase()} : au {date}, l&apos;agent ne voit que les réservations déjà faites ce jour-là, comme il les aurait vues en conditions réelles.
          </p>
          <p className="mt-1.5 max-w-3xl">
            Comme la suite de cet hiver est connue, on peut vérifier après coup s&apos;il avait vu juste :{" "}
            <Link href="/mesure#verdict" className="font-semibold underline underline-offset-2">
              voir ce qui s&apos;est passé ensuite
            </Link>
            . La date se change dans le menu de la saison, en haut à gauche.
          </p>
        </div>
      )}
    </div>
  );
}
