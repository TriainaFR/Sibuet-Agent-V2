"use client";

import { Check, ChevronDown, History, Radio } from "lucide-react";
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
      <button
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        className={`flex items-center gap-2 border px-2.5 py-1.5 text-left transition sm:px-3 ${
          s.rejeu ? "border-cognac/50 bg-cognac/8 hover:border-cognac" : "border-line bg-white hover:border-ink"
        } ${enCours ? "opacity-60" : ""}`}
      >
        {s.rejeu ? <History className="hidden h-3.5 w-3.5 shrink-0 text-cognac sm:block" /> : <Radio className="hidden h-3.5 w-3.5 shrink-0 text-sage sm:block" />}
        <span className="min-w-0">
          <span className="block whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="sm:hidden">{s.nom.replace(/20(\d\d)-20(\d\d)/, "$1-$2")}</span>
            <span className="hidden sm:inline">
              {s.nom}
              {s.rejeu ? " · rejouée" : " · en cours"}
            </span>
          </span>
          <span className="block whitespace-nowrap text-[0.68rem] text-ink-soft">
            <span className="sm:hidden">{s.rejeu ? dateCourte(date).replace(/ \d{4}$/, "") : "en cours"}</span>
            <span className="hidden sm:inline">{s.rejeu ? `au ${dateCourte(date)}` : majLe ? `calcul du ${dateCourte(majLe)}` : "aujourd'hui"}</span>
          </span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-ink-soft transition ${ouvert ? "rotate-180" : ""}`} />
      </button>
      {ouvert && (
        <div role="menu" className="apparition absolute right-0 top-full z-40 mt-2 w-[min(19rem,calc(100vw-2rem))] border border-line bg-white py-2 text-left shadow-[0_18px_40px_-20px_rgba(47,47,43,0.45)]">
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
                          className={`border px-2 py-1 text-xs transition ${actif ? "border-cognac bg-cognac text-white" : "border-line hover:border-ink"}`}
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
