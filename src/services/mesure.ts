import "server-only";
import { formatDate } from "@/lib/dates";
import { REGLES } from "@/lib/engine/regles";
import type { Activation, Resultat, SujetCalcule } from "@/lib/types";
import type { Contexte } from "@/lib/engine/calcul";

// Mesure et boucle (prompt P5) : résultats des actions, cas observés, propositions de recalibrage.
// Un recalibrage n'est appliqué qu'après validation humaine.

export type Cas = "Faite, fenêtre remplie" | "Faite, fenêtre vide" | "Non faite, fenêtre remplie" | "Non faite, fenêtre vide";

export function casDe(r: Resultat): Cas | null {
  if (r.pickup_vs_n1 === null) return null;
  const rempli = r.pickup_vs_n1 >= 0;
  if (r.fait) return rempli ? "Faite, fenêtre remplie" : "Faite, fenêtre vide";
  return rempli ? "Non faite, fenêtre remplie" : "Non faite, fenêtre vide";
}

export const lectureCas: Record<Cas, string> = {
  "Faite, fenêtre remplie": "L'action a été faite et la semaine visée a fait mieux que l'an dernier.",
  "Faite, fenêtre vide": "L'action a été faite mais la semaine visée a fait moins bien : revoir le message, le canal ou le timing.",
  "Non faite, fenêtre remplie": "La semaine s'est remplie sans l'action : le sujet ne méritait peut-être pas l'effort.",
  "Non faite, fenêtre vide": "Occasion manquée : la semaine s'est vidée et rien n'a été fait.",
};

export interface Proposition {
  cle: string;
  libelle: string;
  ancienne: string;
  nouvelle: string;
  preuve: string;
  date: string;
  applicable: boolean;
  valeur?: string;
}

export function propositions(ctx: Contexte, resultats: Resultat[], sujets: SujetCalcule[]): { propositions: Proposition[]; attentes: string[] } {
  const out: Proposition[] = [];
  const attentes: string[] = [];

  // 1. Délais de réservation : quartiles observés contre hypothèses
  const delais = ctx.asterio?.donnees.delais ?? {};
  if (Object.keys(delais).length) {
    for (const m of ctx.marches) {
      const obs = delais[m.id];
      if (!obs) continue;
      const actuel = m.delai_semaines;
      if (Math.abs(obs.med - actuel) < 1) continue;
      out.push({
        cle: `delai.${m.id}`,
        libelle: `Délai de réservation, ${m.nom}`,
        ancienne: `${String(actuel).replace(".", ",")} semaines (hypothèse de référence)`,
        nouvelle: `${String(obs.med).replace(".", ",")} semaines`,
        preuve: `Médiane observée ${String(obs.med).replace(".", ",")} semaines, quartiles ${String(obs.q1).replace(".", ",")} et ${String(obs.q3).replace(".", ",")} (${ctx.asterio!.mode === "fictif" ? "Asterio fictif" : "Asterio"}, relevé du ${formatDate(ctx.asterio!.collecte_le, true)}). Le flux est déjà utilisé dans le calcul ; valider met à jour l'hypothèse qui servira quand il manque, par exemple pour une nouvelle saison.`,
        date: ctx.asterio!.collecte_le,
        applicable: true,
        valeur: String(obs.med),
      });
    }
  } else {
    attentes.push("Délais de réservation : en attente des réservations Asterio (dates de création et d'arrivée, par pays).");
  }

  // 2. Taux de réponse CRM par thème et par langue
  const perf = ctx.perfNl?.donnees.envois ?? [];
  if (perf.length) {
    const parLangue = new Map<string, { e: number; o: number; c: number; r: number }>();
    for (const p of perf) {
      const x = parLangue.get(p.langue) ?? { e: 0, o: 0, c: 0, r: 0 };
      parLangue.set(p.langue, { e: x.e + p.envois, o: x.o + p.ouvertures, c: x.c + p.clics, r: x.r + p.resa_j10 });
    }
    for (const [langue, x] of parLangue) {
      out.push({
        cle: `crm.${langue}`,
        libelle: `Ligne de base CRM, envois en ${langue === "fr" ? "français" : "anglais"}`,
        ancienne: ctx.saisie.ouv ? `${ctx.saisie.ouv} % d'ouverture (saisi)` : "pas de référence",
        nouvelle: `${Math.round((x.o / x.e) * 100)} % d'ouverture, ${((x.c / x.e) * 100).toFixed(1).replace(".", ",")} % de clic, ${x.r} réservations à J+10`,
        preuve: `${perf.filter((p) => p.langue === langue).length} envois mesurés (${ctx.perfNl!.mode === "fictif" ? "fictif" : "outil d'emailing"}).`,
        date: ctx.perfNl!.collecte_le,
        applicable: false,
      });
    }
  } else {
    attentes.push("Taux de réponse par thème et par marché : en attente de la performance des newsletters.");
  }

  // 4. Seuil du déclencheur neige
  attentes.push(`Seuil du déclencheur neige (${REGLES.seuilNeige5jCm} cm sur 5 jours) : à recaler sur la corrélation entre chutes à J-10 et réservations à J-7 des marchés proches, après la saison.`);

  // 5. Sujets à fusionner, séparer ou retirer, d'après les résultats
  for (const s of sujets) {
    const res = resultats.filter((r) => r.activationCle.startsWith(`${s.def.id}:`));
    const inutiles = res.filter((r) => casDe(r) === "Non faite, fenêtre remplie").length;
    if (inutiles >= 2) {
      out.push({
        cle: `sujet.${s.def.id}`,
        libelle: `Sujet « ${s.def.nom} »`,
        ancienne: "actif",
        nouvelle: "à retirer ou fusionner",
        preuve: `${inutiles} actions non faites sur des semaines qui se sont remplies quand même.`,
        date: res[0].mesure_le,
        applicable: false,
      });
    }
  }
  return { propositions: out, attentes };
}

/** Activations à mesurer : validées, ou dont la dernière vague est passée. */
export function aMesurer(sujets: SujetCalcule[], date: string, validees: Set<string>): { sujet: SujetCalcule; activation: Activation; terminee: boolean }[] {
  return sujets.flatMap((s) =>
    s.activations
      .filter((a) => validees.has(a.cle) || a.vagues.every((v) => v.fin < date))
      .map((a) => ({ sujet: s, activation: a, terminee: a.vagues.every((v) => v.fin < date) })),
  );
}
