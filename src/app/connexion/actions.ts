"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSION, DUREE_SESSION_JOURS, creerJeton, verifier } from "@/lib/session";

export async function seConnecter(_etat: { erreur: string } | null, form: FormData) {
  const identifiant = String(form.get("identifiant") ?? "").trim();
  const motDePasse = String(form.get("mot_de_passe") ?? "");
  const suite = String(form.get("suite") ?? "/");

  const compte = verifier(identifiant, motDePasse);
  // Journal de connexion (visible dans les logs Railway) : identifiant, résultat, adresse. Jamais le mot de passe.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "inconnue").split(",")[0].trim();
  console.log(`[connexion] ${compte ? "réussie" : "échec"} identifiant=${JSON.stringify(identifiant.slice(0, 40))} ip=${ip} agent=${JSON.stringify((h.get("user-agent") ?? "").slice(0, 80))}`);
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
