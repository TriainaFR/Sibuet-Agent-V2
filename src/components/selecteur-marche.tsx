"use client";

import { Check, ChevronsUpDown, Globe2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { choisirMarche } from "@/app/actions";

interface MarcheMenu {
  id: string;
  nom: string;
  couleur: string;
  region?: string;
  nuitees: number;
}

/** Marché choisi pour toute l'application : il filtre la semaine, les sujets et le calendrier. */
export function SelecteurMarche({ marches, actif }: { marches: MarcheMenu[]; actif: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const zone = useRef<HTMLDivElement>(null);
  const m = marches.find((x) => x.id === actif) ?? null;

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

  const choisir = (id: string | null) =>
    demarrer(async () => {
      await choisirMarche(id);
      setOuvert(false);
    });

  const regions = [...new Set(marches.map((x) => x.region ?? "Autres"))];

  return (
    <div ref={zone} className="relative min-w-0">
      <button onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-haspopup="menu" className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-black/[0.04] ${enCours ? "opacity-60" : ""}`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sand">
          {m ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.couleur }} /> : <Globe2 className="h-3.5 w-3.5 text-ink-soft" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">{m ? m.nom : "Tous les marchés"}</span>
          <span className="block truncate text-xs text-taupe">{m ? `${m.nuitees} nuitées sur deux hivers` : "Filtre de marché"}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-taupe" />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute left-0 top-full z-40 mt-1 max-h-[70vh] w-72 overflow-y-auto rounded-xl border border-line bg-white p-1 rounded-xl shadow-[0_12px_32px_-12px_rgba(28,28,26,0.28),0_0_0_1px_rgba(28,28,26,0.04)]">
          <button role="menuitemradio" aria-checked={!m} onClick={() => choisir(null)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-cream">
            <span className="font-semibold">Tous les marchés</span>
            {!m && <Check className="h-3.5 w-3.5" />}
          </button>
          {regions.map((r) => (
            <div key={r}>
              <p className="mt-1 border-t border-line px-3 pb-1 pt-2.5 text-xs font-medium text-taupe">{r}</p>
              {marches
                .filter((x) => (x.region ?? "Autres") === r)
                .map((x) => (
                  <button key={x.id} role="menuitemradio" aria-checked={actif === x.id} onClick={() => choisir(x.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm hover:bg-cream">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.couleur }} />
                    <span className="flex-1">{x.nom}</span>
                    <span className="text-xs tabular-nums text-ink-soft">{x.nuitees} nuitées</span>
                    {actif === x.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
            </div>
          ))}
          <Link href={m ? `/marches/${m.id}` : "/marches"} onClick={() => setOuvert(false)} className="mx-3 mb-1.5 mt-1.5 block border-t border-line pt-2.5 text-xs font-medium text-nav hover:underline">
            {m ? `Ouvrir la fiche ${m.nom}` : "Comparer les marchés"}
          </Link>
        </div>
      )}
    </div>
  );
}
