// Ce que l'agent fait de chaque source, en langage clair (page Sources, schéma « De vos données à vos actions »).
// Contenu descriptif uniquement : l'état réel de chaque source (dernier relevé, fichier chargé) est ajouté par la page.

import type { SourceId } from "./types";

export type EtatFlux = "branche" | "pret" | "a_fournir";
export type SortieId = "afaire" | "calendrier" | "fiches" | "alertes" | "briefs" | "mesure" | "portraits";
export type FamilleFlux = "vous" | "google" | "contexte" | "campagnes";

export interface SourceFlux {
  id: string;
  nom: string;
  famille: FamilleFlux;
  /** La question à laquelle la source répond, en une ligne. */
  question: string;
  recupere: string[];
  jamais?: string[];
  pourquoi: string;
  traitement: string[];
  /** Exemple de lecture, présenté comme une illustration. */
  exemple: string;
  nourrit: SortieId[];
  etat: EtatFlux;
  etatDetail: string;
  cadence: string;
  /** Dépôt de fichier : import réel des réservations, ou trace (en-têtes seulement) pour les autres. */
  depot: "reservations" | "trace" | null;
  formats?: string;
  /** Connecteur correspondant, pour afficher le dernier relevé. */
  connecteurs?: SourceId[];
}

export const FAMILLES: Record<FamilleFlux, string> = {
  vous: "Ce que vous savez",
  google: "Ce que Google voit",
  contexte: "Ce qui se passe dehors",
  campagnes: "Vos campagnes",
};

export const LIBELLE_ETAT: Record<EtatFlux, string> = {
  branche: "Branchée",
  pret: "Prête, accès à ouvrir",
  a_fournir: "À fournir par vous",
};

export const ETAPES_AGENT = [
  { titre: "Collecte", texte: "Chaque lundi à 6 h, l'agent relève chaque source. Chaque relevé est daté et conservé, jamais écrasé." },
  { titre: "Croise", texte: "Pour chaque sujet de la saison et chaque pays, il calcule la fenêtre où les clients réservent." },
  { titre: "Classe", texte: "Il mesure la demande, ce qui reste à gagner sur Google et ce qui reste à vendre, puis l'urgence." },
  { titre: "Propose", texte: "Il en tire des actions datées, par vagues de pays, sans jamais ignorer votre propre calendrier." },
  { titre: "Vous validez", texte: "Rien ne part sans vous. Une action validée produit un brief prêt à transmettre." },
];

export const SORTIES: { id: SortieId; nom: string; texte: string; lien: string }[] = [
  { id: "afaire", nom: "À faire, 6 semaines", texte: "La liste de la semaine, par ordre d'urgence.", lien: "/" },
  { id: "calendrier", nom: "Calendrier de la saison", texte: "Quand agir, pays par pays, sujet par sujet.", lien: "/calendrier" },
  { id: "fiches", nom: "Fiches sujet", texte: "Pourquoi maintenant, ce qui change, par pays.", lien: "/sujets" },
  { id: "alertes", nom: "Alertes du lundi", texte: "Neige annoncée, nouvel événement, fenêtre qui s'ouvre.", lien: "/" },
  { id: "briefs", nom: "Briefs prêts à valider", texte: "Newsletter, page, annonce : le texte de départ.", lien: "/sujets" },
  { id: "mesure", nom: "Mesure et recalibrage", texte: "Ce qui a marché, et les hypothèses corrigées.", lien: "/mesure" },
  { id: "portraits", nom: "Portraits des maisons", texte: "Saisons, pays, délais et canaux, maison par maison.", lien: "/maisons" },
];

