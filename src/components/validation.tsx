"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deciderActivation } from "@/app/actions";
import type { Decision } from "@/lib/types";

/** Validation humaine d'une activation : rien n'est publié sans elle (règle du projet). */
export function Validation({ cle, decision }: { cle: string; decision?: Decision }) {
  const [enCours, demarrer] = useTransition();
  const [nom, setNom] = useState("");
  const etat = decision?.etat ?? "brouillon";
  const decider = (e: Decision["etat"]) => demarrer(() => deciderActivation(cle, e, nom || decision?.par || "Équipe marketing"));

  if (etat !== "brouillon") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 font-semibold ${etat === "validee" ? "bg-sage/15 text-sage" : "bg-sand text-ink-soft"}`}>
          {etat === "validee" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {etat === "validee" ? "Validée" : "Rejetée"} par {decision?.par}, le {decision?.le.split("-").reverse().join("/")}
        </span>
        <button disabled={enCours} onClick={() => decider("brouillon")} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
          <RotateCcw className="h-3 w-3" /> Revenir au brouillon
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="border border-line bg-sand px-3 py-1.5 text-xs font-medium text-ink-soft">Brouillon</span>
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Validé par…"
        className="w-36 rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
      />
      <button disabled={enCours} onClick={() => decider("validee")} className="bouton !px-4 !py-2.5 disabled:opacity-50">
        <Check className="h-3.5 w-3.5" /> Valider
      </button>
      <button disabled={enCours} onClick={() => decider("rejetee")} className="bouton-clair !px-4 !py-2 disabled:opacity-50">
        <X className="h-3.5 w-3.5" /> Rejeter
      </button>
    </div>
  );
}
