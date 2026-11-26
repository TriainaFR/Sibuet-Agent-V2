"use client";

import { Check, Clock, RotateCcw, X } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { deciderActivation } from "@/app/actions";
import type { Decision } from "@/lib/types";

const LIBELLE: Record<Decision["etat"], string> = { brouillon: "À décider", validee: "Validée", reportee: "Reportée", rejetee: "Rejetée" };

/**
 * Décision sur place : valider, reporter ou rejeter une action sans ouvrir sa fiche.
 * Rien n'est envoyé : la décision est enregistrée, et le brief devient « validé ».
 */
export function DecisionRapide({ cle, decision, compact = false }: { cle: string; decision?: Decision; compact?: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useOptimistic<Decision["etat"]>(decision?.etat ?? "brouillon");
  const decider = (e: Decision["etat"]) =>
    demarrer(async () => {
      setEtat(e);
      await deciderActivation(cle, e, decision?.par || "Équipe marketing");
    });

  if (etat !== "brouillon") {
    const style = etat === "validee" ? "bg-sage/12 text-sage" : etat === "reportee" ? "bg-ochre/12 text-[#86672f]" : "bg-sand text-ink-soft";
    const I = etat === "validee" ? Check : etat === "reportee" ? Clock : X;
    return (
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <span className={`inline-flex items-center gap-1.5 px-3 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] ${style}`}>
          <I className="h-3.5 w-3.5" />
          {LIBELLE[etat]}
        </span>
        <button disabled={enCours} onClick={() => decider("brouillon")} className="inline-flex items-center gap-1 px-2 py-2 text-xs text-ink-soft hover:text-ink">
          <RotateCcw className="h-3 w-3" /> Annuler
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <button disabled={enCours} onClick={() => decider("validee")} className={`bouton disabled:opacity-50 ${compact ? "!px-3 !py-2" : "!px-4 !py-2.5"}`}>
        <Check className="h-3.5 w-3.5" /> Valider
      </button>
      <button
        disabled={enCours}
        onClick={() => decider("reportee")}
        className="inline-flex items-center gap-1.5 border border-line bg-white px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink transition hover:border-ink disabled:opacity-50"
      >
        <Clock className="h-3.5 w-3.5" /> Reporter
      </button>
      <button
        disabled={enCours}
        onClick={() => decider("rejetee")}
        className="inline-flex items-center gap-1.5 px-2 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-soft transition hover:text-brick disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" /> Rejeter
      </button>
    </div>
  );
}
