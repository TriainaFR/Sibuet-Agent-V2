import { shiftYears } from "@/lib/dates";
import type { SujetCalcule } from "@/lib/types";
import type { Contexte } from "./calcul";
import { courbePeriode, rythmePeriode } from "./historique";

// Saison rejouée : ce que l'agent savait à la date choisie, et ce qui s'est passé ensuite.
// Tout vient du détail par nuit de l'historique Asterio de la maison pilote.

export interface BilanADate {
  date: string;
  /** Nuitées de la saison déjà réservées à la date, et l'an dernier à la même date. */
  aDate: number;
  aDateN1: number;
  /** Total final de la saison précédente (connu à la date). */
  finalN1: number;
  parPays: { pays: string; aDate: number; aDateN1: number }[];
}

export function bilanADate(ctx: Contexte): BilanADate | null {
  const detail = ctx.historique?.donnees.detail;
  if (!detail) return null;
  const { debut, fin } = ctx.saison;
  const n1 = [shiftYears(debut, -1), shiftYears(fin, -1)] as const;
  const dN1 = shiftYears(ctx.date, -1);
  const pays = [...new Set(detail.filter(([n]) => (n >= debut && n <= fin) || (n >= n1[0] && n <= n1[1])).map(([, , p]) => p))].filter(Boolean);
  return {
    date: ctx.date,
    aDate: rythmePeriode(detail, debut, fin, ctx.date).aDate,
    aDateN1: rythmePeriode(detail, n1[0], n1[1], dN1).aDate,
    finalN1: rythmePeriode(detail, n1[0], n1[1], n1[1]).final,
    parPays: pays
      .map((p) => ({ pays: p, aDate: rythmePeriode(detail, debut, fin, ctx.date, p).aDate, aDateN1: rythmePeriode(detail, n1[0], n1[1], dN1, p).aDate }))
      .filter((x) => x.aDate + x.aDateN1 > 0)
      .sort((a, b) => b.aDate + b.aDateN1 - (a.aDate + a.aDateN1))
      .slice(0, 8),
  };
}

export interface VerdictSujet {
  id: string;
  nom: string;
  periode: { debut: string; fin: string };
  /** À la date rejouée. */
  aDate: number;
  aDateN1: number;
  /** Une fois la saison passée. */
  final: number;
  finalN1: number;
  urgence: number;
  ordre: number;
  courbe: { date: string; part: number | null; partN1: number | null }[];
}

/** Ce qui s'est passé ensuite, sujet par sujet (connu parce que la saison est terminée). */
export function verdictSaison(ctx: Contexte, sujets: SujetCalcule[]): VerdictSujet[] {
  const detail = ctx.historique?.donnees.detail;
  if (!detail || !ctx.saison.rejeu) return [];
  return sujets
    .filter((s) => s.def.sejour && s.def.famille !== "declencheur")
    .map((s) => {
      const { debut, fin } = s.def.sejour!;
      const [d1, f1] = [shiftYears(debut, -1), shiftYears(fin, -1)];
      const final = rythmePeriode(detail, debut, fin, fin).final;
      const finalN1 = rythmePeriode(detail, d1, f1, f1).final;
      const c = courbePeriode(detail, debut, fin);
      const c1 = courbePeriode(detail, d1, f1);
      return {
        id: s.def.id,
        nom: s.def.nom,
        periode: { debut, fin },
        aDate: rythmePeriode(detail, debut, fin, ctx.date).aDate,
        aDateN1: rythmePeriode(detail, d1, f1, shiftYears(ctx.date, -1)).aDate,
        final,
        finalN1,
        urgence: s.urgence,
        ordre: s.ordre,
        // Parts de chaque saison rapportées à leur propre total, semaine par semaine (même calendrier relatif).
        courbe: c.map((p, i) => ({ date: p.date, part: final ? p.part : null, partN1: c1[i] ? c1[i].part : null })),
      };
    })
    .filter((v) => v.final + v.finalN1 > 0)
    .sort((a, b) => b.ordre - a.ordre);
}
