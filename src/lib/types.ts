// Types partagés par la config, le moteur de recommandation et l'interface.

export type MarketCode = "FR" | "GB" | "NL" | "BE" | "CH" | "DE" | "IT" | "US" | "BR";

export type DestinationId = "megeve" | "menerbes" | "saint-tropez" | "saint-barth";

export type HotelId =
  | "les-fermes-de-marie"
  | "lodge-park"
  | "hotel-mont-blanc"
  | "la-bastide-de-marie"
  | "villa-marie-saint-tropez"
  | "gyp-sea-hotel";

/** Une maison du groupe. Infos reprises de maisonsethotels-sibuet.com. */
export interface Hotel {
  id: HotelId;
  name: string;
  shortName: string;
  destination: DestinationId;
  tagline: string;
  rooms: number;
  roomsLabel: string;
  description: string;
  url: string;
  image: string;
  /** Couleur d'accent utilisée dans le calendrier. */
  color: string;
  /** Maison incluse dans le périmètre de la démo. */
  demo: boolean;
  /** Périodes d'ouverture (à confirmer avec Chloé / Clara). */
  seasons: { label: string; start: string; end: string }[];
  /** Prix moyen par nuit (simulation). */
  avgNightlyRate: number;
  /** Répartition des nationalités (simulation, en %). */
  marketMix: Partial<Record<MarketCode, number>>;
  highlights: string[];
}

export interface Destination {
  id: DestinationId;
  name: string;
  region: string;
  lat: number;
  lon: number;
  image: string;
  tourismOffice: { name: string; url: string };
}

export interface Market {
  code: MarketCode;
  name: string;
  adjective: string;
  flag: string;
  language: string;
  /** Fenêtre de réservation médiane de référence (jours) — sert à la simulation. */
  baseWindowDays: number;
  profile: string;
}

export type LeverId =
  | "instagram"
  | "google-ads"
  | "seo"
  | "newsletter"
  | "crm"
  | "rp"
  | "linkedin";

export type MomentKind =
  | "saison"
  | "evenement-local"
  | "marronnier"
  | "vacances"
  | "meteo"
  | "b2b-rh";

export type Resonance = "internationale" | "nationale" | "locale";

/** Un « moment » = un sujet de communication potentiel. */
export interface Moment {
  id: string;
  title: string;
  kind: MomentKind;
  /** Maisons concernées. */
  hotels: HotelId[];
  start: string;
  end: string;
  resonance: Resonance;
  /** Marchés pour lesquels le sujet a du sens (vide = tous les marchés de la maison). */
  markets?: MarketCode[];
  angle: string;
  objective: string;
  keywords: string[];
  levers: LeverId[];
  source: string;
  sourceUrl?: string;
  /** "confirmé" si la date est vérifiée, "à vérifier" sinon. */
  confidence: "confirmé" | "à vérifier";
  /**
   * "sejour" (défaut) : les dates sont celles du séjour, le moteur recule le lancement selon les fenêtres de réservation.
   * "communication" : les dates sont celles de la prise de parole (bons cadeaux, premières neiges, recrutement…).
   */
  timing?: "sejour" | "communication";
  /** Généré automatiquement par le moteur (vacances, météo). */
  generated?: boolean;
}

export type DataOrigin = "réel" | "simulé" | "éditorial";

export interface Evidence {
  label: string;
  detail: string;
  origin: DataOrigin;
  source: string;
}

export interface MarketPlan {
  market: MarketCode;
  /** Part de la nationalité sur la période (%). */
  share: number;
  sample: number;
  windowMedian: number;
  windowP25: number;
  windowP75: number;
  /** Période pendant laquelle ce marché réserve pour le moment. */
  decisionStart: string;
  decisionEnd: string;
}

export interface Action {
  lever: LeverId;
  date: string;
  endDate?: string;
  title: string;
  details: string[];
  markets?: MarketCode[];
}

export type FicheStatus = "à venir" | "à lancer" | "urgent" | "en cours";

export interface Fiche {
  id: string;
  moment: Moment;
  hotelId: HotelId;
  eventStart: string;
  eventEnd: string;
  launchDate: string;
  status: FicheStatus;
  priority: { score: number; level: "haute" | "moyenne" | "basse"; reasons: string[] };
  markets: MarketPlan[];
  actions: Action[];
  evidence: Evidence[];
  kpis: string[];
}
