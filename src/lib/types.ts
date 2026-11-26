// Modèle de l'Agent Sibuet (cadrage de Jérôme Hoerlé, docs/cadrage/modele_donnees.md).
// Trois couches strictement séparées :
//  - données       : signaux datés, issus des connecteurs, jamais écrasés (data/signaux)
//  - connaissance  : référence, une seule version remplacée (data/reference)
//  - décisions     : calculs, validations, résultats (data/etat)

// ── Connaissance ─────────────────────────────────────────────────────────────

/** Identifiant de marché (data/reference/marches.json) : fr, uk, tr, us, ru, sa, be, ch, ae, gr, pt, it, br, il. */
export type MarcheId = string;

export interface Marche {
  id: MarcheId;
  nom: string;
  /** Pays tel qu'il apparaît dans les exports Asterio (« France », « Turquie »…). */
  pays: string;
  /** Langue des messages : fr ou en. */
  langue: string;
  /** Langue du pays (tr, ar, ru…), et si le site existe dans cette langue. */
  langue_locale?: string;
  langue_site?: boolean;
  region?: string;
  semrush_db: string;
  /** Délai de réservation médian, en semaines. Hypothèse tant qu'Asterio n'est pas branché. */
  delai_semaines: number;
  /** Marché proche : SEA, push et déclencheur neige plutôt que Meta. */
  court: boolean;
  couleur: string;
}

export interface Maison {
  id: string;
  nom: string;
  destination: string;
  tagline: string;
  capacite: string;
  site: string;
  image: string;
  pilote: boolean;
  base_de_marque: string;
  url?: string;
  gsc?: string;
  ga4?: string;
  point_meteo?: { lat: number; lon: number; altitude: number };
  agenda?: string;
  /** Nom de l'hôtel dans les exports Asterio. */
  asterio?: string;
  /** Nombre de chambres publié, pour le taux d'occupation. */
  chambres?: number;
  /** Saisons de la maison (jour et mois de début et de fin, « 12-01 » à « 04-30»). */
  saisons?: { nom: string; debut: string; fin: string }[];
  /** Ville et pays, pour la carte d'identité. */
  lieu?: string;
}

export type Famille = "saisonnier" | "evenementiel" | "declencheur" | "b2b";
export type Usage = "achat" | "sejour" | "veille";

export interface RequeteSujet {
  requete: string;
  base: string;
  usage: Usage;
}

export interface SujetDef {
  id: string;
  nom: string;
  famille: Famille;
  sejour?: { debut: string; fin: string };
  /** Sujet B2B : la fenêtre de décision est connue, le séjour ne l'est pas. */
  fenetre_fixe?: { debut: string; fin: string };
  /** La période d'un marché est celle de ses vacances scolaires portant l'un de ces noms. */
  periode_par_marche?: { vacances: string[] };
  marches?: MarcheId[];
  cibles: string;
  theme: string;
  angle: string;
  requetes: RequeteSujet[];
  evenements: string[];
  evenements_candidats?: string[];
  /** Thèmes des newsletters du plan client qui portent ce sujet. */
  envois: string[];
  legere?: boolean;
  conditionne_fermeture?: boolean;
  seuil_neige_5j_cm?: number;
  vocabulaire_marque?: string[];
  /** Photo d'illustration (public/). */
  image?: string;
  vocabulaire_interdit?: string[];
}

export interface VacancesMarche {
  id: MarcheId;
  nom: string;
  periodes: { nom: string; debut: string; fin: string }[];
  source: string;
  verifie: boolean;
  ecart_controle?: string;
}

// ── Données : signaux et relevés ─────────────────────────────────────────────

export type SourceId =
  | "meteo_prevision"
  | "meteo_historique"
  | "agenda"
  | "semrush"
  | "gsc"
  | "ga4"
  | "newsletters"
  | "newsletters_perf"
  | "vacances_controle"
  | "asterio"
  | "google_ads"
  | "meta_ads"
  | "instagram"
  | "asterio_historique";

export type ModeReleve = "réel" | "import" | "fictif";

