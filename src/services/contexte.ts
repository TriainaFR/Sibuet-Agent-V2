import "server-only";
import { today } from "@/lib/dates";
import type { Contexte, Source } from "@/lib/engine/calcul";
import type { DonneesAsterio, Releve, SourceId } from "@/lib/types";
import { depot } from "@/stockage/depot";
import { lireMaison, lireMarches, lireParametres, lireSaisie, lireSujets, lireVacances } from "./reference";

// Assemble le contexte de calcul : connaissance + dernier relevé de chaque source + saisie du client.
// Un relevé fictif n'est pris que si le mode « données fictives » est activé.

function dernier<T>(source: SourceId, fictifs: boolean, date: string): Source<T> | null {
  const d = depot();
  const cles = d.listerReleves(source).filter((c) => c.slice(0, 10) <= date).reverse();
  for (const cle of cles) {
    const r = d.lireReleve<T>(source, cle) as Releve<T> | null;
    if (!r) continue;
    if (r.mode === "fictif" && !fictifs) continue;
    return { donnees: r.donnees, collecte_le: r.collecte_le, mode: r.mode, origine: r.origine };
  }
  return null;
}

export function construireContexte(date = today()): Contexte {
  const { donneesFictives } = lireParametres();
  const sujets = lireSujets();
  // Un relevé de réservations vide signifie « fichier retiré » : on revient aux saisies et estimations.
  const asterio = dernier<DonneesAsterio>("asterio", donneesFictives, date);
  return {
    date,
    maison: lireMaison(sujets.maison),
    marches: lireMarches(),
    sujets: sujets.sujets,
    vacances: lireVacances().marches,
    semrush: dernier("semrush", donneesFictives, date),
    gsc: dernier("gsc", donneesFictives, date),
    neige: dernier("meteo_historique", donneesFictives, date),
    prevision: dernier("meteo_prevision", donneesFictives, date),
    agenda: dernier("agenda", donneesFictives, date),
    envois: dernier("newsletters", donneesFictives, date),
    asterio: asterio && (asterio.donnees.otb.length || Object.keys(asterio.donnees.delais).length) ? asterio : null,
    perfNl: dernier("newsletters_perf", donneesFictives, date),
    ads: dernier("google_ads", donneesFictives, date),
    saisie: lireSaisie(),
  };
}
