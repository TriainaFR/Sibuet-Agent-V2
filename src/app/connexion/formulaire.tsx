"use client";

import { useActionState } from "react";
import { seConnecter } from "./actions";

const champ = "mt-1.5 w-full border border-line bg-white px-3.5 py-3 text-sm outline-none transition focus:border-ink";

export function FormulaireConnexion({ suite, avecIdentifiant }: { suite: string; avecIdentifiant: boolean }) {
  const [etat, action, enCours] = useActionState(seConnecter, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="suite" value={suite} />
      {avecIdentifiant && (
        <label className="block">
          <span className="eyebrow text-[0.62rem] text-taupe">Identifiant</span>
          <input name="identifiant" autoComplete="username" required className={champ} />
        </label>
      )}
      <label className="block">
        <span className="eyebrow text-[0.62rem] text-taupe">Mot de passe</span>
        <input name="mot_de_passe" type="password" autoComplete="current-password" required autoFocus={!avecIdentifiant} className={champ} />
      </label>
      {etat?.erreur && <p className="border-l-2 border-brick bg-brick/5 px-3 py-2 text-sm text-brick">{etat.erreur}</p>}
      <button disabled={enCours} className="bouton w-full !py-3.5">
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