/** Signal normalisé, au grain maison × semaine de séjour × marché (table signal du schéma). */
export interface Signal {
  source: SourceId;
  type: "demande" | "demande captée" | "contexte" | "contrainte" | "performance" | "besoin";
  maison: string | null;
  marche: MarcheId | null;
  sujet: string | null;
  semaine_sejour: string | null;
  cle: string;
  valeur: number | null;
  valeur_texte: string | null;
  observe_le: string;
  detail?: unknown;
}

/** Relevé daté produit par une collecte. Jamais écrasé. */
export interface Releve<T = unknown> {
  source: SourceId;
  collecte_le: string;
  horodatage: string;
  mode: ModeReleve;
  origine: string;
  resume: string;
  donnees: T;
  signaux: Signal[];
}

export interface LigneSemrush {
  requete: string;
  base: string;
  volume: number;
  tendance: Record<string, number>;
}

export interface DonneesGsc {
  site: string;
  propriete: string;
  periode: [string, string];
  requetes: Record<string, { impressions: number; clics: number; position: number | null }>;
  pages_par_sujet: Record<string, { page: string; impressions: number; clics: number; position: number; decision: string }[]>;
}

export interface Evenement {
  nom: string;
  debut: string;
  fin: string;
  type: string;
  confirme: boolean;
  source: string;
  categorie?: string | null;
  cle?: string;
}

export interface Envoi {
  date: string;
  cible: "clients" | "agences";
  maison: string;
  theme: string;
  base: string;
  /** Langues de l'envoi (français par défaut). */
  langues?: string[];
}

export interface ResumeReservations {
  fichier: string;
  lignes: number;
  retenues: number;
  ignorees: { raison: string; nombre: number }[];
  colonnes: Record<string, string>;
  arrivees: [string, string] | null;
  parPays: { pays: string; marche: MarcheId | null; reservations: number; nuitees: number; personnesMoyennes: number | null; delaiMedianSemaines: number }[];
  typesChambres: { type: string; part: number }[];
  /** Villes d'origine les plus fréquentes (comptage seulement), base de la météo au départ. */
  villes?: { ville: string; pays: string; reservations: number }[];
  /** Nuitées-chambres réservées à date par sujet, tous marchés suivis, chaque réservation comptée une fois. */
  remplissage?: { sujet: string; otb: number; otb_n1: number }[];
  chambresMoyennes: number | null;
}

export interface DonneesAsterio {
  delais: Partial<Record<MarcheId, { q1: number; med: number; q3: number; n?: number }>>;
  otb: { sujet: string; marche: MarcheId; otb: number; otb_n1: number }[];
  /** Synthèse agrégée du fichier chargé (aucune ligne nominative). */
  resume?: ResumeReservations;
}

export interface PerfNewsletter {
  date: string;
  theme: string;
  langue: string;
  envois: number;
  ouvertures: number;
  clics: number;
  resa_j10: number;
}

export interface DonneesAds {
  campagnes: { nom: string; marche: MarcheId; sujet: string | null; budget: number; clics: number; conversions: number; cpa: number }[];
}

// ── Décisions ────────────────────────────────────────────────────────────────

export type Canal = "crm" | "seo" | "sea" | "meta" | "social" | "agences" | "declencheur";

export type Origine = "estimation" | "saisi" | "mesuré" | "fictif";

export interface Facteur {
  valeur: number;
  manquant: boolean;
  origine: Origine | null;
  detail: string;
  source: string;
}

export type Verdict =
  | "Pas de demande sur ce marché"
  | "Rien n'est prévu, à créer"
  | "Déjà prévu, on garde"
  | "On envoie trop tard"
  | "Prévu trop tôt"
  | "Seules les agences sont touchées";

/** Opportunité : un sujet × un marché × une fenêtre de séjour, à une date de calcul. */
export interface Opportunite {
  cle: string;
  marche: MarcheId;
  libelle: string;
  sejour: { debut: string; fin: string } | null;
  fenetre: { debut: string; fin: string } | null;
  delai: { mediane: number; q1: number; q3: number; origine: Origine; source?: string };
  facteurs: { demande: Facteur; visibilite: Facteur; besoin: Facteur };
  score: number;
  urgence: number;
  ordre: number;
  type: "offensive" | "défensive" | "correctif";
  close: boolean;
  demandeDetectee: boolean;
  dateProposee: string | null;
  envoi: Envoi | null;
  verdict: Verdict;
  canalADate: string;
  vacances: string | null;
}

