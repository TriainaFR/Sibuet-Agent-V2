import { VOCABULAIRE_INTERDIT } from "@/lib/engine/regles";
import type { Canal, Origine } from "@/lib/types";

// Libellés de restitution : la page destinée au client n'affiche aucun chiffre d'indice.

export const urgenceLibelle = (u: number) => (u >= 0.85 ? "Élevée" : u >= 0.6 ? "Moyenne" : "Basse");
export const urgenceTon = (u: number) => (u >= 0.85 ? "fort" : u >= 0.6 ? "moyen" : "faible");

/** Intérêt = demande × reste à gagner en visibilité, ramené à l'échelle du score sans le besoin. */
export const interetLibelle = (demandeFoisVisibilite: number) => (demandeFoisVisibilite >= 0.48 ? "Haut" : demandeFoisVisibilite >= 0.28 ? "Moyen" : "Bas");

/** Reste à gagner sur Google : haut quand la maison est peu visible (même sens que l'urgence et l'intérêt). */
export const visibiliteLibelle = (ecart: number | null) => (ecart === null ? "Non mesuré" : ecart >= 0.75 ? "Haut" : ecart >= 0.45 ? "Moyen" : "Bas");
export const visibiliteExplication = (ecart: number | null) =>
  ecart === null ? "pas de requête suivie" : ecart >= 0.75 ? "la maison est peu ou pas visible" : ecart >= 0.45 ? "visible, mais peu cliquée" : "déjà bien placée";

export const origineLibelle: Record<Origine, string> = { estimation: "estimation", saisi: "saisi", mesuré: "mesuré", fictif: "fictif" };

export const canalLibelle: Record<Canal, string> = {
  crm: "Newsletter et CRM",
  seo: "Référencement et GEO",
  sea: "Google Ads",
  meta: "Meta Ads",
  social: "Instagram",
  agences: "Agences",
  declencheur: "Déclencheur neige",
};

export const canalCourt: Record<Canal, string> = { crm: "CRM", seo: "SEO", sea: "SEA", meta: "Meta", social: "Social", agences: "Agences", declencheur: "Neige" };

export const nombre = (n: number) => n.toLocaleString("fr-FR");

/** Contrôle des règles de forme (P0) : vocabulaire interdit, tiret long, dièse ou astérisque comme marqueur. */
export function controlerTexte(texte: string) {
  const problemes: string[] = [];
  // On ignore la ligne qui liste les termes interdits et les reprises entre guillemets d'objets d'envoi existants (P0).
  const bas = texte
    .split("\n")
    .filter((l) => !/interdit/i.test(l))
    .join("\n")
    .replace(/«[^»]*»/g, "")
    .toLowerCase();
  for (const mot of VOCABULAIRE_INTERDIT) if (bas.includes(mot)) problemes.push(`vocabulaire interdit : « ${mot} »`);
  if (/[—–]/.test(texte)) problemes.push("tiret long");
  if (/^\s*#/m.test(texte)) problemes.push("dièse en début de ligne");
  if (/\*/.test(texte)) problemes.push("astérisque");
  return problemes;
}

const ADJ_MARCHE: Record<string, string> = {
  fr: "français", ch: "suisses", uk: "britanniques", us: "américains", be: "belges", tr: "turcs", ru: "russes", sa: "saoudiens",
  ae: "émiriens", gr: "grecs", pt: "portugais", it: "italiens", br: "brésiliens", il: "israéliens", nl: "néerlandais",
};

/** « clients britanniques », « clients français et suisses ». */
export function clientsDe(ids: string[]) {
  const mots = [...new Set(ids)].map((i) => ADJ_MARCHE[i]).filter(Boolean);
  if (!mots.length) return "clients";
  return `clients ${mots.length > 1 ? `${mots.slice(0, -1).join(", ")} et ${mots.at(-1)}` : mots[0]}`;
}