export const SOURCES_FLUX: SourceFlux[] = [
  {
    id: "reservations",
    nom: "Vos réservations",
    famille: "vous",
    question: "Qui réserve, d'où, et combien de temps avant ?",
    recupere: ["Date de réservation", "Nuits du séjour", "Pays et ville d'origine", "Canal de vente", "Nombre de chambres", "Adultes et enfants", "Type de chambre"],
    jamais: ["Nom", "E-mail", "Téléphone", "Numéro de réservation", "Montant payé"],
    pourquoi:
      "C'est la seule source qui dit ce qui est vraiment vendu. Le nombre de guests distingue un couple d'une famille ou d'un groupe d'amis, et donc le message à leur envoyer. La ville d'origine permet de savoir quel temps il faisait chez le client quand il a réservé.",
    traitement: [
      "Délai réel entre réservation et arrivée, pays par pays : il fixe la date de chaque envoi.",
      "Nuitées déjà vendues contre l'an dernier à la même date : un sujet en retard passe devant.",
      "Composition des séjours par pays : famille pendant les vacances scolaires, couple en janvier.",
      "Ville d'origine : rapprochée de la météo du jour de la réservation (voir La météo au départ).",
      "Canal de vente : la part vendue en direct, maison par maison, et ce qu'il reste à reprendre aux plateformes.",
      "Le fichier est lu puis oublié : seuls des totaux par pays et par semaine sont gardés.",
    ],
    exemple:
      "Aux fêtes 2025, la plupart des Britanniques avaient réservé leur séjour deux mois avant : la newsletter anglaise doit partir mi-octobre. En novembre, elle arriverait trop tard.",
    nourrit: ["afaire", "calendrier", "fiches", "mesure", "portraits"],
    etat: "a_fournir",
    etatDetail: "Les exports Asterio « nuitées » suffisent, un fichier par hôtel. La ville d'origine reste à ajouter à l'extraction pour la météo au départ.",
    cadence: "chaque semaine, ou à chaque export",
    depot: "reservations",
    formats: "Exports Asterio ou tout export Excel ou CSV",
    connecteurs: ["asterio_historique", "asterio"],
  },
  {
    id: "newsletters",
    nom: "Vos newsletters",
    famille: "vous",
    question: "Qu'avez-vous déjà prévu, et qu'est-ce qui a marché ?",
    recupere: ["Date d'envoi", "Cible (clients ou agences)", "Langue", "Thème", "Ouvertures et clics", "Réservations dans les 10 jours"],
    jamais: ["Adresses e-mail", "Listes de contacts"],
    pourquoi: "Votre calendrier est complété ou déplacé, jamais ignoré. Et les résultats passés servent de point de comparaison.",
    traitement: [
      "Chaque envoi prévu est comparé à la fenêtre d'achat de chaque pays : on garde, on avance, ou on crée.",
      "Les taux d'ouverture et de clic deviennent la référence des prochains envois.",
    ],
    exemple: "L'envoi prévu mi-novembre pour la Suisse tombe en pleine fenêtre des fêtes : il est gardé tel quel. Rien n'est prévu pour l'anglais : l'agent propose de le créer.",
    nourrit: ["afaire", "calendrier", "briefs", "mesure"],
    etat: "a_fournir",
    etatDetail: "Le calendrier 2026-2027 arrêté et l'export de l'outil d'emailing.",
    cadence: "chaque mois",
    depot: "trace",
    formats: "Excel ou CSV exporté de l'outil d'emailing",
    connecteurs: ["newsletters", "newsletters_perf"],
  },
  {
    id: "maison",
    nom: "La vie de la maison",
    famille: "vous",
    question: "Quand êtes-vous ouverts, et que se passe-t-il chez vous ?",
    recupere: ["Dates d'ouverture et de fermeture", "Nouveautés (chambres, carte, spa)", "Événements internes", "Accès ouverts (Google Ads, Meta)"],
    pourquoi: "Un sujet hors période d'ouverture ne doit rien déclencher, et une nouveauté est souvent le meilleur angle d'un message.",
    traitement: ["Les sujets hors ouverture sont mis de côté.", "Les actions payantes restent en attente tant que l'accès n'est pas ouvert."],
    exemple: "Si la maison ouvre le 12 décembre, l'ouverture du sapin du 5 décembre sort de la liste des actions.",
    nourrit: ["afaire", "calendrier"],
    etat: "a_fournir",
    etatDetail: "Quelques champs à remplir dans Vos données, sans fichier.",
    cadence: "quand ça change",
    depot: null,
  },
  {
    id: "semrush",
    nom: "Les recherches Google",
    famille: "google",
    question: "Combien de gens cherchent, quand, et depuis quel pays ?",
    recupere: ["Requêtes liées à chaque sujet", "Volume mensuel par pays", "Tendance sur 12 mois", "Mois de pic"],
    pourquoi: "La demande précède la réservation : elle dit quel sujet intéresse quel pays, et à quel moment.",
    traitement: ["Un sujet très cherché monte dans le classement.", "Le contenu doit être en ligne six semaines avant le pic de recherche."],
    exemple: "Les recherches d'hôtel à Megève pour Noël culminent en octobre côté britannique : la page dédiée doit être prête à la mi-septembre.",
    nourrit: ["fiches", "afaire", "calendrier"],
    etat: "pret",
    etatDetail: "Relevé déjà chargé. La clé API rendra la mise à jour automatique.",
    cadence: "chaque lundi",
    depot: "trace",
    formats: "Export CSV Semrush",
    connecteurs: ["semrush"],
  },
  {
    id: "gsc",
    nom: "Votre place sur Google",
    famille: "google",
    question: "Quand on cherche, est-ce qu'on vous trouve ?",
    recupere: ["Requêtes qui affichent votre site", "Position", "Clics et affichages", "Pays"],
    pourquoi: "Une forte demande où vous êtes mal placés, c'est le plus gros gain possible.",
    traitement: ["L'écart entre la demande et votre position devient le reste à gagner sur Google.", "Une page existante est mise à jour plutôt que recréée."],
    exemple: "Bien classés sur « Lodge Park Megève », absents sur « hôtel spa Megève » : l'agent propose de renforcer la page spa avant janvier.",
    nourrit: ["fiches", "afaire"],
    etat: "pret",
    etatDetail: "Relevé déjà chargé. Un compte de service en lecture le rendra automatique.",
    cadence: "chaque lundi",
    depot: "trace",
    formats: "Export CSV de la Search Console",
    connecteurs: ["gsc"],
  },
  {
    id: "ga4",
    nom: "Les visites du site",
    famille: "google",
    question: "Qui vient sur le site, et qui va jusqu'à réserver ?",
    recupere: ["Visites par pays", "Page d'arrivée", "Passage vers le moteur de réservation", "Réservations en ligne"],
    pourquoi: "Elles mesurent l'effet de chaque action, et donnent le poids réel de chaque pays en attendant les réservations.",
    traitement: ["Chaque action validée est mesurée sur ses visites et ses réservations.", "Les hypothèses par pays sont corrigées."],
    exemple: "Après la newsletter néerlandaise, les visites depuis les Pays-Bas vers la page fêtes ont-elles bougé ? La réponse arrive dans Mesure.",
    nourrit: ["mesure"],
    etat: "pret",
    etatDetail: "Accès en lecture à la propriété GA4, déjà identifiée.",
    cadence: "chaque lundi",
    depot: "trace",
    formats: "Export CSV ou Excel de GA4",
    connecteurs: ["ga4"],
  },
  {
    id: "meteo",
    nom: "La neige à Megève",
    famille: "contexte",
    question: "Va-t-il neiger, et cette semaine est-elle bien enneigée d'habitude ?",
    recupere: ["Neige prévue sur 16 jours", "Températures", "Neige des cinq dernières saisons, semaine par semaine"],
    pourquoi: "Une belle chute de neige déclenche des réservations de dernière minute chez les clients proches.",
    traitement: ["Au-delà de 20 cm annoncés sur 5 jours, une alerte propose un envoi flash Genève, Vaud et Lyon.", "Les semaines peu enneigées d'habitude sont signalées."],
    exemple: "30 cm annoncés pour le week-end : l'agent propose un message aux clients genevois le mardi pour une arrivée le vendredi.",
    nourrit: ["alertes", "afaire"],
    etat: "branche",
    etatDetail: "Source publique gratuite, relevée automatiquement.",
    cadence: "chaque jour en saison",
    depot: null,
    connecteurs: ["meteo_prevision", "meteo_historique"],
  },
  {
    id: "meteo_depart",
    nom: "La météo au départ",
    famille: "contexte",
    question: "Quel temps faisait-il chez le client quand il a réservé ?",
    recupere: ["Pays et ville d'origine de chaque réservation", "Pluie, soleil et température de cette ville, le jour de la réservation et les jours d'avant", "Les mêmes relevés à Megève au même moment"],
    jamais: ["Nom ou adresse du client : seule la ville est utilisée, et seuls des totaux par ville sont gardés"],
    pourquoi: "L'envie de montagne naît souvent sous un ciel gris. Croisée avec la date de réservation, la météo du départ dit quand un pays est le plus réceptif.",
    traitement: [
      "Chaque réservation passée est rapprochée du temps qu'il faisait dans son pays ce jour-là.",
      "Si un pays réserve nettement plus après quelques jours de pluie, l'agent en fait un déclencheur.",
      "Combiné à la neige de Megève : pluie au départ et neige fraîche à l'arrivée, c'est le moment d'envoyer.",
    ],
    exemple: "Si les Londoniens réservent davantage après trois jours de pluie, une semaine grise annoncée à Londres avec de la neige à Megève déclenche la campagne anglaise.",
    nourrit: ["alertes", "afaire", "mesure"],
    etat: "pret",
    etatDetail: "Source publique gratuite. Elle s'active dès que les réservations sont chargées avec leur ville d'origine.",
    cadence: "chaque jour",
    depot: null,
  },
  {
    id: "agenda",
    nom: "L'agenda de Megève",
    famille: "contexte",
    question: "Que se passe-t-il à Megève, et qu'est-ce qui est nouveau ?",
    recupere: ["Événements de la station", "Dates", "Catégorie", "Nouveautés d'une semaine à l'autre"],
    pourquoi: "Un événement donne une raison de venir à une date précise, et un angle de message.",
    traitement: ["Chaque événement est rattaché au sujet dont il partage les dates.", "Un événement nouveau ou déplacé déclenche une alerte."],
    exemple: "Un nouveau concert annoncé le 20 février est rattaché au sujet vacances d'hiver et apparaît dans le brief de la newsletter.",
    nourrit: ["alertes", "fiches", "briefs"],
    etat: "branche",
    etatDetail: "Relevé automatiquement sur le site de l'office de tourisme.",
    cadence: "chaque lundi",
    depot: null,
    connecteurs: ["agenda"],
  },
  {
    id: "vacances",
    nom: "Les vacances scolaires",
    famille: "contexte",
    question: "Quand chaque pays part-il en vacances ?",
    recupere: ["Vacances par pays et par zone (France A, B, C, Genève, Vaud, Belgique, Pays-Bas, Royaume-Uni)"],
    pourquoi: "Les familles réservent pour les vacances de leur zone : la fenêtre change d'un pays à l'autre.",
    traitement: ["Les sujets famille sont calés sur les vacances de chaque zone.", "Les écarts avec une source officielle sont signalés."],
    exemple: "La zone C part deux semaines après la zone A : l'envoi famille parisien part plus tard que le lyonnais.",
    nourrit: ["calendrier", "afaire"],
    etat: "branche",
    etatDetail: "Vérifiées sur les sites officiels, contrôlées automatiquement.",
    cadence: "une fois par an",
    depot: null,
    connecteurs: ["vacances_controle"],
  },
  {
    id: "google_ads",
    nom: "Google Ads",
    famille: "campagnes",
    question: "Combien coûte un client venu par l'annonce ?",
    recupere: ["Campagnes", "Budget", "Clics", "Réservations attribuées", "Coût par réservation"],
    pourquoi: "Pour savoir où l'annonce payante vaut le coup, et où le contenu gratuit suffit.",
    traitement: ["Les annonces sont proposées aux pays dont la fenêtre est ouverte.", "Le budget se fixe à partir de l'historique des campagnes."],
    exemple: "La campagne fêtes de l'an dernier a coûté plus cher en Belgique qu'en Suisse : la Suisse passe en premier cette année.",
    nourrit: ["afaire", "mesure"],
    etat: "a_fournir",
    etatDetail: "Un accès en lecture au compte Google Ads.",
    cadence: "chaque mois",
    depot: "trace",
    formats: "Export CSV ou Excel des campagnes",
    connecteurs: ["google_ads"],
  },
  {
    id: "meta",
    nom: "Meta et Instagram",
    famille: "campagnes",
    question: "Qui voit vos publications, et qu'est-ce qui les touche ?",
    recupere: ["Portée par pays", "Enregistrements et clics par publication", "Coût des campagnes"],
    pourquoi: "Indispensable pour les pays lointains (États-Unis, Royaume-Uni, Pays-Bas), qui réservent tôt et cherchent moins.",
    traitement: ["Les sujets qui font réagir remontent dans le classement.", "Les campagnes Meta sont proposées à l'ouverture des fenêtres lointaines."],
    exemple: "Les publications sur le spa sont les plus enregistrées en janvier : le sujet bien-être passe devant pour cette période.",
    nourrit: ["fiches", "afaire", "mesure"],
    etat: "a_fournir",
    etatDetail: "Un accès analyste au compte publicitaire et au compte Instagram professionnel.",
    cadence: "chaque mois",
    depot: "trace",
    formats: "Export de Meta Business Suite",
    connecteurs: ["meta_ads", "instagram"],
  },
];

/** Sources qui acceptent un dépôt « trace » (en-têtes seulement). */
export const SOURCES_TRACE = SOURCES_FLUX.filter((s) => s.depot === "trace").map((s) => s.id);
