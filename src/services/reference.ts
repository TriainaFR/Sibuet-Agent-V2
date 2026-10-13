import "server-only";
import { depot } from "@/stockage/depot";
import type { Decision, Maison, Marche, Parametres, Resultat, ResumeCalcul, SaisieClient, SujetDef, TraceDepot, VacancesMarche } from "@/lib/types";

// Accès à la connaissance (référence) et à l'état (décisions), via le dépôt.

export const MAISON_PILOTE = "lodge-park";
export const SAISON = "hiver-2026-2027";

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
export function lireSujets(maison = MAISON_PILOTE): FichierSujets {
  return depot().lireReference<FichierSujets>(`sujets/${maison}_${SAISON}.json`, { maison, saison: "", version: "", note: "", sujets: [] });
}

export function lireVacances(): { note: string; marches: VacancesMarche[] } {
  return depot().lireReference("vacances_scolaires_2026-2027.json", { note: "", marches: [] as VacancesMarche[] });
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
