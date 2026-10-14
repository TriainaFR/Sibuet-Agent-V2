"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSION, DUREE_SESSION_JOURS, creerJeton, verifier } from "@/lib/session";

export async function seConnecter(_etat: { erreur: string } | null, form: FormData) {
  const identifiant = String(form.get("identifiant") ?? "").trim();
  const motDePasse = String(form.get("mot_de_passe") ?? "");
  const suite = String(form.get("suite") ?? "/");

  const compte = verifier(identifiant, motDePasse);
  if (!compte) {
    // Petit délai pour freiner les essais répétés.
    await new Promise((r) => setTimeout(r, 800));
    return { erreur: "Identifiant ou mot de passe incorrect." };
  }

  (await cookies()).set(COOKIE_SESSION, await creerJeton(compte), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_SESSION_JOURS * 86_400,
  });
  // Seulement un chemin interne, jamais une adresse externe.
  redirect(suite.startsWith("/") && !suite.startsWith("//") ? suite : "/");
}

export async function seDeconnecter() {
  (await cookies()).delete(COOKIE_SESSION);
  redirect("/connexion");
}
