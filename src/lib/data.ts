import "server-only";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { manualSchoolHolidays } from "@/config/holidays-manual";
import type { DestinationId, HotelId, MarketCode } from "@/lib/types";

// Lecture des fichiers de data/ (CSV d'import et JSON externes).
// Les colonnes attendues sont documentées dans data/imports/README.md.

const DATA_DIR = path.join(process.cwd(), "data");

function readCsv(file: string): Record<string, string>[] {
  const full = path.join(DATA_DIR, file);
  if (!existsSync(full)) return [];
  const parsed = Papa.parse<Record<string, string>>(readFileSync(full, "utf8"), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return parsed.data;
}

function readJson<T>(file: string, fallback: T): T {
  const full = path.join(DATA_DIR, file);
  if (!existsSync(full)) return fallback;
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

export function fileInfo(file: string) {
  const full = path.join(DATA_DIR, file);
  if (!existsSync(full)) return null;
  const st = statSync(full);
  return { updatedAt: st.mtime.toISOString(), sizeKb: Math.round(st.size / 1024) };
}

// ── Réservations (booking engine) ────────────────────────────────────────────
export interface Booking {
  hotel: HotelId;
  bookedAt: string;
  arrival: string;
  nights: number;
  market: MarketCode;
  children: number;
  channel: string;
  amount: number;
}

let bookingsCache: Booking[] | null = null;
export function loadBookings(): Booking[] {
  if (bookingsCache) return bookingsCache;
  bookingsCache = readCsv("imports/bookings.csv")
    .filter((r) => (r.statut ?? "confirmee") !== "annulee")
    .map((r) => ({
      hotel: r.maison as HotelId,
      bookedAt: r.date_reservation,
      arrival: r.date_arrivee,
      nights: Number(r.nb_nuits) || 1,
      market: (r.pays ?? "").toUpperCase() as MarketCode,
      children: Number(r.nb_enfants) || 0,
      channel: r.canal ?? "",
      amount: Number(r.montant_eur) || 0,
    }));
  return bookingsCache;
}

/** Date de l'extraction = date de réservation la plus récente du fichier. */
export function bookingsSnapshotDate(): string {
  return loadBookings().reduce((max, b) => (b.bookedAt > max ? b.bookedAt : max), "0000-00-00");
}

// ── Search Console ───────────────────────────────────────────────────────────
export interface GscRow {
  month: string;
  query: string;
  page: string;
  country: string;
  clicks: number;
  impressions: number;
  position: number;
}

let gscCache: GscRow[] | null = null;
export function loadGsc(): GscRow[] {
  if (gscCache) return gscCache;
  gscCache = readCsv("imports/gsc.csv").map((r) => ({
    month: r.mois,
    query: (r.requete ?? "").toLowerCase(),
    page: r.page,
    country: (r.pays ?? "").toUpperCase(),
    clicks: Number(r.clics) || 0,
    impressions: Number(r.impressions) || 0,
    position: Number(r.position) || 0,
  }));
  return gscCache;
}

// ── Météo ────────────────────────────────────────────────────────────────────
export interface MonthNormal {
  month: number;
  tempMax: number;
  tempMean: number;
  precipitationMm: number;
  rainyDays: number;
  snowfallCm: number;
  sunshineHoursPerDay: number;
}
interface WeatherFile {
  source: string;
  destinations: Record<DestinationId, { period: string; months: MonthNormal[]; snowfallByHalfMonthCm: number[] }>;
}
export function loadWeather(): WeatherFile | null {
  return readJson<WeatherFile | null>("external/weather-normals.json", null);
}

// ── Vacances et jours fériés ─────────────────────────────────────────────────
export interface HolidayPeriod {
  country: MarketCode;
  name: string;
  start: string;
  end: string;
  /** Part du pays concernée (0-1). */
  coverage: number;
  origin: "api" | "manuel";
}

interface SchoolFile {
  items: { country: MarketCode; name: string; start: string; end: string; nationwide: boolean; regions: string[] }[];
}

const FR_EXCLUDED = /austral|après|fin des cours|pont/i;

let holidaysCache: HolidayPeriod[] | null = null;
/** Périodes de vacances scolaires consolidées par pays (les régions sont regroupées). */
export function loadSchoolHolidays(): HolidayPeriod[] {
  if (holidaysCache) return holidaysCache;
  const file = readJson<SchoolFile>("external/school-holidays.json", { items: [] });
  const byCountry = new Map<MarketCode, SchoolFile["items"]>();
  for (const it of file.items) {
    if (it.country === "FR" && FR_EXCLUDED.test(it.name)) continue;
    const days = (Date.parse(it.end) - Date.parse(it.start)) / 86_400_000 + 1;
    if (days < 4) continue;
    byCountry.set(it.country, [...(byCountry.get(it.country) ?? []), it]);
  }
  const out: HolidayPeriod[] = [];
  for (const [country, items] of byCountry) {
    const allRegions = new Set(items.flatMap((i) => i.regions));
    const total = Math.max(1, allRegions.size);
    // Regroupe les périodes qui se chevauchent (ou se suivent à moins de 10 jours).
    const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start));
    const clusters: { name: string; start: string; end: string; regions: Set<string>; full: boolean }[] = [];
    for (const it of sorted) {
      const last = clusters.at(-1);
      const gap = last ? (Date.parse(it.start) - Date.parse(last.end)) / 86_400_000 : Infinity;
      if (last && gap <= 10) {
        if (it.end > last.end) last.end = it.end;
        it.regions.forEach((r) => last.regions.add(r));
        if (it.nationwide || it.regions.length === 0) last.full = true;
      } else {
        clusters.push({ name: it.name, start: it.start, end: it.end, regions: new Set(it.regions), full: it.nationwide || it.regions.length === 0 });
      }
    }
    for (const c of clusters) {
      const coverage = c.full ? 1 : c.regions.size / total;
      if (coverage < 0.3) continue;
      out.push({ country, name: c.name, start: c.start, end: c.end, coverage: +coverage.toFixed(2), origin: "api" });
    }
  }
  for (const m of manualSchoolHolidays) {
    out.push({ country: m.country, name: m.name, start: m.start, end: m.end, coverage: 1, origin: "manuel" });
  }
  holidaysCache = out.sort((a, b) => a.start.localeCompare(b.start));
  return holidaysCache;
}

export interface PublicHoliday {
  country: MarketCode;
  date: string;
  name: string;
  localName: string;
}
export function loadPublicHolidays(): PublicHoliday[] {
  return readJson<{ items: PublicHoliday[] }>("external/public-holidays.json", { items: [] }).items;
}
