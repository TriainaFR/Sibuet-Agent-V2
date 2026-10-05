"use client";

import { Play, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { basculerDonneesFictives, lancerRoutineAction } from "@/app/actions";

export function BoutonRoutine() {
  const [enCours, demarrer] = useTransition();
  const [lignes, setLignes] = useState<string[] | null>(null);
  const [resume, setResume] = useState("");
  return (
    <div>
      <button
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            setLignes(null);
            const r = await lancerRoutineAction(true);
            setLignes(r.lignes);
            setResume(`Calcul n° ${r.numero}, ${r.alertes} alerte${r.alertes > 1 ? "s" : ""}.`);
          })
        }
        className="bouton disabled:opacity-60"
      >
        {enCours ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {enCours ? "Collecte en cours, une à deux minutes…" : "Lancer la routine maintenant"}
      </button>
      {lignes && (
        <div className="mt-3 border border-line bg-cream/60 p-3 text-xs leading-relaxed">
          <p className="mb-1 font-semibold">{resume}</p>
          {lignes.map((l, i) => (
            <p key={i} className={l.startsWith("✗") ? "text-brick" : l.startsWith("✓") ? "text-sage" : "text-ink-soft"}>
              {l}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function InterrupteurFictif({ actif }: { actif: boolean }) {
  const [enCours, demarrer] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span
        role="switch"
        aria-checked={actif}
        onClick={() => !enCours && demarrer(() => basculerDonneesFictives(!actif))}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${actif ? "bg-brick" : "bg-greige/60"} ${enCours ? "opacity-60" : ""}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${actif ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
      <span className="text-sm">
        <span className="font-semibold">{actif ? "Données fictives actives" : "Données fictives désactivées"}</span>
        <span className="block text-ink-soft">Réservations Asterio, performance des newsletters et Google Ads inventés pour montrer la boucle complète.</span>
      </span>
    </label>
  );
}
