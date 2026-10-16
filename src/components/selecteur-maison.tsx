"use client";

import { Check, ChevronDown } from "lucide-react";
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
export function SelecteurMaison({ maisons, saison }: { maisons: MaisonMenu[]; saison: string }) {
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
      <button
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        className="group flex max-w-full items-center gap-2 text-left"
      >
        <span data-maison={courante?.id ?? "groupe"} className="h-2.5 w-2.5 shrink-0 rounded-full bg-maison ring-2 ring-white" />
        <span className="min-w-0">
          <span className="eyebrow block truncate text-[0.6rem] tracking-[0.12em] text-ink sm:text-[0.66rem] sm:tracking-[0.18em]">
            <span className="sm:hidden">{courante ? court(courante.nom) : "Le groupe"}</span>
            <span className="hidden sm:inline">{courante ? courante.nom : "Toutes les maisons"}</span>
          </span>
          <span className="hidden truncate text-xs text-ink-soft sm:block">{courante ? (courante.pilote && !id ? `Agent · ${saison}` : courante.destination) : "Le groupe Sibuet"}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-ink-soft transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute left-0 top-full z-40 mt-3 w-72 border border-line bg-white py-2 shadow-[0_18px_40px_-20px_rgba(47,47,43,0.45)]">
          <Link role="menuitem" href="/maisons" onClick={() => setOuvert(false)} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-sand/60">
            <span className="font-semibold">Toutes les maisons</span>
            {groupe && chemin === "/maisons" && <Check className="h-3.5 w-3.5" />}
          </Link>
          <p className="mt-1 border-t border-line px-4 pb-1 pt-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Portrait de chaque maison</p>
          {maisons.map((m) => (
            <Link key={m.id} role="menuitem" href={`/maisons/${m.id}`} onClick={() => setOuvert(false)} data-maison={m.id} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-maison-fond">
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
