import { readFileSync, statSync } from "node:fs";
import Papa from "papaparse";
import type { DonneesAsterio, DonneesGsc, Envoi, LigneSemrush, MarcheId, SourceId } from "@/lib/types";
import type { ContexteCollecte, Connecteur } from "./types";
import { releve } from "./types";

// Connecteurs « import » : en attendant les accès API, ils lisent l'export déposé
// dans data/depot/<source>/. Un nouveau fichier produit un nouveau relevé daté.

function dernierFichierNouveau(ctx: ContexteCollecte, source: SourceId, dossier: string) {
  const fichiers = ctx.depot.listerDepot(dossier);
  const dernier = fichiers.at(-1);
  if (!dernier) return null;
  const precedent = ctx.depot.lireReleve(source);
  const mtime = statSync(dernier.chemin).mtime.toISOString();
  if (precedent && !ctx.forcer && precedent.horodatage >= mtime) return null;
  return dernier;
}

const csv = (chemin: string) =>
  Papa.parse<Record<string, string>>(readFileSync(chemin, "utf8"), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() }).data;

export const semrush: Connecteur = {
  id: "semrush",
  nom: "Demande de recherche (Semrush)",
  categorie: "demande",
  cadence: "chaque mois",
  statut: "import",
  apporte: "Volumes, tendance sur 12 mois et pics par requête, pour six bases pays (fr, uk, ch, be, nl, us).",
  pourBrancher: "Clé API Semrush (rapports phrase_fullsearch et phrase_these). En attendant : déposer l'export CSV dans data/depot/semrush/.",
  async collecter(ctx) {
    const f = dernierFichierNouveau(ctx, "semrush", "semrush");
    if (!f) return null;
    const lignes: LigneSemrush[] = csv(f.chemin).map((r) => ({
      requete: r.keyword ?? r.requete,
      base: r.database ?? r.base,
      volume: Number(r.volume_mensuel_moyen ?? r.volume) || 0,
      tendance: Object.fromEntries(Object.entries(r).filter(([k]) => /^\d{4}-\d{2}$/.test(k)).map(([k, v]) => [k, Number(v)])),
    }));
    ctx.journal(`semrush : ${lignes.length} requêtes importées depuis ${f.nom}`);
    return releve("semrush", ctx.date, "import", `Export Semrush ${f.nom}`, `${lignes.length} requêtes`, { lignes }, lignes.map((l) => ({
      source: "semrush" as const, type: "demande" as const, maison: ctx.maison.id, marche: null, sujet: null, semaine_sejour: null, cle: "volume", valeur: l.volume, valeur_texte: l.requete, observe_le: ctx.date, detail: { base: l.base },
    })));
  },
};

export const gsc: Connecteur = {
  id: "gsc",
  nom: "Ce que le site capte (Search Console)",
  categorie: "captation",
  cadence: "chaque lundi",
  statut: "import",
  apporte: "Impressions, clics et position par requête et par page, sur 12 mois.",
  pourBrancher: "Compte de service Google en lecture sur sc-domain:lodgepark.com (API Search Analytics). Déjà branché chez Jérôme via le connecteur ga4-gsc. En attendant : déposer un export CSV (requete, impressions, clics, position) dans data/depot/gsc/.",
  async collecter(ctx) {
    const f = dernierFichierNouveau(ctx, "gsc", "gsc");
    if (!f) return null;
    const precedent = ctx.depot.lireReleve<DonneesGsc>("gsc");
    const requetes: DonneesGsc["requetes"] = { ...(precedent?.donnees.requetes ?? {}) };
    for (const r of csv(f.chemin)) {
      const q = (r.requete ?? r.query ?? "").toLowerCase();
      if (!q) continue;
      requetes[q] = { impressions: Number(r.impressions) || 0, clics: Number(r.clics ?? r.clicks) || 0, position: Number(r.position) || null };
    }
    ctx.journal(`search console : ${Object.keys(requetes).length} requêtes après import de ${f.nom}`);
    return releve("gsc", ctx.date, "import", `Export Search Console ${f.nom}`, `${Object.keys(requetes).length} requêtes suivies`, {
      ...(precedent?.donnees ?? { site: ctx.maison.site, propriete: ctx.maison.gsc ?? "", periode: ["", ""], pages_par_sujet: {} }),
      requetes,
    });
  },
};

export const newsletters: Connecteur = {
  id: "newsletters",
  nom: "Calendrier des newsletters (client)",
  categorie: "plan client",
  cadence: "chaque saison",
  statut: "import",
  apporte: "Envois prévus par maison : date, cible (clients ou agences), thème, base. Le plan est complété ou déplacé, jamais ignoré.",
  pourBrancher: "Calendrier 2026-2027 arrêté par Sibuet (le fichier reçu reconduit 2025-2026 sans mise à jour). Déposer un CSV (date;cible;maison;theme;base) dans data/depot/newsletters/.",
  async collecter(ctx) {
    const f = dernierFichierNouveau(ctx, "newsletters", "newsletters");
    if (!f) return null;
    const envois: Envoi[] = Papa.parse<Record<string, string>>(readFileSync(f.chemin, "utf8"), { header: true, skipEmptyLines: true, delimiter: ";" }).data.map((r) => ({
      date: r.date,
      cible: r.cible === "agences" ? "agences" : "clients",
      maison: r.maison,
      theme: r.theme,
      base: r.base,
    }));
    ctx.journal(`newsletters : ${envois.length} envois importés`);
    return releve("newsletters", ctx.date, "import", `Calendrier client ${f.nom}`, `${envois.length} envois`, { statut: "Calendrier transmis par le client", envois });
  },
};

