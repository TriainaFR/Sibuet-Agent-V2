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
    const style = etat === "validee" ? "bg-sage/12 text-[#3d6639]" : etat === "reportee" ? "bg-ochre/14 text-[#7c5a17]" : "bg-sand text-ink-soft";
    const I = etat === "validee" ? Check : etat === "reportee" ? Clock : X;
    return (
      <div className="flex flex-wrap items-center gap-2" aria-live="polite">
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-medium ${style}`}>
          <I className="h-3.5 w-3.5" />
          {LIBELLE[etat]}
        </span>
        <button disabled={enCours} onClick={() => decider("brouillon")} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-ink-soft hover:bg-cream hover:text-ink">
          <RotateCcw className="h-3 w-3" /> Annuler
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
      <button disabled={enCours} onClick={() => decider("validee")} className={`bouton disabled:opacity-50 ${compact ? "" : "!h-9 !px-3.5"}`}>
        <Check className="h-3.5 w-3.5" /> Valider
      </button>
      <button
        disabled={enCours}
        onClick={() => decider("reportee")}
        className={`bouton-clair disabled:opacity-50 ${compact ? "" : "!h-9"}`}
      >
        <Clock className="h-3.5 w-3.5" /> Reporter
      </button>
      <button
        disabled={enCours}
        onClick={() => decider("rejetee")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium text-ink-soft transition hover:bg-brick/8 hover:text-brick disabled:opacity-50 ${compact ? "h-8" : "h-9"}`}
      >
        <X className="h-3.5 w-3.5" /> Rejeter
      </button>
    </div>
  );
}