export type StatutCode =
  | "a_lancer"
  | "a_creer"
  | "existant"
  | "bloque"
  | "suspendu"
  | "a_confirmer"
  | "veille"
  | "declencher"
  | "ferme"
  | "en_retard";

export interface Statut {
  code: StatutCode;
  libelle: string;
}

export interface Vague {
  numero: number;
  debut: string;
  fin: string;
  marches: MarcheId[];
  libelleMarches: string;
  note: string;
  statut: Statut;
}

/** Activation : une opportunité traduite en action sur un canal, en vagues. */
export interface Activation {
  cle: string;
  sujetId: string;
  canal: Canal;
  type: "offensive" | "défensive" | "correctif";
  objectif: string;
  cible: string;
  message: string;
  semantique: string[];
  interdits: string[];
  assets: string;
  declencheur: string;
  justification: string;
  changement: string;
  effort: string;
  kpi: string;
  ligneBase: string;
  vagues: Vague[];
  statut: Statut;
}

export type EtatValidation = "brouillon" | "validee" | "reportee" | "rejetee";

export interface Decision {
  etat: EtatValidation;
  par: string;
  le: string;
  commentaire?: string;
}

export type Remplissage = "inconnu" | "bas" | "normal" | "plein";

export interface SujetCalcule {
  def: SujetDef;
  opportunites: Opportunite[];
  activations: Activation[];
  ouvert: boolean;
  remplissage: Remplissage;
  score: number;
  urgence: number;
  ordre: number;
  ecart: number | null;
  fenetre: { debut: string; fin: string } | null;
  pourquoi: string;
  maintenant: string;
  changement: string;
  manque: string[];
  premiereAction: string | null;
  evenementsLies: Evenement[];
  autresEvenements: Evenement[];
  /** Rythme de l'an dernier sur la même période (historique des réservations). */
  reference: ReferenceRythme | null;
}

export interface ReferenceRythme {
  periode: { debut: string; fin: string };
  /** Date de l'an dernier correspondant à aujourd'hui. */
  aLaDate: string;
  final: number;
  aDate: number;
  part: number | null;
  courbe: { date: string; part: number }[];
  parPays: { pays: string; final: number; part: number | null }[];
}

export interface ActionAFaire {
  date: string;
  quoi: string;
  /** Phrase d'action lisible : « Envoyer la newsletter aux Américains ». */
  titre: string;
  sujetId: string;
  sujetNom: string;
  activationCle: string;
  canal: Canal;
  marches: MarcheId[];
  statut: Statut;
  enRetard: boolean;
}

export interface Alerte {
  type: "evenement" | "fenetre" | "vide" | "neige" | "plan" | "rang";
  titre: string;
  detail: string;
  sujetId?: string;
  gravite: "info" | "action";
}

export interface ResumeCalcul {
  numero: number;
  date: string;
  horodatage: string;
  sources: Record<string, string>;
  sujets: { id: string; ordre: number; score: number; urgence: number; besoin: number[]; fenetresOuvertes: string[] }[];
  alertes: Alerte[];
}

/** Saisie du client (formulaire « Vos données »), au format de l'export de la maquette de Jérôme. */
export interface SaisieClient {
  saisi_le: string | null;
  maison: string;
  ouverture: string;
  fermeture: string;
  ouv: string;
  clic: string;
  acces_google_ads: boolean;
  acces_meta: boolean;
  delais: Partial<Record<MarcheId, string>>;
  rempl: Record<string, Remplissage>;
}

export interface Resultat {
  activationCle: string;
  mesure_le: string;
  kpi: string;
  valeur: number | null;
  cible: number | null;
  pickup_vs_n1: number | null;
  methode: "lien" | "fenêtre de dates" | "proxy GA4";
  fait: boolean;
  commentaire: string;
}

export interface Parametres {
  donneesFictives: boolean;
  /** Saison affichée : la saison en cours, ou une saison passée rejouée. */
  saison?: string;
  /** Date à laquelle la saison passée est rejouée. */
  dateRejeu?: string;
  /** Marché choisi dans le sélecteur global (null : tous les marchés). */
  marche?: string | null;
  /** Vue par canal : taux de commission des plateformes et prix moyen d'une nuitée, saisis par l'équipe. */
  commissionOta?: number;
  prixMoyenNuitee?: number;
}

