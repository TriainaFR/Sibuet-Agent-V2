import { addDays } from "@/lib/dates";
import type { Connecteur } from "./types";
import { releve } from "./types";

// Open-Meteo : API publique sans clé. Robots interdits sur le site : l'appel vient du serveur (registre, source 1).

const UA = { "User-Agent": "AgentSibuet-meteo/0.2" };

export const meteoPrevision: Connecteur = {
  id: "meteo_prevision",
  nom: "Prévision neige (Open-Meteo)",
  categorie: "contexte",
  cadence: "chaque lundi",
  statut: "branché",
  apporte: "Chutes de neige et températures prévues sur 16 jours au point de la maison. Déclencheur pour les marchés proches.",
  pourBrancher: "Rien : API publique gratuite, déjà branchée.",
  async collecter({ date, maison, journal }) {
    const p = maison.point_meteo;
    if (!p) return null;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&elevation=${p.altitude}` +
      `&daily=snowfall_sum,temperature_2m_max,temperature_2m_min&forecast_days=16&timezone=Europe%2FParis`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const d = (await res.json()) as { daily: { time: string[]; snowfall_sum: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
    const jours = d.daily.time.map((t, i) => ({
      date: t,
      neige_cm: d.daily.snowfall_sum[i] ?? 0,
      tmin: d.daily.temperature_2m_min[i],
      tmax: d.daily.temperature_2m_max[i],
    }));
    const n5 = +jours.slice(0, 5).reduce((s, j) => s + j.neige_cm, 0).toFixed(1);
    const n16 = +jours.reduce((s, j) => s + j.neige_cm, 0).toFixed(1);
    journal(`météo : ${n5} cm prévus sur 5 jours, ${n16} cm sur 16 jours`);
    return releve("meteo_prevision", date, "réel", `Open-Meteo, prévision 16 jours au point ${maison.destination} ${p.altitude} m`, `${n5} cm sur 5 jours, ${n16} cm sur 16 jours`, { point: maison.destination, jours, neige_5j: n5, neige_16j: n16 }, [
      { source: "meteo_prevision", type: "contexte", maison: maison.id, marche: null, sujet: null, semaine_sejour: null, cle: "snow_prev_5j", valeur: n5, valeur_texte: null, observe_le: date },
      { source: "meteo_prevision", type: "contexte", maison: maison.id, marche: null, sujet: null, semaine_sejour: null, cle: "snow_prev_16j", valeur: n16, valeur_texte: null, observe_le: date },
    ]);
  },
};

export const meteoHistorique: Connecteur = {
  id: "meteo_historique",
  nom: "Neige historique, cinq saisons (Open-Meteo)",
  categorie: "contexte",
  cadence: "une fois par saison",
  statut: "branché",
  apporte: "Chutes cumulées sur les 10 jours précédant chaque semaine de séjour, moyenne et détail de cinq saisons.",
  pourBrancher: "Rien : API publique, collectée une fois par saison.",
  async collecter({ date, maison, depot, forcer, journal }) {
    const p = maison.point_meteo;
    if (!p) return null;
    const dernier = depot.lireReleve("meteo_historique");
    if (dernier && !forcer && dernier.collecte_le > `${Number(date.slice(0, 4)) - (date.slice(5, 7) < "07" ? 1 : 0)}-06-30`) {
      journal("neige historique : déjà collectée pour la saison, rien à faire");
      return null;
    }
    // Saison à venir : semaines du lundi de début décembre à fin avril.
    const an = Number(date.slice(0, 4)) + (date.slice(5, 7) >= "07" ? 0 : -1);
    const fin = `${an}-04-30`;
    const debut = `${an - 5}-11-15`;
    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat}&longitude=${p.lon}&elevation=${p.altitude}` +
      `&start_date=${debut}&end_date=${fin}&daily=snowfall_sum,temperature_2m_mean&timezone=Europe%2FParis`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`Open-Meteo archive ${res.status}`);
    const d = (await res.json()) as { daily: { time: string[]; snowfall_sum: number[]; temperature_2m_mean: number[] } };
    const neige = new Map(d.daily.time.map((t, i) => [t, d.daily.snowfall_sum[i] ?? 0]));
    const temp = new Map(d.daily.time.map((t, i) => [t, d.daily.temperature_2m_mean[i] ?? 0]));
    // Premier lundi de décembre de la saison à venir
    let lundi = `${an}-12-01`;
    while (new Date(`${lundi}T00:00:00Z`).getUTCDay() !== 1) lundi = addDays(lundi, 1);
    const saisons = [5, 4, 3, 2, 1].map((k) => an - k);
    const semaines = [];
    for (let i = 0; i < 20; i++) {
      const sem = addDays(lundi, i * 7);
      const par = saisons.map((y) => {
        const m = `${y + (Number(sem.slice(0, 4)) - an)}${sem.slice(4)}`;
        let s = 0;
        for (let k = 1; k <= 10; k++) s += neige.get(addDays(m, -k)) ?? 0;
        return +s.toFixed(1);
      });
      const tm = saisons.map((y) => temp.get(`${y + (Number(sem.slice(0, 4)) - an)}${sem.slice(4)}`) ?? 0);
      semaines.push({
        semaine: sem,
        neige_j10_moyenne: +(par.reduce((a, b) => a + b, 0) / par.length).toFixed(1),
        par_saison: par,
        tmoy: +(tm.reduce((a, b) => a + b, 0) / tm.length).toFixed(1),
      });
    }
    journal(`neige historique : ${semaines.length} semaines calculées sur ${saisons.length} saisons`);
    return releve("meteo_historique", date, "réel", `Open-Meteo, archive ${debut} au ${fin}, point ${maison.destination}`, `${semaines.length} semaines de séjour, de décembre à avril`, {
      point: maison.destination,
      saisons: saisons.map((y) => `${y}-${String(y + 1).slice(2)}`),
      semaines,
    });
  },
};
