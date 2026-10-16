import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatDate, formatRange } from "@/lib/dates";
import { canalLibelle } from "@/lib/format";
import type { Contexte } from "@/lib/engine/calcul";
import type { Activation, SujetCalcule } from "@/lib/types";

// Briefs (P4) et export de fiche (P3), au format texte du projet :
// français, pas de tiret long, pas de dièse ni d'astérisque, chiffres sourcés et datés.

export const lirePrompt = (nom: string) => readFileSync(path.join(process.cwd(), "prompts", nom), "utf8");

const marchesDe = (ctx: Contexte, ids: string[]) => ids.map((id) => ctx.marches.find((m) => m.id === id)?.nom ?? id).join(", ");

/** Contexte factuel transmis au modèle (ou utilisé par le gabarit). */
export function contexteBrief(ctx: Contexte, s: SujetCalcule, a: Activation) {
  const gsc = ctx.gsc?.donnees;
  return [
    `Sujet : ${s.def.nom} (famille ${s.def.famille}). Maison : ${ctx.maison.nom}, ${ctx.maison.destination}. Saison ${ctx.saison.nom.toLowerCase()}.`,
    s.def.sejour ? `Période de séjour : du ${formatRange(s.def.sejour.debut, s.def.sejour.fin)}.` : "",
    `Thème : ${s.def.theme}`,
    `Cibles : ${s.def.cibles}`,
    `Pourquoi maintenant : ${s.pourquoi} ${s.maintenant}`,
    "",
    `Activation validée : ${canalLibelle[a.canal]}, type ${a.type}.`,
    `Objectif : ${a.objectif}`,
    `Cible : ${a.cible}`,
    `Message clé proposé : ${a.message}`,
    `Sémantique : ${a.semantique.join(", ") || "sans objet"}. Termes interdits : ${a.interdits.join(", ")}.`,
    `Assets : ${a.assets}`,
    `Déclencheur : ${a.declencheur}`,
    `Justification du timing : ${a.justification}`,
    `Budget ou effort : ${a.effort}`,
    `KPI : ${a.kpi} Ligne de base : ${a.ligneBase}`,
    `Ce qui change par rapport au plan : ${a.changement}`,
    "Vagues :",
    ...a.vagues.map((v) => `- vague ${v.numero}, du ${formatDate(v.debut, true)} au ${formatDate(v.fin, true)}, ${v.libelleMarches} : ${v.note}`),
    "",
    "Fenêtres d'achat par marché :",
    ...s.opportunites
      .filter((o) => o.demandeDetectee && o.fenetre)
      .map((o) => `- ${o.libelle} : réserve du ${formatDate(o.fenetre!.debut, true)} au ${formatDate(o.fenetre!.fin, true)} (délai ${o.delai.origine}), verdict sur le plan d'envois : ${o.verdict}`),
    "",
    "Search Console (12 mois, tous pays) :",
    ...[...new Set(s.def.requetes.map((q) => q.requete))].map((q) => {
      const g = gsc?.requetes[q];
      return g ? `- ${q} : ${g.impressions} impressions, ${g.clics} clics, position ${g.position ?? "n.d."}` : `- ${q} : non suivie`;
    }),
    `Pages : ${(gsc?.pages_par_sujet[s.def.id] ?? []).slice(0, 6).map((p) => `${p.page} (${p.impressions} impressions, ${p.clics} clics, décision ${p.decision})`).join(" ; ") || "inventaire à faire"}`,
    `Événements rattachés : ${s.evenementsLies.map((e) => `${e.nom} ${formatRange(e.debut, e.fin)}${e.confirme ? "" : " (à confirmer)"}`).join(" ; ") || "aucun"}`,
    `Base de marque : ${ctx.maison.base_de_marque}.`,
    `Ce qui manque : ${s.manque.join(" ")}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

/** Brief au gabarit P4, sans modèle de langage : utilisé quand aucune clé Claude n'est configurée. */
export function briefGabarit(ctx: Contexte, s: SujetCalcule, a: Activation) {
  const premiere = a.vagues[0];
  const derniere = a.vagues.at(-1)!;
  const lignes = [
    `BRIEF ${canalLibelle[a.canal].toUpperCase()}`,
    `${s.def.nom}, ${ctx.maison.nom}, ${marchesDe(ctx, [...new Set(a.vagues.flatMap((v) => v.marches))])}, du ${formatDate(premiere.debut, true)} au ${formatDate(derniere.fin, true)}.`,
    `Produit le ${formatDate(ctx.date, true)} à partir du calcul du jour. Brief sans modèle de langage, au gabarit P4.`,
    "",
    "OBJECTIF",
    `${a.objectif} Type : ${a.type}.`,
    "",
    "CIBLE",
    a.cible,
    "",
    "MESSAGE CLÉ",
    a.message,
    "Angles secondaires :",
    `- ${s.def.theme}`,
    ...s.evenementsLies.slice(0, 2).map((e) => `- ${e.nom}, ${formatRange(e.debut, e.fin)}${e.confirme ? "" : ", date à confirmer"}`),
    "",
    "SÉMANTIQUE",
    `- Requêtes cibles : ${a.semantique.join(", ") || "sans objet"}`,
    `- Termes de marque : à fixer avec la base de marque (${ctx.maison.base_de_marque})`,
    `- Termes interdits : ${a.interdits.join(", ")}`,
    "",
    "ASSETS",
    a.assets,
    "",
    "TIMING",
    ...a.vagues.map((v) => `- Vague ${v.numero} : du ${formatDate(v.debut, true)} au ${formatDate(v.fin, true)}, ${v.libelleMarches}. ${v.note}.`),
    `- Déclencheur : ${a.declencheur}`,
    `- Justification : ${a.justification}`,
    "",
    "BUDGET OU EFFORT",
    a.effort,
    "",
    "KPI",
    `${a.kpi} Ligne de base : ${a.ligneBase} Date de mesure : à la fin de la dernière vague, puis après la période de séjour pour le remplissage contre l'an dernier.`,
    "",
    "CE QUI CHANGE PAR RAPPORT AU PLAN",
    a.changement,
    "",
    "VALIDATION",
    "Direction marketing Sibuet, avant le début de la première vague. Aucune publication sans cette validation.",
  ];
  return lignes.join("\n");
}

