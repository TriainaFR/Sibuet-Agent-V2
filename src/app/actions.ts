"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatDate, today } from "@/lib/dates";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";
import { releve } from "@/connecteurs/types";
import { SOURCES_TRACE } from "@/lib/flux";
import type { Decision, DonneesAsterio, HistoriqueAsterio, Marche, Resultat, SaisieClient, TraceDepot } from "@/lib/types";
import { construireContexte } from "@/services/contexte";
import { agregerReservations } from "@/services/reservations";
import { enregistrerHistorique, estFichierAsterio, importerExportsAsterio } from "@/services/asterio-historique";
import { lireDecisions, lireDepots, lireMaisons, lireParametres, lireResultats, lireSaisie, saisieVide } from "@/services/reference";
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
  const fichiers = formData.getAll("fichier").filter((f): f is File => f instanceof File && f.size > 0);
  if (!fichiers.length) return { ok: false, message: "Choisissez un fichier Excel (.xlsx) ou CSV." };
  if (fichiers.some((f) => !/\.(xlsx|csv|txt)$/i.test(f.name))) return { ok: false, message: "Format non pris en charge : enregistrez les fichiers en .xlsx ou .csv." };
  if (fichiers.reduce((t, f) => t + f.size, 0) > 7 * 1024 * 1024) return { ok: false, message: "Fichiers trop lourds (7 Mo au plus en tout). Exportez seulement les colonnes utiles." };
  const fichier = fichiers[0];
  try {
    // Exports Asterio « nuitées » (un par hôtel, ou un seul) : historique de toutes les maisons.
    const contenus = await Promise.all(fichiers.map(async (f) => ({ nom: f.name.slice(0, 120), contenu: Buffer.from(await f.arrayBuffer()) })));
    if (/\.xlsx$/i.test(fichier.name) && (await estFichierAsterio(contenus[0].contenu))) {
      const { maisons, pilote } = lireMaisons();
      const h = await importerExportsAsterio(contenus, maisons, pilote);
      enregistrerHistorique(h, contenus.map((c) => c.nom), pilote);
      rafraichir();
      return {
        ok: true,
        message: `Historique chargé : ${h.maisons.length} maison${h.maisons.length > 1 ? "s" : ""}, nuits du ${formatDate(h.nuits[0], true)} au ${formatDate(h.nuits[1], true)}.${h.inconnus.length ? ` Hôtels non reconnus : ${h.inconnus.join(", ")}.` : ""}`,
      };
    }
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
  // Si les réservations viennent des exports Asterio, l'historique de toutes les maisons est retiré aussi.
  if (depot().lireReleve("asterio")?.origine.startsWith("Exports Asterio")) {
    depot().ecrireReleve(releve<HistoriqueAsterio>("asterio_historique", today(), "import", "Historique retiré", "aucune maison", { nuits: [today(), today()], reservations: [today(), today()], fichiers: [], lignes: 0, maisons: [], inconnus: [] }));
  }
  depot().ecrireReleve(releve<DonneesAsterio>("asterio", today(), "import", "Fichier de réservations retiré", "aucune réservation", { delais: {}, otb: [] }));
  rafraichir();
}

/**
 * Dépôt d'un export pour une source pas encore branchée (page Sources).
 * Seuls le nom du fichier, sa taille et ses en-têtes de colonnes sont gardés : de quoi préparer le connecteur
 * sur le vrai format, sans conserver aucune donnée.
 */
export async function deposerTrace(_: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const source = String(formData.get("source") ?? "");
  const fichier = formData.get("fichier");
  if (!SOURCES_TRACE.includes(source)) return { ok: false, message: "Source inconnue." };
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, message: "Choisissez un fichier." };
  if (!/\.(xlsx|csv|txt)$/i.test(fichier.name)) return { ok: false, message: "Format non pris en charge : enregistrez le fichier en .xlsx ou .csv." };
  if (fichier.size > 7 * 1024 * 1024) return { ok: false, message: "Fichier trop lourd (7 Mo au plus)." };
  try {
    const contenu = Buffer.from(await fichier.arrayBuffer());
    const lignes = /\.xlsx$/i.test(fichier.name)
      ? ((await readSheet(contenu)) as unknown[][]).slice(0, 10)
      : Papa.parse<string[]>(contenu.toString("utf8").replace(/^﻿/, ""), { preview: 10, skipEmptyLines: true }).data;
    // L'en-tête est la ligne la plus remplie parmi les premières (les exports ont parfois un titre au-dessus).
    const entete = [...lignes].sort((a, b) => b.filter((x) => String(x ?? "").trim()).length - a.filter((x) => String(x ?? "").trim()).length)[0] ?? [];
    const colonnes = entete.map((x) => String(x ?? "").trim().slice(0, 60)).filter(Boolean).slice(0, 40);
    const trace: TraceDepot = { source, fichier: fichier.name.slice(0, 120), taille: fichier.size, colonnes, recu_le: today() };
    depot().ecrireEtat("depots", [trace, ...lireDepots()].slice(0, 50));
    rafraichir();
    return {
      ok: true,
      message: `Fichier reçu, ${colonnes.length} colonnes reconnues. Le format est noté pour brancher la source à la mise en service ; le contenu n'est pas conservé.`,
    };
  } catch {
    return { ok: false, message: "Lecture du fichier impossible." };
  }
}
