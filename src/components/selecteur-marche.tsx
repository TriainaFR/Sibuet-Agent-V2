"use client";

import { Check, ChevronDown, Globe2 } from "lucide-react";
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
      <button
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        className={`flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-left transition ${m ? "border-ink/30 bg-white" : "border-line bg-white/70 hover:border-ink/40"} ${enCours ? "opacity-60" : ""}`}
      >
        {m ? <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.couleur }} /> : <Globe2 className="h-3.5 w-3.5 shrink-0 text-ink-soft" />}
        <span className="truncate text-[0.72rem] font-semibold text-ink">{m ? m.nom : "Tous les marchés"}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-ink-soft transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute left-0 top-full z-40 mt-2 max-h-[70vh] w-72 overflow-y-auto border border-line bg-white py-2 shadow-[0_18px_40px_-20px_rgba(47,47,43,0.45)]">
          <button role="menuitemradio" aria-checked={!m} onClick={() => choisir(null)} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-sand/60">
            <span className="font-semibold">Tous les marchés</span>
            {!m && <Check className="h-3.5 w-3.5" />}
          </button>
          {regions.map((r) => (
            <div key={r}>
              <p className="mt-1 border-t border-line px-4 pb-1 pt-3 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-taupe">{r}</p>
              {marches
                .filter((x) => (x.region ?? "Autres") === r)
                .map((x) => (
                  <button key={x.id} role="menuitemradio" aria-checked={actif === x.id} onClick={() => choisir(x.id)} className="flex w-full items-center gap-3 px-4 py-1.5 text-left text-sm hover:bg-sand/60">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.couleur }} />
                    <span className="flex-1">{x.nom}</span>
                    <span className="text-xs tabular-nums text-ink-soft">{x.nuitees} nuitées</span>
                    {actif === x.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
            </div>
          ))}
          <Link href={m ? `/marches/${m.id}` : "/marches"} onClick={() => setOuvert(false)} className="mx-4 mt-2 block border-t border-line pt-3 text-xs font-semibold text-maison hover:underline">
            {m ? `Ouvrir la fiche ${m.nom}` : "Comparer les marchés"}
          </Link>
        </div>
      )}
    </div>
  );
}