/** Fiche de thème au gabarit P3, en texte. */
export function ficheTexte(ctx: Contexte, s: SujetCalcule) {
  const out = [
    "FICHE DE THEME",
    `Sujet : ${s.def.nom} (id ${s.def.id})`,
    `Famille : ${s.def.famille}. Maison : ${ctx.maison.nom}, ${ctx.maison.destination}. Saison : ${ctx.saison.nom.toLowerCase()}.`,
    s.def.sejour ? `Période de séjour : du ${formatRange(s.def.sejour.debut, s.def.sejour.fin)}. Cibles : ${s.def.cibles}` : `Cibles : ${s.def.cibles}`,
    `Produite le ${formatDate(ctx.date, true)} par l'Agent Sibuet. Les délais de réservation sont des hypothèses tant qu'Asterio n'est pas branché, sauf mention.`,
    "",
    "",
    "POURQUOI CE SUJET, POURQUOI MAINTENANT",
    "",
    s.pourquoi,
    s.maintenant,
    "",
    "",
    "GRILLE PAR MARCHÉ",
    "",
    ...s.opportunites.map(
      (o) =>
        `- ${o.libelle} : séjour ${o.sejour ? formatRange(o.sejour.debut, o.sejour.fin) : "n.d."}, fenêtre d'achat ${o.fenetre ? formatRange(o.fenetre.debut, o.fenetre.fin) : "sur prévision"} (${o.delai.origine}), score ${String(o.score).replace(".", ",")}, urgence ${String(o.urgence).replace(".", ",")}, ${o.verdict.toLowerCase()}${o.envoi ? ` (envoi ${o.envoi.cible} du ${formatDate(o.envoi.date)})` : ""}.`,
    ),
    "",
    "",
    "ACTIVATIONS PROPOSÉES",
    "",
    ...s.activations.flatMap((a, i) => [
      `${i + 1}. ${canalLibelle[a.canal]}, ${a.type}. ${a.statut.libelle}.`,
      `- Objectif : ${a.objectif}`,
      `- Marché et segment : ${a.cible}`,
      `- Message clé : ${a.message} Sémantique : ${a.semantique.join(", ") || "sans objet"}. Interdits : ${a.interdits.slice(0, 5).join(", ")}.`,
      `- Assets : ${a.assets}`,
      ...a.vagues.map((v) => `- Vague ${v.numero} : ${formatRange(v.debut, v.fin)}, ${v.libelleMarches}, ${v.statut.libelle.toLowerCase()}. ${v.note}.`),
      `- Timing et justification : ${a.justification}`,
      `- Budget ou effort : ${a.effort}`,
      `- KPI : ${a.kpi} Ligne de base : ${a.ligneBase}`,
      `- Ce qui change par rapport au calendrier existant : ${a.changement}`,
      "",
    ]),
    "",
    "CE QUI MANQUE POUR TRANCHER",
    "",
    ...s.manque.map((m) => `- ${m}`),
  ];
  return out.join("\n");
}
