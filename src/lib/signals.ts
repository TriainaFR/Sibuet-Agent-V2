import "server-only";
import { destinationById, hotels } from "@/config/hotels";
import { loadSchoolHolidays } from "@/lib/data";
import { frenchHolidayName } from "@/lib/engine/generated-moments";
import { addDays, today } from "@/lib/dates";
import type { DestinationId, MarketCode } from "@/lib/types";

// Signaux « du moment » affichés en haut du calendrier : prévisions météo réelles et vacances qui approchent.

export interface WeatherSignal {
  destination: DestinationId;
  name: string;
  snowCm: number;
  maxTemp: number;
  sunnyDays: number;
  message: string;
  tone: "action" | "neutre";
}

interface ForecastResponse {
  daily: { time: string[]; snowfall_sum: number[]; temperature_2m_max: number[]; weather_code: number[] };
}

export async function weatherSignals(ids: DestinationId[] = ["megeve", "menerbes"]): Promise<WeatherSignal[]> {
  const out: WeatherSignal[] = [];
  for (const id of ids) {
    const d = destinationById[id];
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}&daily=snowfall_sum,temperature_2m_max,weather_code&forecast_days=7&timezone=Europe%2FParis`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as ForecastResponse;
      const snowCm = Math.round(data.daily.snowfall_sum.reduce((a, b) => a + b, 0));
      const maxTemp = Math.round(Math.max(...data.daily.temperature_2m_max));
      const sunnyDays = data.daily.weather_code.filter((c) => c <= 2).length;
      let message: string;
      let tone: WeatherSignal["tone"] = "neutre";
      if (id === "megeve" && snowCm >= 15) {
        message = `${snowCm} cm de neige annoncés sur 7 jours : déclencher la fiche « Premières neiges » (Instagram + Ads marchés de proximité 🇫🇷 🇨🇭).`;
        tone = "action";
      } else if (id === "megeve") {
        message = snowCm > 0 ? `${snowCm} cm de neige annoncés sur 7 jours : pas encore de quoi déclencher la fiche « Premières neiges ».` : "Pas de neige annoncée sur 7 jours.";
      } else if (sunnyDays >= 5 && maxTemp >= 20) {
        message = `${sunnyDays} jours de soleil et jusqu'à ${maxTemp} °C : pousser les courts séjours de dernière minute (🇫🇷 🇨🇭 🇧🇪).`;
        tone = "action";
      } else {
        message = sunnyDays > 0 ? `${sunnyDays} jour${sunnyDays > 1 ? "s" : ""} de grand soleil annoncé${sunnyDays > 1 ? "s" : ""}, jusqu'à ${maxTemp} °C.` : `Temps variable annoncé, jusqu'à ${maxTemp} °C.`;
      }
      out.push({ destination: id, name: d.name, snowCm, maxTemp, sunnyDays, message, tone });
    } catch {
      // Pas de réseau : on n'affiche simplement pas le signal.
    }
  }
  return out;
}

/** Vacances scolaires qui commencent dans les 60 prochains jours, pour les marchés importants des maisons de la démo. */
export function upcomingHolidays(days = 60) {
  const now = today();
  const limit = addDays(now, days);
  const important = new Set<MarketCode>();
  for (const h of hotels.filter((x) => x.demo)) {
    for (const [code, share] of Object.entries(h.marketMix)) if (share >= 7) important.add(code as MarketCode);
  }
  return loadSchoolHolidays()
    .filter((h) => important.has(h.country) && h.start >= now && h.start <= limit)
    .map((h) => ({ ...h, name: frenchHolidayName(h) }))
    .slice(0, 6);
}
