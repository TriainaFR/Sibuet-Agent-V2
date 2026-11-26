import "server-only";
import { addDays, today } from "@/lib/dates";
import type { Contexte, Source } from "@/lib/engine/calcul";
import type { DonneesAsterio, Envoi, Evenement, HistoriqueAsterio, HistoriqueMaison, Releve, SourceId } from "@/lib/types";
import { depot } from "@/stockage/depot";
import type { AnalyseMarches } from "@/lib/engine/marches";
import { dateDeTravail, lireMaison, lireMarches, lireParametres, lireSaisie, lireSaisons, lireSujets, lireVacances, saisieVide, saisonActive, saisonCourante } from "./reference";

// Assemble le contexte de calcul : connaissance + dernier relevé de chaque source + saisie du client.
// Un relevé fictif n'est pris que si le mode « données fictives » est activé.

/** Dernier relevé d'une source, à une date donnée (null : le plus récent, sans filtre de date). */
function dernier<T>(source: SourceId, fictifs: boolean, date: string | null): Source<T> | null {
  const d = depot();
  const cles = d.listerReleves(source).filter((c) => date === null || c.slice(0, 10) <= date).reverse();
  for (const cle of cles) {
    const r = d.lireReleve<T>(source, cle) as Releve<T> | null;
    if (!r) continue;
    if (r.mode === "fictif" && !fictifs) continue;
    return { donnees: r.donnees, collecte_le: r.collecte_le, mode: r.mode, origine: r.origine };
  }
  return null;
}

const anMoins = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
const anMoinsTexte = (t: string) => t.replace(/\b(20\d\d)\b/g, (x) => String(Number(x) - 1));

/**
 * Contexte de calcul d'une saison.
 * Saison en cours : derniers relevés à la date du jour, saisie du client.
 * Saison rejouée : l'agent tel qu'il aurait travaillé à une date passée. Réservations connues à cette date
 * seulement (le moteur ne compte que celles prises avant), plan d'envois de la saison, profils de demande
 * Google les plus récents ; ni agenda ni prévision météo, qui n'existent pas pour cette date.
 */
export function construireContexte(date?: string, saisonId?: string): Contexte {
  const { donneesFictives } = lireParametres();
  const saison = (saisonId && lireSaisons().saisons.find((s) => s.id === saisonId)) || (saisonId ? saisonCourante() : saisonActive());
  const jour = date ?? dateDeTravail(saison);
  const sujets = lireSujets(undefined, saison.id);
  const historique = historiqueMaison(sujets.maison, saison.rejeu ? null : jour);

  if (saison.rejeu) {
    const envois = dernier<{ envois: Envoi[]; statut: string }>("newsletters", false, null);
    const nuits = historique?.donnees.mensuel.filter((m) => m.mois >= saison.debut.slice(0, 7) && m.mois <= saison.fin.slice(0, 7) && m.nuitees > 0) ?? [];
    const ouverture = historique?.donnees.detail?.filter(([n]) => n >= saison.debut && n <= saison.fin).map(([n]) => n).sort() ?? [];
    return {
      saison,
      analyse: lireAnalyse(),
      historique,
      date: jour,
      maison: lireMaison(sujets.maison),
      marches: lireMarches(),
      sujets: sujets.sujets,
      vacances: lireVacances(saison.id).marches,
      semrush: dernier("semrush", donneesFictives, null),
      gsc: dernier("gsc", donneesFictives, null),
      neige: dernier("meteo_historique", donneesFictives, null),
      prevision: null,
      agenda: agendaRamene(),
      envois: envois
        ? {
            ...envois,
            donnees: {
              statut: "Plan d'envois 2025-2026 de Sibuet, tel que reçu le 16 sept. 2026.",
              envois: envois.donnees.envois.map((e) => ({ ...e, date: anMoins(e.date), theme: anMoinsTexte(e.theme) })),
            },
          }
        : null,
      // Pas de relevé agrégé : le besoin vient du détail par nuit, limité aux réservations prises avant la date.
      asterio: null,
      perfNl: dernier("newsletters_perf", donneesFictives, null),
      ads: dernier("google_ads", donneesFictives, null),
      saisie: { ...saisieVide(sujets.maison), ouverture: nuits.length ? (ouverture[0] ?? "") : "", fermeture: nuits.length ? (ouverture.at(-1) ?? "") : "" },
    };
  }

  // Un relevé de réservations vide signifie « fichier retiré » : on revient aux saisies et estimations.
  const asterio = dernier<DonneesAsterio>("asterio", donneesFictives, jour);
  return {
    saison,
    analyse: lireAnalyse(),
    historique,
    date: jour,
    maison: lireMaison(sujets.maison),
    marches: lireMarches(),
    sujets: sujets.sujets,
    vacances: lireVacances(saison.id).marches,
    semrush: dernier("semrush", donneesFictives, jour),
    gsc: dernier("gsc", donneesFictives, jour),
    neige: dernier("meteo_historique", donneesFictives, jour),
    prevision: dernier("meteo_prevision", donneesFictives, jour),
    agenda: dernier("agenda", donneesFictives, jour),
    envois: dernier("newsletters", donneesFictives, jour),
    asterio: asterio && (asterio.donnees.otb.length || Object.keys(asterio.donnees.delais).length) ? asterio : null,
    perfNl: dernier("newsletters_perf", donneesFictives, jour),
    ads: dernier("google_ads", donneesFictives, jour),
    saisie: lireSaisie(),
  };
}

/** Historique des réservations (exports Asterio agrégés), toutes maisons. */
export function lireHistorique(date: string | null = today()): Source<HistoriqueAsterio> | null {
  const h = dernier<HistoriqueAsterio>("asterio_historique", false, date);
  // Un relevé sans maison signifie « historique retiré ».
  return h && h.donnees.maisons.length ? h : null;
}

/** Historique d'une maison, au format attendu par le moteur. */
export function historiqueMaison(id: string, date: string | null = today()): Source<HistoriqueMaison> | null {
  const h = lireHistorique(date);
  const m = h?.donnees.maisons.find((x) => x.id === id);
  return h && m ? { ...h, donnees: m } : null;
}

/** Analyse par marché (Semrush, Search Console, GA4, mots-clés par langue). */
export function lireAnalyse(): AnalyseMarches | null {
  return depot().lireReference<AnalyseMarches | null>("analyse_marches.json", null);
}

/**
 * Agenda de la station pour une saison rejouée : le dernier relevé (saison suivante), dates ramenées
 * de 364 jours (même jour de la semaine). Les événements de Megève sont récurrents : village de Noël,
 * parade, descente aux flambeaux, Grande Odyssée.
 */
function agendaRamene(): Source<{ evenements: Evenement[] }> | null {
  const a = dernier<{ evenements: Evenement[] }>("agenda", false, null);
  if (!a) return null;
  return {
    ...a,
    origine: `${a.origine}, dates de la saison suivante ramenées d'un an (événements récurrents)`,
    donnees: { ...a.donnees, evenements: a.donnees.evenements.map((e) => ({ ...e, debut: addDays(e.debut, -364), fin: addDays(e.fin, -364) })) },
  };
}
