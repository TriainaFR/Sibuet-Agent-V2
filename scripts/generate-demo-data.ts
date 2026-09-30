/**
 * Génère les données SIMULÉES qui remplacent, en attendant les vrais exports :
 *  - data/imports/bookings.csv : export du booking engine (24 mois d'arrivées + réservations déjà enregistrées pour 2026-27)
 *  - data/imports/gsc.csv      : export Search Console (requêtes × mois × pays)
 *
 * Dès réception des vrais fichiers, il suffit de les déposer à la place (mêmes colonnes).
 * Usage : npm run data:demo
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { hotels } from "../src/config/hotels";
import { markets } from "../src/config/markets";
import { moments } from "../src/config/moments";
import type { Hotel, MarketCode } from "../src/lib/types";

const TODAY = "2026-09-30";
const OUT = "data/imports";
mkdirSync(OUT, { recursive: true });

// Générateur pseudo-aléatoire déterministe : mêmes données à chaque exécution.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260930);
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}
function pick<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    r -= w;
    if (r <= 0) return v;
  }
  return items[items.length - 1][0];
}

const DAY = 86_400_000;
const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * DAY));
const md = (s: string) => s.slice(5); // "MM-DD"
const inMd = (s: string, from: string, to: string) => md(s) >= from && md(s) <= to;

// ── Saisons passées : les saisons de la config, décalées d'un et deux ans ────
function shiftYear(s: string, delta: number) {
  return `${Number(s.slice(0, 4)) + delta}${s.slice(4)}`;
}
function openRanges(h: Hotel) {
  const ranges: { start: string; end: string; future: boolean }[] = [];
  for (const delta of [-2, -1, 0]) {
    for (const s of h.seasons) {
      ranges.push({ start: shiftYear(s.start, delta), end: shiftYear(s.end, delta), future: delta === 0 });
    }
  }
  return ranges;
}

// ── Taux d'occupation cible selon la maison et la date ───────────────────────
function occupancy(h: Hotel, date: string): number {
  const m = Number(date.slice(5, 7));
  switch (h.destination) {
    case "megeve":
      if (m === 12) return md(date) >= "12-19" ? 0.96 : 0.42;
      if (m === 1) return md(date) <= "01-03" ? 0.96 : inMd(date, "01-12", "01-18") ? 0.72 : 0.55;
      if (m === 2) return 0.9;
      if (m === 3) return md(date) <= "03-20" ? 0.72 : 0.52;
      if (m === 4) return 0.5;
      if (m === 6) return 0.42;
      if (m === 7) return md(date) >= "07-25" ? 0.82 : 0.68;
      if (m === 8) return md(date) <= "08-22" ? 0.88 : 0.55;
      return 0.4;
    case "menerbes":
      if (m === 3 || m === 4) return 0.55;
      if (m === 5) return 0.72;
      if (m === 6) return 0.86;
      if (m === 7 || m === 8) return 0.92;
      if (m === 9) return 0.86;
      return 0.58;
    case "saint-tropez":
      if (m === 4 || m === 5) return 0.5;
      if (m === 6) return 0.8;
      if (m === 7 || m === 8) return 0.95;
      if (m === 9) return 0.75;
      return 0.45;
    case "saint-barth":
      if (m === 11) return inMd(date, "11-24", "11-30") ? 0.82 : 0.45;
      if (m === 12) return md(date) >= "12-19" ? 0.98 : 0.5;
      if (m === 1) return md(date) <= "01-03" ? 0.98 : 0.75;
      if (m >= 2 && m <= 4) return 0.85;
      if (m === 5) return 0.55;
      return 0.42;
  }
}

// ── Saisonnalité des nationalités (multiplicateur par mois d'arrivée) ────────
const seasonalMix: Partial<Record<MarketCode, Partial<Record<number, number>>>> = {
  GB: { 2: 1.9, 4: 1.4, 8: 1.2, 12: 1.1, 6: 1.2 },
  NL: { 2: 1.7, 5: 1.3, 7: 1.4, 8: 1.4, 10: 1.5 },
  BE: { 2: 1.9, 4: 1.5, 7: 1.3, 8: 1.3, 11: 1.3 },
  US: { 12: 1.5, 3: 1.4, 6: 1.5, 9: 1.4, 10: 1.3, 11: 1.3 },
  BR: { 1: 2.2, 2: 1.9, 7: 2.4, 12: 1.2, 3: 0.4, 4: 0.4, 5: 0.4, 6: 0.5, 8: 0.6, 9: 0.5, 10: 0.5, 11: 0.5 },
  CH: { 1: 1.3, 3: 1.3, 9: 1.2, 10: 1.2 },
  DE: { 2: 1.3, 5: 1.4, 8: 1.3, 10: 1.3 },
  IT: { 8: 1.4, 5: 1.2, 1: 0.8 },
  FR: { 2: 1.2, 8: 1.3, 12: 1.1, 5: 1.2 },
};

// ── Fenêtre de réservation : allongée en haute saison et pour les longs courriers
function windowFactor(h: Hotel, arrival: string, market: MarketCode): number {
  const m = Number(arrival.slice(5, 7));
  let f = 1;
  if (h.destination === "megeve") {
    if ((m === 12 && md(arrival) >= "12-19") || (m === 1 && md(arrival) <= "01-03")) f = 1.45;
    else if (m === 2) f = market === "GB" || market === "NL" || market === "BE" ? 1.45 : 1.2;
    else if (m >= 6 && m <= 8) f = 0.85;
    else if (m === 3 || m === 4) f = 0.75;
  } else if (h.destination === "menerbes") {
    if (m === 6 || m === 7 || m === 9) f = 1.25;
    else if (m === 3 || m === 4 || m === 10) f = 0.7;
  } else if (h.destination === "saint-tropez") {
    if (m === 7 || m === 8) f = 1.35;
  } else if (h.destination === "saint-barth") {
    f = 1.2;
    if (m === 12 || (m === 1 && md(arrival) <= "01-03")) f = 1.8;
  }
  return f;
}

// Rythme de la saison 2026-27 vs l'an dernier (pour simuler un retard ou une avance sur certaines périodes).
function paceFactor(h: Hotel, arrival: string, market: MarketCode): number {
  if (h.destination === "megeve" && inMd(arrival, "01-10", "01-25")) return 0.78; // mi-janvier en retard
  if (h.destination === "megeve" && inMd(arrival, "03-20", "04-10")) return 0.8; // fin de saison en retard
  if (h.destination === "megeve" && inMd(arrival, "02-06", "02-28") && market === "NL") return 0.7;
  if (h.destination === "megeve" && market === "BR") return 1.2;
  if (h.destination === "menerbes" && inMd(arrival, "03-26", "04-15")) return 0.75;
  if (h.destination === "menerbes" && inMd(arrival, "09-01", "09-30") && market === "US") return 1.2;
  return 1;
}

function nights(h: Hotel, arrival: string, market: MarketCode): number {
  const m = Number(arrival.slice(5, 7));
  let mean = 4;
  if (h.destination === "megeve") mean = (m === 12 && md(arrival) >= "12-19") || m === 2 ? 6 : m >= 6 && m <= 9 ? 3.5 : 4.5;
  if (h.destination === "menerbes") mean = 3.3;
  if (h.destination === "saint-tropez") mean = 4;
  if (h.destination === "saint-barth") mean = market === "US" ? 6 : 8;
  if (market === "US" || market === "BR") mean += 1.5;
  return Math.max(1, Math.round(mean + gauss() * 1.6));
}

function priceFactor(date: string, occ: number) {
  return 0.75 + occ * 0.5 + (md(date) >= "12-24" || md(date) <= "01-02" ? 0.4 : 0);
}

const channels: [string, number][] = [
  ["direct-site", 42],
  ["telephone", 10],
  ["ota", 26],
  ["agence-voyage", 22],
];

// ── Génération des réservations ──────────────────────────────────────────────
const rows: string[] = [
  "id_reservation,maison,date_reservation,date_arrivee,nb_nuits,pays,nb_adultes,nb_enfants,canal,montant_eur,statut",
];
let counter = 0;
for (const h of hotels) {
  for (const range of openRanges(h)) {
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
      if (d < "2024-10-01") continue;
      const occ = Math.min(0.99, occupancy(h, d) * (1 + gauss() * 0.06));
      const month = Number(d.slice(5, 7));
      const mix = (Object.entries(h.marketMix) as [MarketCode, number][]).map(
        ([code, share]) => [code, share * (seasonalMix[code]?.[month] ?? 1)] as [MarketCode, number],
      );
      const meanNights = h.destination === "saint-barth" ? 7 : h.destination === "megeve" ? 5 : 3.8;
      const arrivals = poisson((h.rooms * occ) / meanNights);
      for (let i = 0; i < arrivals; i++) {
        const market = pick(mix);
        const base = markets.find((m) => m.code === market)!.baseWindowDays;
        const median = base * windowFactor(h, d, market);
        const lead = Math.max(0, Math.min(330, Math.round(median * Math.exp(gauss() * 0.55))));
        const bookingDate = addDays(d, -lead);
        if (range.future) {
          // Saison à venir : on ne garde que ce qui est déjà réservé au 30/09/2026.
          if (bookingDate > TODAY) continue;
          if (rand() > paceFactor(h, d, market)) continue;
        } else if (d > TODAY) continue;
        const n = nights(h, d, market);
        const family = h.destination === "megeve" && (month === 2 || month === 12 || month === 4) ? 0.55 : 0.25;
        const children = rand() < family ? 1 + Math.floor(rand() * 2) : 0;
        const amount = Math.round(n * h.avgNightlyRate * priceFactor(d, occ) * (1 + children * 0.15));
        const status = rand() < 0.08 ? "annulee" : "confirmee";
        counter++;
        rows.push(
          [
            `R${String(counter).padStart(6, "0")}`,
            h.id,
            bookingDate,
            d,
            n,
            market,
            2,
            children,
            pick(channels),
            amount,
            status,
          ].join(","),
        );
      }
    }
  }
}
writeFileSync(`${OUT}/bookings.csv`, rows.join("\n") + "\n");
console.log(`bookings.csv : ${rows.length - 1} réservations simulées`);

// ── Search Console simulée ───────────────────────────────────────────────────
// Pour chaque mot-clé des moments : courbe d'impressions qui culmine 4 à 7 semaines avant l'événement.
const gsc: string[] = ["mois,requete,page,pays,clics,impressions,position"];
const months: string[] = [];
for (let y = 2025, m = 6; y < 2026 || (y === 2026 && m <= 9); m === 12 ? ((m = 1), y++) : m++) {
  months.push(`${y}-${String(m).padStart(2, "0")}`);
}
const langOf = (q: string) =>
  /[ãç]|esqui|estação|brasil/.test(q) ? "pt" : /\b(the|in|hotel|fields|harvest|christmas|new year|skiing|summer|regatta|november|lavender|wine|easter|equestrian|polo)\b/.test(q) && !/[éèà]/.test(q) ? "en" : "fr";
const countriesByLang: Record<string, [MarketCode, number][]> = {
  fr: [["FR", 0.78], ["BE", 0.12], ["CH", 0.1]],
  en: [["GB", 0.45], ["US", 0.4], ["NL", 0.1], ["DE", 0.05]],
  pt: [["BR", 1]],
};
for (const mo of moments) {
  const hotel = hotels.find((h) => h.id === mo.hotels[0])!;
  for (const q of mo.keywords) {
    const peakVolume = 300 + Math.round(rand() * 6000);
    const leadDays = 28 + Math.round(rand() * 21);
    for (const mon of months) {
      // Édition passée de l'événement la plus proche du mois considéré
      const eventThisYear = `${mon.slice(0, 4)}${mo.start.slice(4)}`;
      const candidates = [shiftYear(eventThisYear, -1), eventThisYear, shiftYear(eventThisYear, 1)];
      const monthMid = `${mon}-15`;
      const dist = Math.min(
        ...candidates.map((e) => Math.abs((toDate(addDays(e, -leadDays)).getTime() - toDate(monthMid).getTime()) / DAY)),
      );
      const curve = Math.exp(-(dist * dist) / (2 * 30 * 30));
      const impressions = Math.round(peakVolume * (0.06 + curve) * (1 + gauss() * 0.1));
      if (impressions < 15) continue;
      const position = Math.max(1.2, +(4 + rand() * 14).toFixed(1));
      const ctr = Math.max(0.005, 0.32 / position);
      for (const [country, share] of countriesByLang[langOf(q)]) {
        const imp = Math.round(impressions * share);
        if (imp < 5) continue;
        gsc.push([mon, `"${q}"`, hotel.url, country, Math.round(imp * ctr), imp, position].join(","));
      }
    }
  }
}
writeFileSync(`${OUT}/gsc.csv`, gsc.join("\n") + "\n");
console.log(`gsc.csv : ${gsc.length - 1} lignes simulées`);
