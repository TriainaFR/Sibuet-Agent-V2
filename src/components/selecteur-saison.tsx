"use client";

import { Check, ChevronsUpDown, History, Radio } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { choisirSaison } from "@/app/actions";

interface SaisonMenu {
  id: string;
  nom: string;
  rejeu: boolean;
  datesProposees?: string[];
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dateCourte = (d: string) => `${Number(d.slice(8, 10))} ${MOIS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;

/**
 * Saison affichée. Une saison passée est « rejouée » : l'agent travaille comme à la date choisie,
 * avec les réservations réellement enregistrées à cette date. La saison en cours se calcule à aujourd'hui.
 */
export function SelecteurSaison({ saisons, active, date, majLe }: { saisons: SaisonMenu[]; active: string; date: string; majLe?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, demarrer] = useTransition();
  const zone = useRef<HTMLDivElement>(null);
  const s = saisons.find((x) => x.id === active) ?? saisons[0];

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

  const choisir = (id: string, d?: string) =>
    demarrer(async () => {
      await choisirSaison(id, d);
      setOuvert(false);
    });

  return (
    <div ref={zone} className="relative">
      <button onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} aria-haspopup="menu" className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-black/[0.04] ${enCours ? "opacity-60" : ""}`}>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${s.rejeu ? "bg-cognac/12 text-cognac" : "bg-sage/12 text-sage"}`}>
          {s.rejeu ? <History className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">{s.nom}</span>
          <span className="block truncate text-xs text-taupe">{s.rejeu ? `Rejouée au ${dateCourte(date)}` : majLe ? `Calcul du ${dateCourte(majLe)}` : "En cours"}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-taupe" />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute left-0 top-full z-40 mt-1 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-line bg-white py-1.5 text-left rounded-xl shadow-[0_12px_32px_-12px_rgba(28,28,26,0.28),0_0_0_1px_rgba(28,28,26,0.04)]">
          {saisons.map((x) => (
            <div key={x.id} className="px-4 py-2">
              {x.rejeu ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <History className="h-3.5 w-3.5 text-cognac" /> {x.nom}, rejouée
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                    L&apos;agent comme il aurait travaillé à cette date, avec les réservations réellement enregistrées. Choisissez le jour :
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(x.datesProposees ?? []).map((d) => {
                      const actif = active === x.id && d === date;
                      return (
                        <button
                          key={d}
                          role="menuitemradio"
                          aria-checked={actif}
                          disabled={enCours}
                          onClick={() => choisir(x.id, d)}
                          className={`rounded-md border px-2 py-1 text-xs transition ${actif ? "border-cognac bg-cognac text-white" : "border-line hover:border-ink/40"}`}
                        >
                          {dateCourte(d).replace(/ \d{4}$/, "")}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <button role="menuitemradio" aria-checked={active === x.id} disabled={enCours} onClick={() => choisir(x.id)} className="flex w-full items-start gap-2 border-t border-line pt-3 text-left">
                  <Radio className="mt-0.5 h-3.5 w-3.5 text-sage" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{x.nom}, en cours</span>
                    <span className="block text-xs leading-snug text-ink-soft">À la date du jour. Le remplissage à date viendra du prochain export Asterio.</span>
                  </span>
                  {active === x.id && <Check className="mt-0.5 h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
