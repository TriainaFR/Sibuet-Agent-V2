import type { Depot } from "@/stockage/depot";
import type { Maison, Releve, SourceId, SujetDef } from "@/lib/types";

/**
 * Connecteur : une source de signaux.
 *  - "branché"    : collecte réelle automatique (API publique, scraping autorisé)
 *  - "import"     : lit un export déposé dans data/depot/<source>/ (en attendant l'API)
 *  - "à brancher" : accès à obtenir ; en mode démo, peut produire des données fictives
 *
 * Pour brancher une API, il suffit de remplacer `collecter` par un appel réel
 * qui renvoie un `Releve` du même format : le moteur et l'interface ne changent pas.
 */
export interface Connecteur {
  id: SourceId;
  nom: string;
  categorie: "demande" | "captation" | "contexte" | "plan client" | "réservations" | "coûts" | "performance";
  cadence: string;
  statut: "branché" | "import" | "à brancher";
  apporte: string;
  /** Ce qu'il faut obtenir ou écrire pour le brancher pour de vrai. */
  pourBrancher: string;
  /** Produit des données fictives en mode démo. */
  fictif?: boolean;
  collecter(ctx: ContexteCollecte): Promise<Releve | null>;
}

export interface ContexteCollecte {
  date: string;
  rapide: boolean;
  fictif: boolean;
  forcer: boolean;
  maison: Maison;
  sujets: SujetDef[];
  depot: Depot;
  journal: (ligne: string) => void;
}

export function releve<T>(source: SourceId, date: string, mode: Releve["mode"], origine: string, resume: string, donnees: T, signaux: Releve["signaux"] = []): Releve<T> {
  return { source, collecte_le: date, horodatage: new Date().toISOString(), mode, origine, resume, donnees, signaux };
}
