import "server-only";
import { hotelById } from "@/config/hotels";
import { loadBookings, loadGsc, type Booking } from "@/lib/data";
import { addDays, diffDays, maxDate, minDate, overlapDays, shiftYears } from "@/lib/dates";
import type { HotelId, MarketCode } from "@/lib/types";

// Statistiques calculées à partir de l'export du booking engine et de la Search Console.

const quantile = (sorted: number[], q: number) => {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
};

const leadTime = (b: Booking) => diffDays(b.arrival, b.bookedAt);

/** Arrivées passées de la maison, sur la même période les années précédentes (± marge). */
export function pastArrivals(hotel: HotelId, start: string, end: string, snapshot: string, padDays = 5) {
  const all = loadBookings();
  const windows = [1, 2].map((n) => [addDays(shiftYears(start, -n), -padDays), addDays(shiftYears(end, -n), padDays)]);
  return all.filter(
    (b) => b.hotel === hotel && b.arrival <= snapshot && windows.some(([s, e]) => b.arrival >= s && b.arrival <= e),
  );
}

export interface WindowStats {
  median: number;
  p25: number;
  p75: number;
  sample: number;
  basis: string;
}

/**
 * Fenêtre de réservation (délai réservation → arrivée) pour une nationalité et une période.
 * Si l'échantillon est trop petit, on élargit : même mois → toute la saison → toutes les arrivées.
 */
export function bookingWindow(hotel: HotelId, market: MarketCode, start: string, end: string, snapshot: string): WindowStats {
  const attempts: [string, Booking[]][] = [
    ["même période, 2 dernières années", pastArrivals(hotel, start, end, snapshot)],
    ["période élargie (± 3 semaines)", pastArrivals(hotel, start, end, snapshot, 21)],
    ["période élargie (± 2 mois)", pastArrivals(hotel, start, end, snapshot, 60)],
    ["toutes les arrivées de la maison", loadBookings().filter((b) => b.hotel === hotel && b.arrival <= snapshot)],
  ];
  for (const [basis, rows] of attempts) {
    const leads = rows.filter((b) => b.market === market).map(leadTime).sort((a, b) => a - b);
    if (leads.length >= 12 || basis.startsWith("toutes")) {
      return { median: quantile(leads, 0.5), p25: quantile(leads, 0.25), p75: quantile(leads, 0.75), sample: leads.length, basis };
    }
  }
  return { median: 0, p25: 0, p75: 0, sample: 0, basis: "aucune donnée" };
}

/** Répartition des nationalités (en % des nuitées) sur la période, les années précédentes. */
export function marketShares(hotel: HotelId, start: string, end: string, snapshot: string) {
  let rows = pastArrivals(hotel, start, end, snapshot, 7);
  if (rows.length < 30) rows = pastArrivals(hotel, start, end, snapshot, 45);
  const totals = new Map<MarketCode, number>();
  let sum = 0;
  for (const b of rows) {
    totals.set(b.market, (totals.get(b.market) ?? 0) + b.nights);
    sum += b.nights;
  }
  return [...totals.entries()]
    .map(([market, n]) => ({ market, share: sum ? Math.round((n / sum) * 1000) / 10 : 0, nights: n }))
    .sort((a, b) => b.share - a.share);
}

/** Taux d'occupation de la maison sur la période l'an dernier (nuitées / capacité). */
export function lastYearOccupancy(hotel: HotelId, start: string, end: string, snapshot: string) {
  const s = shiftYears(start, -1);
  const e = shiftYears(end, -1);
  if (e > snapshot) return null;
  const rooms = hotelById[hotel].rooms;
  let roomNights = 0;
  for (const b of loadBookings()) {
    if (b.hotel !== hotel) continue;
    const stayEnd = addDays(b.arrival, b.nights - 1);
    roomNights += overlapDays(b.arrival, stayEnd, s, e);
  }
  const capacity = rooms * (diffDays(e, s) + 1);
  return capacity ? Math.min(1, roomNights / capacity) : null;
}

/** Rythme de réservation : réservations en main à date vs l'an dernier à la même date. */
export function pace(hotel: HotelId, start: string, end: string, snapshot: string, marketsFilter?: MarketCode[]) {
  const all = loadBookings().filter((b) => b.hotel === hotel && (!marketsFilter || marketsFilter.includes(b.market)));
  const lyStart = shiftYears(start, -1);
  const lyEnd = shiftYears(end, -1);
  const lySnapshot = shiftYears(snapshot, -1);
  const current = all.filter((b) => b.arrival >= start && b.arrival <= end && b.bookedAt <= snapshot);
  const lastYear = all.filter((b) => b.arrival >= lyStart && b.arrival <= lyEnd && b.bookedAt <= lySnapshot);
  const lastYearFinal = all.filter((b) => b.arrival >= lyStart && b.arrival <= lyEnd);
  const sumN = (r: Booking[]) => r.reduce((s, b) => s + b.nights, 0);
  const cur = sumN(current);
  const ly = sumN(lastYear);
  return {
    currentNights: cur,
    lastYearNights: ly,
    lastYearFinalNights: sumN(lastYearFinal),
    ratio: ly >= 8 ? cur / ly : null,
  };
}

