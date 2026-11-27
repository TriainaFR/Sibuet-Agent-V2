"use client";

import { useActionState } from "react";
import { seConnecter } from "./actions";

const champ = "mt-1.5 h-9 w-full rounded-lg border border-line bg-white px-3 text-sm shadow-[0_1px_2px_rgba(28,28,26,0.04)] outline-none transition focus:border-nav/50 focus:ring-3 focus:ring-nav/10";

export function FormulaireConnexion({ suite, avecIdentifiant }: { suite: string; avecIdentifiant: boolean }) {
  const [etat, action, enCours] = useActionState(seConnecter, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="suite" value={suite} />
      {avecIdentifiant && (
        <label className="block">
          <span className="text-[0.8125rem] font-medium text-ink">Identifiant</span>
          <input name="identifiant" autoComplete="username" required className={champ} />
        </label>
      )}
      <label className="block">
        <span className="text-[0.8125rem] font-medium text-ink">Mot de passe</span>
        <input name="mot_de_passe" type="password" autoComplete="current-password" required autoFocus={!avecIdentifiant} className={champ} />
      </label>
      {etat?.erreur && <p className="rounded-lg bg-brick/8 px-3 py-2 text-sm text-brick">{etat.erreur}</p>}
      <button disabled={enCours} className="bouton !h-9 w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
