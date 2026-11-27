import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { DecisionSujet } from "@/lib/engine/leviers";
import type { Facteur } from "@/lib/types";
import { Niveau, Origine } from "./ui";

const mot = (f: Facteur) => (f.manquant ? "Non mesuré" : f.valeur >= 0.7 ? "Haut" : f.valeur >= 0.4 ? "Moyen" : "Bas");
const TON: Record<DecisionSujet["confiance"], string> = {
  fiable: "bg-sage/12 text-[#3d6639]",
  partiel: "bg-ochre/14 text-[#7c5a17]",
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
    <section aria-label="Décision" className="panneau overflow-hidden">
      <div className="grid lg:grid-cols-[1.25fr_1fr]">
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8125rem] font-semibold text-ink">Décision</span>
            {m && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-xs font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
                {m.nom}
              </span>
            )}
            <span className={`pastille ${TON[decision.confiance]}`} title={decision.confianceDetail}>
              <ShieldCheck className="h-3 w-3" /> Confiance : {decision.confiance}
            </span>
          </div>
          <p className="mt-3 text-[1.0625rem] font-semibold leading-snug tracking-tight text-ink">{decision.phrase}</p>
          <p className="mt-2 text-xs text-taupe">{decision.confianceDetail}</p>
          {m && (
            <Link href={`/marches/${m.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-nav hover:underline">
              Voir la fiche marché {m.nom} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        {decision.changerAvis.length > 0 && (
          <div className="border-t border-line bg-cream/60 p-5 lg:border-l lg:border-t-0">
            <p className="text-[0.8125rem] font-semibold">Ce qui ferait changer l&apos;avis</p>
            <ul className="mt-2.5 space-y-2 text-[0.8125rem] leading-relaxed text-ink-soft">
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
            <div key={titre} className="bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-taupe">{titre}</p>
                <Origine origine={f.manquant ? null : f.origine} />
              </div>
              <div className="mt-2">
                <Niveau libelle={mot(f)} />
              </div>
              <p className="mt-2 line-clamp-4 text-[0.8125rem] leading-snug text-ink-soft" title={f.detail}>
                {f.detail}
              </p>
              <p className="mt-2 text-xs text-taupe">Source : {f.source}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
