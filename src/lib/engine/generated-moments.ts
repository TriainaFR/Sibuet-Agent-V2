import "server-only";
import { destinationById, hotels } from "@/config/hotels";
import { marketByCode } from "@/config/markets";
import { moments as editorialMoments } from "@/config/moments";
import { loadSchoolHolidays, loadWeather, type HolidayPeriod } from "@/lib/data";
import { addDays, formatRange, monthName, overlapDays, diffDays } from "@/lib/dates";
import type { Hotel, MarketCode, Moment } from "@/lib/types";

// Moments générés automatiquement à partir des données externes :
//  1. vacances scolaires des marchés importants pour chaque maison ;
//  2. premières neiges (normales Open-Meteo) pour les maisons de montagne.

const MIN_SHARE = 7;

/** « de février », « d'avril »… */
const deMonth = (m: number) => (/^[aeiouy]/.test(monthName(m)) ? `d'${monthName(m)}` : `de ${monthName(m)}`); // % minimal d'une nationalité dans la maison pour générer un moment « vacances »

export function frenchHolidayName(p: HolidayPeriod) {
  const n = p.name.toLowerCase();
  if (p.country === "BE" && n.includes("carnival")) return "Vacances de Carnaval (Krokus)";
  if (p.country === "NL" && n.includes("may")) return "Meivakantie";
  if (p.country === "NL" && n.includes("spring")) return "Voorjaarsvakantie";
  if (p.country === "GB" && n.includes("half-term")) return `Half-term ${deMonth(Number(p.start.slice(5, 7)))}`;
  if (p.country === "BR") return p.name;
  if (n.includes("christmas") || n.includes("noël") || n.includes("winter break")) return "Vacances de Noël";
  if (n.includes("easter") || n.includes("pâques")) return "Vacances de Pâques";
  if (n.includes("carnival") || n.includes("sport") || n.includes("ski") || n.includes("hiver") || n.includes("february") || n.includes("winter"))
    return "Vacances d'hiver";
  if (n.includes("spring") || n.includes("printemps")) return "Vacances de printemps";
  if (n.includes("autumn") || n.includes("fall") || n.includes("toussaint") || n.includes("all saints") || n.includes("october")) return "Vacances d'automne";
  if (n.includes("summer") || n.includes("été")) return "Vacances d'été";
  if (n.includes("thanksgiving")) return "Thanksgiving";
  if (n.includes("pentecost") || n.includes("whitsun")) return "Vacances de Pentecôte";
  if (n.includes("presidents")) return "Semaine de Presidents' Day";
  return p.name;
}

function isOpen(h: Hotel, start: string, end: string) {
  return h.seasons.some((s) => overlapDays(s.start, s.end, start, end) >= 4);
}

function clampToSeason(h: Hotel, start: string, end: string) {
  const s = h.seasons.find((x) => overlapDays(x.start, x.end, start, end) > 0)!;
  return { start: start < s.start ? s.start : start, end: end > s.end ? s.end : end };
}