/** Saison de la maison pilote (data/reference/saisons.json). */
export interface Saison {
  id: string;
  nom: string;
  debut: string;
  fin: string;
  /** Saison passée, recalculée à une date passée avec les réservations connues à cette date. */
  rejeu: boolean;
  dateDefaut?: string;
  datesProposees?: string[];
}

/** Trace d'un export déposé pour une source pas encore branchée : en-têtes seulement, aucune donnée. */
export interface TraceDepot {
  source: string;
  fichier: string;
  taille: number;
  colonnes: string[];
  recu_le: string;
}

// ── Historique des réservations (exports Asterio agrégés) ────────────────────
// Agrégé à l'import : aucune ligne de réservation n'est conservée, seulement des totaux
// par maison, saison, pays, canal et mois. Seule la maison pilote garde un détail par nuit
// (nuit, date de réservation, pays, chambres), sans rien de nominatif, pour le rythme de remplissage.

/** Quartiles d'un délai de réservation, en jours, et nombre de séjours observés. */
export interface Quartiles {
  q1: number;
  med: number;
  q3: number;
  n: number;
}

export type CanalGroupe = "direct" | "site" | "ota" | "agences" | "groupes" | "autre";

export interface PaysHistorique {
  pays: string;
  /** Marché suivi par l'agent auquel le pays se rattache. */
  marches: MarcheId[];
  nuitees: number;
  delai: Quartiles | null;
  /** Part des nuitées avec enfants. */
  familles: number | null;
  /** Part des nuitées vendues en direct (téléphone, e-mail, site). */
  direct: number;
}

export interface SaisonHistorique {
  id: string;
  nom: string;
  debut: string;
  fin: string;
  /** Partie de la saison couverte par l'export. */
  couverte: [string, string];
  complete: boolean;
  nuitees: number;
  nuitsOuvertes: number;
  occupation: number | null;
  /** Part des nuitées vendues en direct (téléphone, e-mail, site). */
  direct: number;
  canaux: Partial<Record<CanalGroupe, number>>;
  delai: Quartiles | null;
  familles: number | null;
  personnesParChambre: number | null;
  pays: { pays: string; nuitees: number }[];
  /** Saison précédente du même nom, sur la même fenêtre de dates. */
  precedente: { id: string; nom: string; nuitees: number; memeFenetre: number | null } | null;
  /** Part des nuitées déjà réservées j jours avant la nuit (rythme de remplissage). */
  rythme: { j: number; part: number }[];
}

export interface HistoriqueMaison {
  id: string;
  /** Fenêtre des nuits couvertes par l'export. */
  fenetre: [string, string];
  nomAsterio: string;
  chambres: number | null;
  nuits: [string, string];
  nuitees: number;
  sejours: number;
  mensuel: { mois: string; nuitees: number; direct: number; nuitsOuvertes: number }[];
  saisons: SaisonHistorique[];
  pays: PaysHistorique[];
  /** Part des nuitées dont le pays est inconnu. */
  paysInconnu: number;
  canaux: Partial<Record<CanalGroupe, number>>;
  /** Nuitées par mois de séjour (ligne, 1 à 12) et mois de réservation (colonne, 1 à 12). */
  calendrierAchat: number[][];
  delai: Quartiles | null;
  /** Détail par nuit pour la maison pilote : [nuit, réservée le, pays, chambres, canal]. */
  /** Détail par nuit (maison pilote) : [nuit, réservée le, pays, chambres, canal, 1 si groupe]. */
  detail?: [string, string, string, number, CanalGroupe, number?][];
  /** Délais par marché, en jours, pondérés par les nuitées, hors groupes, deux derniers hivers (décembre à mars). */
  delaisMarches?: Record<string, { q1: number; med: number; q3: number; nuitees: number; medAvecGroupes: number | null; hivers: string[] }>;
}

export interface HistoriqueAsterio {
  /** Fenêtre des nuits couvertes par l'export. */
  nuits: [string, string];
  reservations: [string, string];
  fichiers: string[];
  lignes: number;
  maisons: HistoriqueMaison[];
  /** Hôtels présents dans l'export mais inconnus de la référence. */
  inconnus: string[];
}
