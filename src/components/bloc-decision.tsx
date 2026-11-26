import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { DecisionSujet } from "@/lib/engine/leviers";
import type { Facteur } from "@/lib/types";
import { Niveau, Origine } from "./ui";

const mot = (f: Facteur) => (f.manquant ? "Non mesuré" : f.valeur >= 0.7 ? "Haut" : f.valeur >= 0.4 ? "Moyen" : "Bas");
const TON: Record<DecisionSujet["confiance"], string> = {
  fiable: "bg-sage/12 text-sage",
  partiel: "bg-ochre/12 text-[#86672f]",
  estimé: "bg-sand text-ink-soft",
};

/** La décision du sujet en une phrase, ses trois raisons sourcées et ce qui ferait changer l'avis. */
export function BlocDecision({ decision }: { decision: DecisionSujet }) {
  const o = decision.opportunite;
  const m = decision.marche;
  const facteurs = o
    ? [
        { titre: "Demande", f: o.facteurs.demande },
        { titre: "Reste à gagner sur Google", f: o.facteurs.visibilite },
        { titre: "Besoin de remplissage", f: o.facteurs.besoin },
      ]
    : [];
  return (
    <section aria-label="Décision" className="apparition mt-8 overflow-hidden border border-ink/15 bg-white shadow-[0_24px_50px_-34px_rgba(47,47,43,0.5)]">
      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        <div className="relative p-6 sm:p-8">
          {m && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: m.couleur }} />}
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-[0.62rem] text-taupe">La décision</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wide ${TON[decision.confiance]}`} title={decision.confianceDetail}>
              <ShieldCheck className="h-3 w-3" /> Confiance : {decision.confiance}
            </span>
          </div>
          <p className="mt-3 font-display text-[1.65rem] leading-[1.2] text-ink sm:text-[1.9rem]">{decision.phrase}</p>
          <p className="mt-3 text-xs text-ink-soft">{decision.confianceDetail}</p>
          {m && (
            <Link href={`/marches/${m.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-maison hover:underline">
              Voir la fiche marché {m.nom} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {decision.changerAvis.length > 0 && (
          <div className="border-t border-line bg-cream/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="eyebrow text-[0.62rem] text-taupe">Ce qui ferait changer l&apos;avis</p>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed">
              {decision.changerAvis.map((c) => (
                <li key={c} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cognac" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {facteurs.length > 0 && (
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
          {facteurs.map(({ titre, f }) => (
            <div key={titre} className="bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-taupe">{titre}</p>
                <Origine origine={f.manquant ? null : f.origine} />
              </div>
              <div className="mt-2">
                <Niveau libelle={mot(f)} />
              </div>
              <p className="mt-2 text-sm leading-snug">{f.detail}</p>
              <p className="mt-2 text-xs text-ink-soft">Source : {f.source}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