export const asterio: Connecteur = {
  id: "asterio",
  nom: "Réservations (PMS Asterio)",
  categorie: "réservations",
  cadence: "chaque lundi",
  statut: "à brancher",
  fictif: true,
  apporte: "Nuitées déjà réservées par semaine et par marché contre l'an dernier, délais de réservation réels. Le facteur besoin et la mesure finale.",
  pourBrancher: "Interface OnSite V3 à créer par Septeo dans Asterio (login dédié), avec une brique d'agrégation : seuls des comptages par semaine, marché et canal sont conservés, rien de nominatif. En attendant : charger l'export des réservations (une ligne par réservation) depuis « Vos données », ou déposer un export déjà agrégé en CSV dans data/depot/asterio/ (delais.csv : marche;delai_q1;delai_med;delai_q3 et otb.csv : sujet;marche;otb;otb_n1).",
  async collecter(ctx) {
    const fichiers = ctx.depot.listerDepot("asterio");
    const delaisF = fichiers.filter((f) => f.nom.startsWith("delais")).at(-1);
    const otbF = fichiers.filter((f) => f.nom.startsWith("otb")).at(-1);
    if (delaisF || otbF) {
      const precedent = ctx.depot.lireReleve("asterio");
      const mtime = Math.max(...[delaisF, otbF].filter(Boolean).map((f) => statSync(f!.chemin).mtimeMs));
      if (!precedent || precedent.mode === "fictif" || ctx.forcer || precedent.horodatage < new Date(mtime).toISOString()) {
        const donnees: DonneesAsterio = { delais: {}, otb: [] };
        for (const r of delaisF ? Papa.parse<Record<string, string>>(readFileSync(delaisF.chemin, "utf8"), { header: true, delimiter: ";", skipEmptyLines: true }).data : []) {
          const med = Number(r.delai_med);
          if (med) donnees.delais[r.marche as MarcheId] = { q1: Number(r.delai_q1) || med * 0.6, med, q3: Number(r.delai_q3) || med * 1.6 };
        }
        for (const r of otbF ? Papa.parse<Record<string, string>>(readFileSync(otbF.chemin, "utf8"), { header: true, delimiter: ";", skipEmptyLines: true }).data : []) {
          donnees.otb.push({ sujet: r.sujet, marche: r.marche as MarcheId, otb: Number(r.otb) || 0, otb_n1: Number(r.otb_n1) || 0 });
        }
        ctx.journal(`asterio : export agrégé importé (${Object.keys(donnees.delais).length} délais, ${donnees.otb.length} lignes de remplissage)`);
        return releve("asterio", ctx.date, "import", "Export Asterio agrégé (data/depot/asterio)", `${donnees.otb.length} lignes de remplissage`, donnees);
      }
      return null;
    }
    return null;
  },
};

/**
 * Historique des réservations : exports Asterio « nuitées » (un fichier par hôtel ou un seul),
 * déposés dans data/depot/asterio-historique/. Agrégés à l'import, jamais conservés tels quels.
 * Produit aussi le relevé asterio de la maison pilote (délais mesurés) pour le calcul.
 */
export const asterioHistorique: Connecteur = {
  id: "asterio_historique",
  nom: "Historique des réservations (exports Asterio)",
  categorie: "réservations",
  cadence: "à chaque export",
  statut: "import",
  apporte: "Nuitées par maison, saison, pays, canal et mois ; délais réels par pays ; rythme de remplissage. Toutes les maisons.",
  pourBrancher:
    "Export Asterio « nuitées » (hôtel, date de réservation, date de nuitée, canal, segment, chambres, pays, personnes), à déposer dans data/depot/asterio-historique/ ou depuis Vos données. Pour le remplissage à date, étendre les nuits jusqu'à la fin de la saison.",
  async collecter(ctx) {
    const fichiers = ctx.depot.listerDepot("asterio-historique").filter((f) => /\.xlsx$/i.test(f.nom) && !f.nom.startsWith("~$"));
    if (!fichiers.length) return null;
    const precedent = ctx.depot.lireReleve("asterio_historique");
    const recent = Math.max(...fichiers.map((f) => statSync(f.chemin).mtimeMs));
    if (precedent && !ctx.forcer && precedent.horodatage >= new Date(recent).toISOString()) {
      ctx.journal("historique Asterio : aucun nouvel export");
      return null;
    }
    const { importerExportsAsterio, enregistrerHistorique } = await import("@/services/asterio-historique");
    const { lireMaisons } = await import("@/services/reference");
    const { maisons, pilote } = lireMaisons();
    const h = await importerExportsAsterio(fichiers.map((f) => ({ nom: f.nom, contenu: readFileSync(f.chemin) })), maisons, pilote);
    // Les deux relevés (historique et maison pilote) sont écrits ici ; la routine n'a rien d'autre à enregistrer.
    const origine = enregistrerHistorique(h, fichiers.map((f) => f.nom), pilote);
    ctx.journal(`historique Asterio : ${h.lignes} lignes, ${h.maisons.length} maisons (${origine})`);
    return null;
  },
};
