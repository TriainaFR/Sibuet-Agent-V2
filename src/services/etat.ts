import "server-only";
import { addDays } from "@/lib/dates";
import { aFaire, calculerSaison, interet } from "@/lib/engine/calcul";
import { REGLES } from "@/lib/engine/regles";
import { depot } from "@/stockage/depot";
import { construireContexte } from "./contexte";
import { lireCalculs, lireDecisions, lireParametres } from "./reference";

// Vue de restitution : tout ce que les pages affichent, calculé depuis la base à chaque chargement.
// Une saisie dans « Vos données » est donc prise en compte immédiatement.

export function etatSaison() {
  const ctx = construireContexte();
  const sujets = calculerSaison(ctx);
  const actions = aFaire(ctx, sujets);
  const decisions = lireDecisions();
  const calculs = lireCalculs();
  const dernierCalcul = calculs.at(-1) ?? null;

  const ouverts = sujets.filter((s) => s.ouvert);
  const tete = [...ouverts].sort((a, b) => b.ordre - a.ordre)[0];
  const teteLigne = tete?.opportunites.find((o) => o.demandeDetectee && !o.close);
  const actionsAFaire = actions.filter((a) => ["a_lancer", "a_creer", "declencher", "en_retard"].includes(a.statut.code));
  const enAttente = actions.filter((a) => a.statut.code === "bloque");
  const conserves = actions.filter((a) => a.statut.code === "existant");

  return {
    ctx,
    sujets,
    actions,
    decisions,
    dernierCalcul,
    calculs,
    parametres: lireParametres(),
    persistant: depot().persistant,
    horizon: addDays(ctx.date, REGLES.horizonAFaireJours),
    kpis: {
      aLancer: actionsAFaire.length,
      enAttente: enAttente.length,
      enAttenteDetail: [...new Set(enAttente.map((a) => a.statut.libelle.replace("Bloqué : accès ", "")))].join(" et "),
      conserves: conserves.length,
      conservesDates: [...new Set(conserves.map((a) => a.date))],
      tete: tete ? { sujet: tete, ligne: teteLigne ?? null } : null,
    },
    interet,
  };
}

export type EtatSaison = ReturnType<typeof etatSaison>;
