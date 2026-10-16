import type { CanalGroupe } from "./types";

// Direction artistique : identité de chaque maison (relevée sur son site) et palettes des graphiques.
// Les valeurs de couleur vivent dans src/app/globals.css ([data-maison]) ; ce module les décrit
// pour la page /charte et fournit les palettes de données.

export interface IdentiteMaison {
  id: string;
  nom: string;
  site: string;
  couleurs: { nom: string; hex: string; role: string }[];
  serif: { nom: string; equivalent: string };
  sans: string;
  esprit: string;
}

export const IDENTITES: IdentiteMaison[] = [
  {
    id: "groupe",
    nom: "Maisons & Hôtels Sibuet",
    site: "maisonsethotels-sibuet.com",
    couleurs: [
      { nom: "Brun", hex: "#4c3327", role: "accent, boutons" },
      { nom: "Taupe", hex: "#aa9b8e", role: "second accent" },
      { nom: "Greige", hex: "#aea79f", role: "bandeaux, pied de page" },
      { nom: "Ardoise", hex: "#616365", role: "texte courant du site" },
      { nom: "Ivoire", hex: "#f6f5f3", role: "fond" },
    ],
    serif: { nom: "Garamond Premier Pro Display", equivalent: "EB Garamond" },
    sans: "Source Sans Pro",
    esprit: "L'art de vivre à la française : capitales espacées, angles droits, beaucoup d'air.",
  },
  {
    id: "lodge-park",
    nom: "Lodge Park",
    site: "lodgepark.com",
    couleurs: [
      { nom: "Bleu nuit", hex: "#0f182a", role: "accent, texte" },
      { nom: "Cognac", hex: "#a46c45", role: "second accent (cuir du lodge)" },
      { nom: "Lin", hex: "#ebe8df", role: "fond" },
      { nom: "Lin foncé", hex: "#e6e1d7", role: "surfaces" },
    ],
    serif: { nom: "Cardo", equivalent: "Cardo" },
    sans: "Metropolis (Source Sans dans l'outil)",
    esprit: "Repaire chic et feutré : bleu des tissus, cuir, bois sombre.",
  },
  {
    id: "fermes-de-marie",
    nom: "Les Fermes de Marie",
    site: "fermesdemarie.com",
    couleurs: [
      { nom: "Brun", hex: "#4c3327", role: "accent" },
      { nom: "Brun profond", hex: "#251209", role: "texte" },
      { nom: "Taupe", hex: "#aa9b8e", role: "bandeaux" },
      { nom: "Ivoire", hex: "#f6f5f3", role: "fond" },
    ],
    serif: { nom: "Garamond Premier Pro Display", equivalent: "EB Garamond" },
    sans: "Source Sans Pro",
    esprit: "Le hameau de chalets : bois, laine, lumière douce.",
  },
  {
    id: "hotel-mont-blanc",
    nom: "Hôtel Mont-Blanc",
    site: "hotelmontblanc.com",
    couleurs: [
      { nom: "Vert sapin", hex: "#193805", role: "accent, texte" },
      { nom: "Vert mousse", hex: "#34512f", role: "second accent" },
      { nom: "Crème", hex: "#fff3e6", role: "fond" },
    ],
    serif: { nom: "Sozzani", equivalent: "DM Serif Display" },
    sans: "Termina (Source Sans dans l'outil)",
    esprit: "Terriblement élégant : vert anglais, contrastes francs.",
  },
  {
    id: "bastide-de-marie",
    nom: "La Bastide de Marie",
    site: "labastidedemarie.com",
    couleurs: [
      { nom: "Bleu lavande", hex: "#425e7a", role: "accent" },
      { nom: "Taupe", hex: "#aa9b8e", role: "second accent" },
      { nom: "Ivoire", hex: "#f6f5f3", role: "fond" },
    ],
    serif: { nom: "Garamond", equivalent: "EB Garamond" },
    sans: "Source Sans Pro",
    esprit: "Une bastide dans la vigne : bleu de volet, pierre, Luberon.",
  },
  {
    id: "villa-marie",
    nom: "Villa Marie Saint-Tropez",
    site: "villamarie-saint-tropez.com",
    couleurs: [
      { nom: "Orange Riviera", hex: "#c4390a", role: "accent (version lisible)" },
      { nom: "Orange vif", hex: "#e74011", role: "second accent" },
      { nom: "Ardoise", hex: "#616365", role: "texte" },
      { nom: "Blanc cassé", hex: "#f8f6f3", role: "fond" },
    ],
    serif: { nom: "Garamond", equivalent: "EB Garamond" },
    sans: "Source Sans Pro",
    esprit: "Une douce ambiance de Riviera : soleil, pins, terre cuite.",
  },
  {
    id: "gyp-sea",
    nom: "Gyp Sea Hotel",
    site: "gypsea-stbarth.com",
    couleurs: [
      { nom: "Bleu lagon", hex: "#305371", role: "accent, texte" },
      { nom: "Bleu ciel", hex: "#5f9bc6", role: "second accent" },
      { nom: "Sable", hex: "#f1ece6", role: "fond" },
    ],
    serif: { nom: "Playfair Display", equivalent: "Playfair Display" },
    sans: "Albert Sans (Source Sans dans l'outil)",
    esprit: "Tropical chic : lagon, sable, bois flotté.",
  },
  {
    id: "chalets",
    nom: "Chalets et propriétés",
    site: "maisonsethotels-sibuet.com/proprietes",
    couleurs: [
      { nom: "Brun chalet", hex: "#6b5544", role: "accent" },
      { nom: "Taupe", hex: "#aa9b8e", role: "second accent" },
      { nom: "Sable", hex: "#eeebe6", role: "fond" },
    ],
    serif: { nom: "Garamond Premier Pro Display", equivalent: "EB Garamond" },
    sans: "Source Sans Pro",
    esprit: "Les chalets privés, avec les services de l'hôtel.",
  },
];

/** Canaux de vente : palette catégorielle validée (contrôle daltonisme, ordre fixe). */
export const CANAUX: { id: CanalGroupe; nom: string; couleur: string; direct: boolean }[] = [
  { id: "direct", nom: "Direct (téléphone, e-mail)", couleur: "#2f66a3", direct: true },
  { id: "site", nom: "Site web", couleur: "#cf6f35", direct: true },
  { id: "ota", nom: "Plateformes (Booking, Expedia…)", couleur: "#2f9a80", direct: false },
  { id: "agences", nom: "Agences", couleur: "#d9a521", direct: false },
  { id: "groupes", nom: "Groupes", couleur: "#a6588f", direct: false },
];

/** Série de comparaison (année précédente) : greige, en retrait de l'accent de la maison. */
export const COULEUR_N1 = "#b9b2a9";
