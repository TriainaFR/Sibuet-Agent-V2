// Petites fonctions de dates, au format ISO "YYYY-MM-DD" (UTC, sans heure).

const DAY = 86_400_000;

export const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + Math.round(n) * DAY));
export const diffDays = (a: string, b: string) => Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY);
export const minDate = (...d: string[]) => d.reduce((a, b) => (a < b ? a : b));
export const maxDate = (...d: string[]) => d.reduce((a, b) => (a > b ? a : b));
export const shiftYears = (s: string, n: number) => addDays(s, 364 * n); // 364 j = mêmes jours de semaine

export const monthKey = (s: string) => s.slice(0, 7);

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const monthName = (m: number) => MONTHS[m - 1];
export const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

export function formatDate(s: string, withYear = false) {
  const d = toDate(s);
  const base = `${d.getUTCDate() === 1 ? "1er" : d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}

export function formatRange(a: string, b: string) {
  if (a === b) return formatDate(a, true);
  const sameYear = a.slice(0, 4) === b.slice(0, 4);
  return `${formatDate(a, !sameYear)} au ${formatDate(b, true)}`;
}

/** Date du jour pour l'outil. Peut être figée avec DEMO_TODAY=AAAA-MM-JJ dans .env.local (rejouer un calcul passé). */
export function today(): string {
  return process.env.DEMO_TODAY ?? iso(new Date());
}

export function overlapDays(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const s = maxDate(aStart, bStart);
  const e = minDate(aEnd, bEnd);
  return s > e ? 0 : diffDays(e, s) + 1;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const jourSemaine = (s: string) => JOURS[toDate(s).getUTCDay()];

/** Lundi de la semaine d'une date. */
export function lundi(s: string) {
  const j = toDate(s).getUTCDay();
  return addDays(s, -((j + 6) % 7));
}

/** Date relative, pour une lecture rapide : « aujourd'hui », « dans 3 jours », « dans 2 semaines ». */
export function relatif(d: string, ref: string) {
  const n = diffDays(d, ref);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n < 0) return n > -14 ? `il y a ${-n} jours` : `il y a ${Math.round(-n / 7)} semaines`;
  if (n < 14) return `dans ${n} jours`;
  if (n < 60) return `dans ${Math.round(n / 7)} semaines`;
  return `dans ${Math.round(n / 30)} mois`;
}
