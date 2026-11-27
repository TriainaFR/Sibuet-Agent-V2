"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface MaisonMenu {
  id: string;
  nom: string;
  destination: string;
  pilote: boolean;
}

/** Nom court pour les petits écrans : « Villa Marie », « Mont-Blanc », « Fermes de Marie ». */
const court = (nom: string) => nom.replace(/^(Les|La|Hôtel) /, "").replace(/ (Saint-Tropez|Hotel|et propriétés)$/, "");

/** Choix de la maison : l'agent tourne sur la maison pilote, chaque maison a son portrait. */
export function SelecteurMaison({ maisons }: { maisons: MaisonMenu[]; saison?: string }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const id = /^\/maisons\/([^/]+)/.exec(chemin)?.[1];
  const groupe = chemin === "/maisons" || chemin === "/charte";
  const courante = maisons.find((m) => m.id === id) ?? (groupe ? null : maisons.find((m) => m.pilote));

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !zone.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, [ouvert]);

  return (
    <div ref={zone} className="relative min-w-0">
      <button onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-haspopup="menu" className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-black/[0.04]">
        <span data-maison={courante?.id ?? "groupe"} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-maison text-[0.6875rem] font-semibold text-white">
          {courante ? court(courante.nom).split(/[\s-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "MS"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">{courante ? courante.nom : "Toutes les maisons"}</span>
          <span className="block truncate text-xs text-taupe">{courante ? (courante.pilote && !id ? "Maison pilote" : courante.destination) : "Le groupe Sibuet"}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-taupe" />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute left-0 top-full z-40 mt-1 w-72 rounded-xl border border-line bg-white p-1 rounded-xl shadow-[0_12px_32px_-12px_rgba(28,28,26,0.28),0_0_0_1px_rgba(28,28,26,0.04)]">
          <Link role="menuitem" href="/maisons" onClick={() => setOuvert(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-cream">
            <span className="font-semibold">Toutes les maisons</span>
            {groupe && chemin === "/maisons" && <Check className="h-3.5 w-3.5" />}
          </Link>
          <p className="mt-1 border-t border-line px-3 pb-1 pt-2.5 text-xs font-medium text-taupe">Portrait de chaque maison</p>
          {maisons.map((m) => (
            <Link key={m.id} role="menuitem" href={`/maisons/${m.id}`} onClick={() => setOuvert(false)} data-maison={m.id} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm hover:bg-cream">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-maison" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{m.nom}</span>
                <span className="block text-xs text-ink-soft">
                  {m.destination}
                  {m.pilote ? " · agent actif" : ""}
                </span>
              </span>
              {id === m.id && <Check className="h-3.5 w-3.5" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
