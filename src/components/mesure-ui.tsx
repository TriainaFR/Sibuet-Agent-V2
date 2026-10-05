"use client";

import { Check, FlaskConical } from "lucide-react";
import { useState, useTransition } from "react";
import { appliquerDelai, enregistrerResultat, exempleMesure } from "@/app/actions";
import type { Resultat } from "@/lib/types";

const champ = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-greige";

export function FormResultat({ cle, kpi, existant, date }: { cle: string; kpi: string; existant?: Resultat; date: string }) {
  const [r, setR] = useState<Resultat>(
    existant ?? { activationCle: cle, mesure_le: date, kpi, valeur: null, cible: null, pickup_vs_n1: null, methode: "fenêtre de dates", fait: true, commentaire: "" },
  );
  const [enCours, demarrer] = useTransition();
  const [ok, setOk] = useState(false);
  const num = (s: string) => (s === "" ? null : Number(s));
  return (
    <form
      className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          await enregistrerResultat(r);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
    >
      <label className="text-xs text-ink-soft">
        Action faite
        <select value={r.fait ? "oui" : "non"} onChange={(e) => setR({ ...r, fait: e.target.value === "oui" })} className={`${champ} mt-1`}>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      </label>
      <label className="text-xs text-ink-soft">
        Mesuré le
        <input type="date" value={r.mesure_le} onChange={(e) => setR({ ...r, mesure_le: e.target.value })} className={`${champ} mt-1`} required />
      </label>
      <label className="text-xs text-ink-soft">
        Valeur de l&apos;indicateur
        <input type="number" value={r.valeur ?? ""} onChange={(e) => setR({ ...r, valeur: num(e.target.value) })} className={`${champ} mt-1`} />
      </label>
      <label className="text-xs text-ink-soft">
        Cible
        <input type="number" value={r.cible ?? ""} onChange={(e) => setR({ ...r, cible: num(e.target.value) })} className={`${champ} mt-1`} />
      </label>
      <label className="text-xs text-ink-soft">
        Remplissage vs N-1, %
        <input type="number" value={r.pickup_vs_n1 ?? ""} onChange={(e) => setR({ ...r, pickup_vs_n1: num(e.target.value) })} className={`${champ} mt-1`} />
      </label>
      <label className="text-xs text-ink-soft">
        Méthode d&apos;attribution
        <select value={r.methode} onChange={(e) => setR({ ...r, methode: e.target.value as Resultat["methode"] })} className={`${champ} mt-1`}>
          <option>fenêtre de dates</option>
          <option>lien</option>
          <option>proxy GA4</option>
        </select>
      </label>
      <label className="text-xs text-ink-soft sm:col-span-2 lg:col-span-5">
        Ce qui s&apos;est passé, ce qui l&apos;explique, ce qu&apos;on en retient
        <input value={r.commentaire} onChange={(e) => setR({ ...r, commentaire: e.target.value })} className={`${champ} mt-1`} />
      </label>
      <div className="flex items-end">
        <button disabled={enCours} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-brown px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-60">
          {ok ? <Check className="h-4 w-4" /> : null} Enregistrer
        </button>
      </div>
    </form>
  );
}

export function BoutonAppliquer({ marche, valeur }: { marche: string; valeur: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button disabled={enCours} onClick={() => demarrer(() => appliquerDelai(marche, valeur))} className="rounded-full bg-brown px-3 py-1 text-xs font-semibold text-white hover:bg-ink disabled:opacity-60">
      Valider et appliquer
    </button>
  );
}

export function BoutonExemple({ cles }: { cles: string[] }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button disabled={enCours || !cles.length} onClick={() => demarrer(() => exempleMesure(cles))} className="inline-flex items-center gap-1.5 rounded-full border border-brick/40 bg-white px-3.5 py-1.5 text-sm text-brick hover:bg-brick/5 disabled:opacity-50">
      <FlaskConical className="h-3.5 w-3.5" /> Remplir un exemple fictif
    </button>
  );
}
