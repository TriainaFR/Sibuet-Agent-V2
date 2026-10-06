"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { today } from "@/lib/dates";
import { releve } from "@/connecteurs/types";
import type { Decision, DonneesAsterio, Marche, Resultat, SaisieClient } from "@/lib/types";
import { construireContexte } from "@/services/contexte";
import { agregerReservations } from "@/services/reservations";
import { lireDecisions, lireParametres, lireResultats, lireSaisie, saisieVide } from "@/services/reference";
import { lancerRoutine } from "@/services/routine";
import { depot } from "@/stockage/depot";

// Actions serveur. Elles sont protégées par le proxy (src/proxy.ts) dès que APP_PASSWORD est défini.

const rafraichir = () => revalidatePath("/", "layout");

const schemaSaisie = z.object({
  ouverture: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  fermeture: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  ouv: z.string().max(6),
  clic: z.string().max(6),
  acces_google_ads: z.boolean(),
  acces_meta: z.boolean(),
  delais: z.record(z.string(), z.string().max(5)),
  rempl: z.record(z.string(), z.enum(["inconnu", "bas", "normal", "plein"])),
});

export async function enregistrerSaisie(valeurs: Omit<SaisieClient, "saisi_le" | "maison">) {
  const v = schemaSaisie.parse(valeurs);
  const saisie: SaisieClient = { ...lireSaisie(), ...v, delais: v.delais as SaisieClient["delais"], saisi_le: today() };
  depot().ecrireEtat("saisie_client", saisie);
  rafraichir();
  return { persistant: depot().persistant };
}

export async function revenirAuxEstimations() {
  depot().ecrireEtat("saisie_client", saisieVide());
  rafraichir();
}

export async function deciderActivation(cle: string, etat: Decision["etat"], par: string, commentaire = "") {
  z.string().max(80).parse(cle);
  const decisions = lireDecisions();
  decisions[cle] = { etat, par: par.slice(0, 60) || "Équipe marketing", le: today(), commentaire: commentaire.slice(0, 500) };
  depot().ecrireEtat("decisions", decisions);
  rafraichir();
}

export async function enregistrerResultat(r: Resultat) {
  const resultats = lireResultats().filter((x) => x.activationCle !== r.activationCle);
  depot().ecrireEtat("resultats", [...resultats, { ...r, commentaire: r.commentaire.slice(0, 500) }]);
  rafraichir();
}

export async function basculerDonneesFictives(actif: boolean) {
  depot().ecrireEtat("parametres", { ...lireParametres(), donneesFictives: actif });
  if (actif) await lancerRoutine({ sources: ["asterio", "newsletters_perf", "google_ads"] });
  rafraichir();
}

export async function lancerRoutineAction(rapide: boolean) {
  const { resume, lignes } = await lancerRoutine({ rapide });
  rafraichir();
  return { numero: resume.numero, alertes: resume.alertes.length, lignes };
}

/** Recalibrage validé : l'hypothèse de délai du marché (donnée de référence) prend la valeur observée. */
export async function appliquerDelai(marche: string, semaines: string) {
  const ref = depot().lireReference<{ source: string; marches: Marche[] }>("marches.json", { source: "", marches: [] });
  const valeur = Number(semaines);
  if (!(valeur > 0 && valeur < 60)) return;
  depot().ecrireReference("marches.json", {
    ...ref,
    marches: ref.marches.map((m) => (m.id === marche ? { ...m, delai_semaines: valeur, recalibre_le: today() } : m)),
  });
  rafraichir();
}

/** Remplit des résultats fictifs pour montrer la boucle de mesure (mode démonstration uniquement). */
export async function exempleMesure(cles: string[]) {
  const existants = lireResultats();
  const exemples: Resultat[] = cles.slice(0, 4).map((cle, i) => ({
    activationCle: cle,
    mesure_le: today(),
    kpi: cle.endsWith(":crm") ? "Réservations directes à J+10" : cle.endsWith(":seo") ? "Clics organiques à 8 semaines" : "Réservations attribuées",
    valeur: [42, 310, 18, 9][i],
    cible: [35, 400, 20, 12][i],
    pickup_vs_n1: [12, -6, 4, -14][i],
    methode: i === 1 ? "proxy GA4" : "fenêtre de dates",
    fait: i !== 3,
    commentaire: "Exemple fictif de démonstration.",
  }));
  depot().ecrireEtat("resultats", [...existants.filter((r) => !cles.includes(r.activationCle)), ...exemples]);
  rafraichir();
}

/**
 * Chargement d'un fichier de réservations (export PMS, Excel ou CSV).
 * Le fichier est lu en mémoire et agrégé : seuls des comptages par marché et par sujet sont enregistrés,
 * jamais les lignes ni le fichier lui-même.
 */
export async function importerReservations(_: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, message: "Choisissez un fichier Excel (.xlsx) ou CSV." };
  if (!/\.(xlsx|csv|txt)$/i.test(fichier.name)) return { ok: false, message: "Format non pris en charge : enregistrez le fichier en .xlsx ou .csv." };
  if (fichier.size > 7 * 1024 * 1024) return { ok: false, message: "Fichier trop lourd (7 Mo au plus). Exportez seulement les colonnes utiles." };
  try {
    const ctx = construireContexte();
    const { donnees, resume } = await agregerReservations(Buffer.from(await fichier.arrayBuffer()), fichier.name, ctx);
    const nom = fichier.name.slice(0, 120);
    depot().ecrireReleve(
      releve("asterio", today(), "import", `Fichier de réservations chargé : ${nom}`, `${resume.retenues} réservations, ${Object.keys(donnees.delais).length} délais, ${donnees.otb.length} lignes de remplissage`, donnees),
    );
    rafraichir();
    return { ok: true, message: `${resume.retenues} réservations prises en compte sur ${resume.lignes}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lecture du fichier impossible." };
  }
}

export async function retirerReservations() {
  depot().ecrireReleve(releve<DonneesAsterio>("asterio", today(), "import", "Fichier de réservations retiré", "aucune réservation", { delais: {}, otb: [] }));
  rafraichir();
}
