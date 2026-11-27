"use client";

import { Check, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { enregistrerCanaux } from "@/app/actions";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmt = new Intl.NumberFormat("fr-FR");

/** Coût des plateformes et gain d'un passage en direct, avec le taux de commission et le prix saisis. */
export function SimulateurCanaux({ nuiteesOta, nuiteesOtaN1, commission, prix, prixSaisi, saison }: { nuiteesOta: number; nuiteesOtaN1: number; commission: number; prix: number; prixSaisi: boolean; saison: string }) {
  const [c, setC] = useState(commission);
  const [p, setP] = useState(prix);
  const [part, setPart] = useState(20);
  const [enCours, demarrer] = useTransition();
  const [ok, setOk] = useState(false);
  const cout = nuiteesOta * p * (c / 100);
  const coutN1 = nuiteesOtaN1 * p * (c / 100);
  const gain = cout * (part / 100);
  const modifie = c !== commission || p !== prix;

  return (
    <div className="grid gap-px border border-line bg-line lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5 bg-white p-6">
        <label className="block">
          <span className="text-xs font-medium text-taupe">Commission des plateformes</span>
          <div className="mt-2 flex items-center gap-3">
            <input type="range" min={10} max={30} step={0.5} value={c} onChange={(e) => setC(Number(e.target.value))} className="w-full accent-[var(--maison-accent)]" />
            <span className="w-16 text-right text-lg font-semibold tabular-nums">{String(c).replace(".", ",")} %</span>
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-taupe">Prix moyen d&apos;une nuitée</span>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={0} step={10} value={p} onChange={(e) => setP(Number(e.target.value))} className="h-9 w-32 border border-line bg-white px-3 text-base font-semibold tabular-nums focus:border-nav/50 focus:outline-none" />
            <span className="text-ink-soft">€ hors taxes</span>
          </div>
          {!prixSaisi && <span className="mt-1 block text-xs text-[#86672f]">Hypothèse de démonstration : remplacez-la par le prix moyen réel (chiffre d&apos;affaires hébergement divisé par les nuitées).</span>}
        </label>
        <button
          disabled={!modifie || enCours}
          onClick={() =>
            demarrer(async () => {
              await enregistrerCanaux(c, p);
              setOk(true);
              setTimeout(() => setOk(false), 2000);
            })
          }
          className="bouton disabled:opacity-40"
        >
          {ok ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />} {ok ? "Enregistré" : "Enregistrer ces valeurs"}
        </button>
      </div>
      <div className="bg-cream/60 p-6">
        <p className="text-xs font-medium text-taupe">Ce que coûtent les plateformes, {saison}</p>
        <p className="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">{eur.format(cout)}</p>
        <p className="mt-2 text-sm text-ink-soft">
          {fmt.format(nuiteesOta)} nuitées × {eur.format(p)} × {String(c).replace(".", ",")} %. L&apos;hiver précédent : {eur.format(coutN1)} pour {fmt.format(nuiteesOtaN1)} nuitées.
        </p>
        <div className="mt-6 border-t border-line pt-5">
          <label className="block">
            <span className="text-sm">
              Si <strong className="tabular-nums">{part} %</strong> des nuitées des plateformes passaient en direct
            </span>
            <input type="range" min={5} max={50} step={5} value={part} onChange={(e) => setPart(Number(e.target.value))} className="mt-2 w-full accent-[var(--maison-accent)]" />
          </label>
          <p className="mt-3 text-base font-semibold">
            {eur.format(gain)} de commission économisée, soit {fmt.format(Math.round((nuiteesOta * part) / 100))} nuitées vendues sans intermédiaire.
          </p>
          <p className="mt-2 text-xs text-ink-soft">Simulation. Le coût des campagnes pour obtenir ce report n&apos;est pas déduit.</p>
        </div>
      </div>
    </div>
  );
}
