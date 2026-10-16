import "server-only";
import { depot } from "@/stockage/depot";
import { today } from "@/lib/dates";
import type { Decision, Maison, Marche, Parametres, Resultat, ResumeCalcul, SaisieClient, Saison, SujetDef, TraceDepot, VacancesMarche } from "@/lib/types";

// Accès à la connaissance (référence) et à l'état (décisions), via le dépôt.

export const MAISON_PILOTE = "lodge-park";

// ── Saisons ──────────────────────────────────────────────────────────────────
// La saison en cours se calcule à la date du jour. Une saison passée peut être rejouée :
// l'agent la recalcule à une date passée, avec les réservations réellement enregistrées à cette date.

export function lireSaisons(): { courante: string; saisons: Saison[] } {
  return depot().lireReference("saisons.json", { courante: "hiver-2026-2027", saisons: [] as Saison[] });
}

/** Saison en cours (celle de la routine du lundi). */
export function saisonCourante(): Saison {
  const { courante, saisons } = lireSaisons();
  return saisons.find((s) => s.id === courante) ?? { id: courante, nom: "Hiver 2026-2027", debut: "2026-12-01", fin: "2027-04-30", rejeu: false };
}

/** Saison affichée (paramètre), par défaut la saison rejouée si elle existe, sinon la saison en cours. */
export function saisonActive(): Saison {
  const { saisons } = lireSaisons();
  const choisie = lireParametres().saison;
  return saisons.find((s) => s.id === choisie) ?? saisons.find((s) => s.rejeu) ?? saisonCourante();
}

/** Date de calcul : la date de rejeu pour une saison passée, sinon aujourd'hui. */
export function dateDeTravail(saison = saisonActive()): string {
  if (!saison.rejeu) return today();
  return lireParametres().dateRejeu ?? saison.dateDefaut ?? today();
}

export function lireMarches(): Marche[] {
  return depot().lireReference<{ marches: Marche[] }>("marches.json", { marches: [] }).marches;
}

export function lireMaisons(): { pilote: string; maisons: Maison[] } {
  return depot().lireReference("maisons.json", { pilote: MAISON_PILOTE, maisons: [] as Maison[] });
}

export function lireMaison(id = MAISON_PILOTE): Maison {
  return lireMaisons().maisons.find((m) => m.id === id)!;
}

export interface FichierSujets {
  maison: string;
  saison: string;
  version: string;
  note: string;
  sujets: SujetDef[];
}
export function lireSujets(maison = MAISON_PILOTE, saison = saisonActive().id): FichierSujets {
  return depot().lireReference<FichierSujets>(`sujets/${maison}_${saison}.json`, { maison, saison: "", version: "", note: "", sujets: [] });
}

export function lireVacances(saison = saisonActive().id): { note: string; marches: VacancesMarche[] } {
  return depot().lireReference(`vacances_scolaires_${saison.replace(/^hiver-/, "")}.json`, { note: "", marches: [] as VacancesMarche[] });
}

export const saisieVide = (maison = MAISON_PILOTE): SaisieClient => ({
  saisi_le: null,
  maison,
  ouverture: "",
  fermeture: "",
  ouv: "",
  clic: "",
  acces_google_ads: false,
  acces_meta: false,
  delais: {},
  rempl: {},
});

export function lireSaisie(): SaisieClient {
  return { ...saisieVide(), ...depot().lireEtat<Partial<SaisieClient>>("saisie_client", {}) };
}

export function lireDecisions(): Record<string, Decision> {
  return depot().lireEtat<Record<string, Decision>>("decisions", {});
}

export function lireParametres(): Parametres {
  return { donneesFictives: false, ...depot().lireEtat<Partial<Parametres>>("parametres", {}) };
}

export function lireResultats(): Resultat[] {
  return depot().lireEtat<Resultat[]>("resultats", []);
}

/** Exports déposés sur la page Sources (en-têtes seulement), du plus récent au plus ancien. */
export function lireDepots(): TraceDepot[] {
  return depot().lireEtat<TraceDepot[]>("depots", []);
}

export function lireCalculs(): ResumeCalcul[] {
  return depot().lireEtat<ResumeCalcul[]>("calculs", []);
}

export function lireJournal(): { horodatage: string; lignes: string[] }[] {
  return depot().lireEtat("journal_routine", [] as { horodatage: string; lignes: string[] }[]);
}
