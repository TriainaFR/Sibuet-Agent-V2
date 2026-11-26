import { addDays, diffDays, shiftYears } from "@/lib/dates";
import type { HistoriqueMaison } from "@/lib/types";

// Calculs sur le détail par nuit de la maison pilote (exports Asterio agrégés) : fonctions pures.

export type Detail = NonNullable<HistoriqueMaison["detail"]>;

/** Le pays Asterio d'un marché est porté par le marché lui-même (marches.json, champ pays). */

/** Quartiles pondérés. */
export function quartilesPonderes(valeurs: { v: number; poids: number }[]) {
  const t = [...valeurs].sort((a, b) => a.v - b.v);
  const total = t.reduce((s, x) => s + x.poids, 0);
  const q = (p: number) => {
    let cumul = 0;
    for (const x of t) {
      cumul += x.poids;
      if (cumul >= p * total) return x.v;
    }
    return t.at(-1)?.v ?? 0;
  };
  return { q1: q(0.25), med: q(0.5), q3: q(0.75), total };
}

/** Nuitées d'une période réservées à une date donnée, et total final de la période. */
export function rythmePeriode(detail: Detail, debut: string, fin: string, aLaDate: string, pays?: string) {
  let final = 0;
  let aDate = 0;
  for (const [nuit, reservee, p, n] of detail) {
    if (nuit < debut || nuit > fin || (pays && p !== pays)) continue;
    final += n;
    if (reservee <= aLaDate) aDate += n;
  }
  return { final, aDate, part: final ? aDate / final : null };
}

/** Courbe de remplissage d'une période : part vendue chaque semaine, de 26 semaines avant à la fin. */
export function courbePeriode(detail: Detail, debut: string, fin: string) {
  const { final } = rythmePeriode(detail, debut, fin, fin);
  if (!final) return [];
  const points: { date: string; part: number }[] = [];
  for (let s = -26; s * 7 <= diffDays(fin, debut); s++) {
    const date = addDays(debut, s * 7);
    points.push({ date, part: rythmePeriode(detail, debut, fin, date).aDate / final });
  }
  return points;
}

/** Nombre de séjours sous lequel un délai mesuré n'est pas retenu. */
export const SEJOURS_MIN_DELAI = 8;

/**
 * Délai mesuré pour un séjour et un pays, sur la même période les deux années précédentes.
 * Les nuits sont regroupées en séjours (même date de réservation, même pays, même canal) :
 * chaque séjour compte une fois, pondéré par ses chambres, pour qu'une longue réservation
 * anticipée ne tire pas toute la fenêtre. En semaines.
 */
export function delaiMesure(detail: Detail, sejour: { debut: string; fin: string }, pays: string) {
  const valeurs: { v: number; poids: number }[] = [];
  const annees: string[] = [];
  let nuitees = 0;
  for (const k of [1, 2]) {
    const d = shiftYears(sejour.debut, -k);
    const f = shiftYears(sejour.fin, -k);
    const sejours = new Map<string, { arrivee: string; reservee: string; chambres: number }>();
    for (const [nuit, reservee, p, c, canal] of detail) {
      if (nuit < d || nuit > f || p !== pays) continue;
      nuitees += c;
      const cle = `${reservee}|${canal}`;
      const s = sejours.get(cle);
      if (!s) sejours.set(cle, { arrivee: nuit, reservee, chambres: c });
      else {
        if (nuit < s.arrivee) s.arrivee = nuit;
        s.chambres = Math.max(s.chambres, c);
      }
    }
    for (const s of sejours.values()) valeurs.push({ v: diffDays(s.arrivee, s.reservee), poids: s.chambres });
    if (sejours.size) annees.push(d.slice(0, 4));
  }
  if (valeurs.length < SEJOURS_MIN_DELAI) return null;
  const q = quartilesPonderes(valeurs);
  const sem = (j: number) => Math.round((j / 7) * 10) / 10;
  return { q1: sem(q.q1), mediane: sem(q.med), q3: sem(q.q3), sejours: valeurs.length, nuitees, annees: annees.sort() };
}