/** Anciens clients ayant séjourné à cette période (pour le levier CRM). */
export function pastGuests(hotel: HotelId, start: string, end: string, snapshot: string, marketsFilter: MarketCode[]) {
  return pastArrivals(hotel, start, end, snapshot, 10).filter((b) => marketsFilter.includes(b.market)).length;
}

/** Saisonnalité des recherches Google pour les mots-clés d'un moment. */
export function searchSignal(keywords: string[]) {
  if (keywords.length === 0) return null;
  const set = new Set(keywords.map((k) => k.toLowerCase()));
  const byMonth = new Map<string, number>();
  const byCountry = new Map<string, number>();
  let total = 0;
  for (const r of loadGsc()) {
    if (!set.has(r.query)) continue;
    byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.impressions);
    byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + r.impressions);
    total += r.impressions;
  }
  if (total === 0) return null;
  // Mois de l'année (1-12) le plus recherché, en moyenne sur l'historique disponible.
  const byMonthOfYear = new Map<number, number[]>();
  for (const [m, v] of byMonth) {
    const k = Number(m.slice(5, 7));
    byMonthOfYear.set(k, [...(byMonthOfYear.get(k) ?? []), v]);
  }
  const avg = [...byMonthOfYear.entries()].map(([m, v]) => [m, v.reduce((a, b) => a + b, 0) / v.length] as const);
  const [peakMonth, peakValue] = avg.sort((a, b) => b[1] - a[1])[0];
  const last12 = [...byMonth.entries()].sort().slice(-12).reduce((s, [, v]) => s + v, 0);
  const topCountries = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  const monthly = [...byMonth.entries()].sort().map(([month, impressions]) => ({ month, impressions }));
  return { peakMonth, peakValue: Math.round(peakValue), last12, topCountries, monthly };
}

/** Prochaine date (≥ from) correspondant au milieu du mois de pic de recherche, avant l'événement. */
export function nextSearchPeak(peakMonth: number, eventStart: string) {
  const year = Number(eventStart.slice(0, 4));
  for (const y of [year, year - 1]) {
    const d = `${y}-${String(peakMonth).padStart(2, "0")}-01`;
    if (d <= eventStart) return d;
  }
  return null;
}

export function clampWindow(start: string, end: string, from: string, to: string) {
  return { start: maxDate(start, from), end: minDate(end, to) };
}

// ── Vues d'analyse (page « Fenêtres de réservation ») ────────────────────────

/** Fenêtre médiane par nationalité × mois d'arrivée, sur l'historique disponible. */
export function windowMatrix(hotel: HotelId, snapshot: string) {
  const rows = loadBookings().filter((b) => b.hotel === hotel && b.arrival <= snapshot);
  const cells = new Map<string, number[]>();
  const nightsByMarket = new Map<MarketCode, number>();
  for (const b of rows) {
    const key = `${b.market}|${Number(b.arrival.slice(5, 7))}`;
    cells.set(key, [...(cells.get(key) ?? []), leadTime(b)]);
    nightsByMarket.set(b.market, (nightsByMarket.get(b.market) ?? 0) + b.nights);
  }
  const total = [...nightsByMarket.values()].reduce((a, b) => a + b, 0);
  const marketsSorted = [...nightsByMarket.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ market: m, share: Math.round((n / total) * 1000) / 10 }));
  const months = [...new Set(rows.map((b) => Number(b.arrival.slice(5, 7))))].sort((a, b) => a - b);
  const value = (m: MarketCode, month: number) => {
    const list = (cells.get(`${m}|${month}`) ?? []).sort((a, b) => a - b);
    return list.length ? { median: quantile(list, 0.5), n: list.length } : null;
  };
  const overall = (m: MarketCode) => {
    const list = rows.filter((b) => b.market === m).map(leadTime).sort((a, b) => a - b);
    return { median: quantile(list, 0.5), p25: quantile(list, 0.25), p75: quantile(list, 0.75), n: list.length };
  };
  return { markets: marketsSorted, months, value, overall, total: rows.length };
}

/** Nuitées déjà réservées pour les 12 prochains mois vs l'an dernier à la même date. */
export function paceByMonth(hotel: HotelId, snapshot: string) {
  const out: { month: string; current: number; lastYearSameDate: number; lastYearFinal: number }[] = [];
  const all = loadBookings().filter((b) => b.hotel === hotel);
  const lySnap = shiftYears(snapshot, -1);
  for (let i = 0; i < 12; i++) {
    const d = new Date(`${snapshot.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i + 1);
    const month = d.toISOString().slice(0, 7);
    const ly = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
    const sum = (f: (b: Booking) => boolean) => all.filter(f).reduce((s, b) => s + b.nights, 0);
    const lastYearFinal = sum((b) => b.arrival.startsWith(ly));
    if (lastYearFinal === 0) continue;
    out.push({
      month,
      current: sum((b) => b.arrival.startsWith(month) && b.bookedAt <= snapshot),
      lastYearSameDate: sum((b) => b.arrival.startsWith(ly) && b.bookedAt <= lySnap),
      lastYearFinal,
    });
  }
  return out;
}