function holidayMoments(from: string, to: string): Moment[] {
  const periods = loadSchoolHolidays().filter((p) => p.end >= from && p.start <= to);
  const out: Moment[] = [];
  for (const h of hotels) {
    // Candidats : une période de vacances d'un marché important, pendant l'ouverture de la maison.
    const candidates = periods
      .filter((p) => (h.marketMix[p.country] ?? 0) >= MIN_SHARE && isOpen(h, p.start, p.end))
      // Déjà couvert par un moment éditorial ciblant ce marché ?
      .filter(
        (p) =>
          !editorialMoments.some(
            (m) =>
              m.hotels.includes(h.id) &&
              (m.timing ?? "sejour") === "sejour" &&
              (!m.markets || m.markets.includes(p.country)) &&
              overlapDays(m.start, m.end, p.start, p.end) >= Math.min(7, (diffDays(p.end, p.start) + 1) * 0.5),
          ),
      );
    // Regroupe les marchés dont les vacances se chevauchent largement.
    const groups: { start: string; end: string; periods: HolidayPeriod[] }[] = [];
    for (const p of candidates.sort((a, b) => a.start.localeCompare(b.start))) {
      const g = groups.find((x) => {
        const ov = overlapDays(x.start, x.end, p.start, p.end);
        const len = Math.min(diffDays(x.end, x.start), diffDays(p.end, p.start)) + 1;
        return ov >= len * 0.6;
      });
      if (g && !g.periods.some((q) => q.country === p.country)) {
        g.periods.push(p);
        g.start = g.start < p.start ? p.start : g.start; // cœur commun
        g.end = g.end > p.end ? p.end : g.end;
      } else if (!g) {
        groups.push({ start: p.start, end: p.end, periods: [p] });
      }
    }
    for (const g of groups) {
      const { start, end } = clampToSeason(h, g.start, g.end);
      if (diffDays(end, start) < 3) continue;
      const codes = [...new Set(g.periods.map((p) => p.country))] as MarketCode[];
      const adjectives = codes.map((c) => marketByCode[c].adjective);
      const names = [...new Set(g.periods.map(frenchHolidayName))];
      const title =
        codes.length === 1
          ? `${names[0]} · ${adjectives[0]}`
          : `Vacances ${deMonth(Number(start.slice(5, 7)))} · ${adjectives.join(", ")}`;
      const dest = destinationById[h.destination].name;
      out.push({
        id: `vacances-${codes.join("-").toLowerCase()}-${start}`,
        title,
        kind: "vacances",
        hotels: [h.id],
        start,
        end,
        resonance: "internationale",
        markets: codes,
        angle: `${adjectives.join(", ")} en vacances (${names.join(" / ")}) : leur proposer ${h.name} à ${dest}, dans leur langue et au bon moment.`,
        objective: `Capter la demande ${adjectives.join(", ").toLowerCase()} sur ses vacances scolaires.`,
        keywords: [],
        levers: ["google-ads", "newsletter", "crm", "instagram"],
        source: g.periods
          .map((p) => `${marketByCode[p.country].flag} ${p.name} (${formatRange(p.start, p.end)}${p.coverage < 1 ? `, ${Math.round(p.coverage * 100)} % du pays` : ""})`)
          .join(" · "),
        confidence: "confirmé",
        generated: true,
      });
    }
  }
  return out;
}

function firstSnowMoments(from: string, to: string): Moment[] {
  const weather = loadWeather();
  const snow = weather?.destinations.megeve?.snowfallByHalfMonthCm;
  if (!snow) return [];
  // Premier demi-mois d'automne où il tombe en moyenne 15 cm ou plus.
  let idx = -1;
  for (let i = 18; i < 24; i++) {
    if (snow[i] >= 15) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return [];
  const month = Math.floor(idx / 2) + 1;
  const year = Number(from.slice(0, 4));
  const start = `${year}-${String(month).padStart(2, "0")}-${idx % 2 === 0 ? "01" : "16"}`;
  const end = addDays(start, 14);
  if (start > to) return [];
  return [
    {
      id: `premieres-neiges-${year}`,
      title: "Premières neiges : lancer l'hiver",
      kind: "meteo",
      timing: "communication",
      hotels: ["les-fermes-de-marie", "lodge-park", "hotel-mont-blanc"],
      start,
      end,
      resonance: "internationale",
      angle: "Les premiers flocons sur le hameau : l'hiver approche, réservez votre place au coin du feu.",
      objective: "Profiter du pic d'envie déclenché par les premières neiges pour remplir les semaines encore disponibles.",
      keywords: ["hotel megeve", "megeve ski decembre"],
      levers: ["instagram", "google-ads", "newsletter", "crm"],
      source: `Open-Meteo : ${snow[idx]} cm de neige en moyenne sur la ${idx % 2 === 0 ? "1re" : "2de"} quinzaine de ${monthName(month)} à Megève (${weather!.destinations.megeve.period}). À déclencher avec la prévision réelle.`,
      confidence: "confirmé",
      generated: true,
    },
  ];
}

export function generatedMoments(from: string, to: string): Moment[] {
  return [...holidayMoments(from, to), ...firstSnowMoments(from, to)];
}
