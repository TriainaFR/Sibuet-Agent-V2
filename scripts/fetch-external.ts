/**
 * Récupère les données externes réelles et gratuites, puis les enregistre dans data/external/ :
 *  - normales météo par destination (Open-Meteo, archive 2019-2025)
 *  - vacances scolaires 2026-27 (OpenHolidays) pour FR, BE, NL, DE, CH, IT
 *  - jours fériés 2026-2027 (Nager.Date) pour tous les marchés suivis
 *
 * Usage : npm run data:fetch
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { destinations } from "../src/config/hotels";
import { markets } from "../src/config/markets";

const OUT = "data/external";
mkdirSync(OUT, { recursive: true });

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

// ── Météo ────────────────────────────────────────────────────────────────────
interface ArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_mean: (number | null)[];
    precipitation_sum: (number | null)[];
    snowfall_sum: (number | null)[];
    sunshine_duration: (number | null)[];
  };
}

async function fetchWeather() {
  const result: Record<string, unknown> = {};
  for (const d of destinations) {
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${d.lat}&longitude=${d.lon}` +
      `&start_date=2019-01-01&end_date=2025-12-31&timezone=Europe%2FParis` +
      `&daily=temperature_2m_max,temperature_2m_mean,precipitation_sum,snowfall_sum,sunshine_duration`;
    const data = await getJson<ArchiveResponse>(url);
    const years = new Set<string>();
    // month (1-12) → accumulateurs
    const acc = Array.from({ length: 12 }, () => ({ tmax: 0, tmean: 0, n: 0, precip: 0, snow: 0, sun: 0, rainy: 0 }));
    const half = Array.from({ length: 24 }, () => 0); // neige par demi-mois
    data.daily.time.forEach((t, i) => {
      const [y, m, day] = t.split("-").map(Number);
      years.add(String(y));
      const a = acc[m - 1];
      a.tmax += data.daily.temperature_2m_max[i] ?? 0;
      a.tmean += data.daily.temperature_2m_mean[i] ?? 0;
      a.n += 1;
      const p = data.daily.precipitation_sum[i] ?? 0;
      a.precip += p;
      if (p >= 1) a.rainy += 1;
      const s = data.daily.snowfall_sum[i] ?? 0;
      a.snow += s;
      half[(m - 1) * 2 + (day > 15 ? 1 : 0)] += s;
      a.sun += (data.daily.sunshine_duration[i] ?? 0) / 3600;
    });
    const nYears = years.size;
    result[d.id] = {
      period: `${[...years][0]}-${[...years].at(-1)}`,
      months: acc.map((a, i) => ({
        month: i + 1,
        tempMax: +(a.tmax / a.n).toFixed(1),
        tempMean: +(a.tmean / a.n).toFixed(1),
        precipitationMm: Math.round(a.precip / nYears),
        rainyDays: Math.round(a.rainy / nYears),
        snowfallCm: Math.round(a.snow / nYears),
        sunshineHoursPerDay: +(a.sun / a.n).toFixed(1),
      })),
      snowfallByHalfMonthCm: half.map((s) => Math.round(s / nYears)),
    };
    console.log(`météo ${d.id} ✓`);
  }
  writeFileSync(`${OUT}/weather-normals.json`, JSON.stringify({ source: "Open-Meteo Historical Weather API (ERA5)", destinations: result }, null, 1));
}

// ── Vacances scolaires ───────────────────────────────────────────────────────
interface OHItem {
  startDate: string;
  endDate: string;
  name: { language: string; text: string }[];
  nationwide: boolean;
  subdivisions?: { code: string; shortName: string }[];
}

async function fetchSchoolHolidays() {
  const countries = ["FR", "BE", "NL", "DE", "CH", "IT"];
  const out: { country: string; name: string; start: string; end: string; nationwide: boolean; regions: string[] }[] = [];
  for (const c of countries) {
    const lang = c === "FR" ? "FR" : "EN";
    const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${c}&languageIsoCode=${lang}&validFrom=2026-09-01&validTo=2027-09-30`;
    const items = await getJson<OHItem[]>(url);
    for (const it of items) {
      out.push({
        country: c,
        name: it.name[0]?.text ?? "Vacances",
        start: it.startDate,
        end: it.endDate,
        nationwide: it.nationwide,
        regions: (it.subdivisions ?? []).map((s) => s.shortName),
      });
    }
    console.log(`vacances ${c} ✓ (${items.length})`);
  }
  writeFileSync(`${OUT}/school-holidays.json`, JSON.stringify({ source: "OpenHolidays API (openholidaysapi.org)", items: out }, null, 1));
}

// ── Jours fériés ─────────────────────────────────────────────────────────────
interface NagerItem {
  date: string;
  localName: string;
  name: string;
  global: boolean;
  types: string[];
}

async function fetchPublicHolidays() {
  const out: { country: string; date: string; name: string; localName: string }[] = [];
  for (const m of markets) {
    for (const year of [2026, 2027]) {
      const items = await getJson<NagerItem[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/${m.code}`);
      for (const it of items) {
        if (!it.global || !it.types.includes("Public")) continue;
        out.push({ country: m.code, date: it.date, name: it.name, localName: it.localName });
      }
    }
    console.log(`jours fériés ${m.code} ✓`);
  }
  writeFileSync(`${OUT}/public-holidays.json`, JSON.stringify({ source: "Nager.Date (date.nager.at)", items: out }, null, 1));
}

async function main() {
  await fetchWeather();
  await fetchSchoolHolidays();
  await fetchPublicHolidays();
  console.log("Données externes à jour dans data/external/");
}

main();
