import "server-only";
import { destinationById, hotelById } from "@/config/hotels";
import { marketByCode } from "@/config/markets";
import { moments as editorialMoments } from "@/config/moments";
import { bookingsSnapshotDate, loadPublicHolidays, loadSchoolHolidays, loadWeather } from "@/lib/data";
import { addDays, diffDays, formatDate, formatRange, maxDate, minDate, monthName, overlapDays, today } from "@/lib/dates";
import type { Action, Evidence, Fiche, FicheStatus, HotelId, LeverId, MarketCode, MarketPlan, Moment } from "@/lib/types";
import { generatedMoments } from "./generated-moments";
import {
  bookingWindow,
  lastYearOccupancy,
  marketShares,
  nextSearchPeak,
  pace,
  pastGuests,
  searchSignal,
} from "./stats";

// ─────────────────────────────────────────────────────────────────────────────
// Moteur de recommandation : pour chaque moment × maison, calcule
//   - les nationalités à cibler et leur fenêtre de réservation,
//   - la date de lancement et le planning de chaque levier,
//   - la priorité, avec les données qui la justifient.
// Toutes les règles métier sont ici, commentées, pour être ajustées facilement.
// ─────────────────────────────────────────────────────────────────────────────

/** Règles métier (délais en jours). */
export const RULES = {
  horizonMonths: 12,
  /** Avance de la prise de parole sur l'ouverture de la fenêtre de décision. */
  awarenessLeadDays: 14,
  /** Délai presse : magazines 3 à 4 mois, web 6 semaines. */
  pressLeadDays: 100,
  /** Un article doit être publié ~6 semaines avant le pic de recherche pour être indexé et classé. */
  seoLeadBeforePeakDays: 42,
  seoSecondArticleGapDays: 21,
  /** Part minimale (%) d'une nationalité pour être ciblée. */
  minMarketShare: 5,
  maxMarkets: 6,
};

const LANG_LABEL: Record<string, string> = { fr: "FR", en: "EN", nl: "NL", de: "DE", it: "IT", pt: "PT" };

function allMoments(from: string, to: string): Moment[] {
  return [...editorialMoments, ...generatedMoments(from, to)].filter((m) => m.end >= from && m.start <= to);
}

function selectMarkets(moment: Moment, hotel: HotelId, snapshot: string) {
  const shares = marketShares(hotel, moment.start, moment.end, snapshot);
  const wanted = moment.markets;
  const minShare = wanted ? 1.5 : RULES.minMarketShare; // un moment ciblé explicitement garde ses marchés, même petits
  return shares
    .filter((s) => (!wanted || wanted.includes(s.market)) && s.share >= minShare)
    .slice(0, RULES.maxMarkets);
}

function statusOf(launch: string, eventStart: string, eventEnd: string, now: string): FicheStatus {
  if (now >= eventStart && now <= eventEnd) return "en cours";
  const d = diffDays(launch, now);
  if (d < 0) return "urgent";
  if (d <= 30) return "à lancer";
  return "à venir";
}

/** Une action prévue dans le passé est ramenée à aujourd'hui, en le signalant. */
function schedule(ideal: string, now: string) {
  if (ideal >= now) return { date: ideal, late: false };
  return { date: now, late: true };
}

function lateNote(ideal: string, late: boolean) {
  return late ? [`⚠️ Idéalement le ${formatDate(ideal, true)} : à lancer dès que possible pour rattraper.`] : [];
}

function languageGroups(plans: MarketPlan[]) {
  const groups = new Map<string, MarketPlan[]>();
  for (const p of plans) {
    const lang = marketByCode[p.market].language;
    groups.set(lang, [...(groups.get(lang) ?? []), p]);
  }
  return groups;
}

const flags = (codes: MarketCode[]) => codes.map((c) => marketByCode[c].flag).join(" ");

function buildFiche(moment: Moment, hotelId: HotelId, now: string, snapshot: string): Fiche | null {
  const hotel = hotelById[hotelId];
  const dest = destinationById[hotel.destination];
  const commsOnly = moment.timing === "communication";
  const evidence: Evidence[] = [];

  // 1. Nationalités ciblées et fenêtres de réservation
  const selected = selectMarkets(moment, hotelId, snapshot);
  if (selected.length === 0) return null;
  const plans: MarketPlan[] = selected.map((s) => {
    const w = bookingWindow(hotelId, s.market, moment.start, moment.end, snapshot);
    return {
      market: s.market,
      share: s.share,
      sample: w.sample,
      windowMedian: w.median,
      windowP25: w.p25,
      windowP75: w.p75,
      decisionStart: addDays(moment.start, -w.p75),
      decisionEnd: addDays(moment.start, -w.p25),
    };
  });
  const main = plans.slice(0, 3);

  if (!commsOnly) {
    for (const p of main) {
      const m = marketByCode[p.market];
      evidence.push({
        label: `Fenêtre de réservation · ${m.flag} ${m.adjective}`,
        detail: `Réservent en médiane ${p.windowMedian} j avant l'arrivée (50 % entre ${p.windowP25} et ${p.windowP75} j), soit entre le ${formatDate(p.decisionStart)} et le ${formatDate(p.decisionEnd, true)} pour ce moment. ${p.sample} réservations analysées. ${m.adjective} = ${p.share} % des nuitées sur cette période.`,
        origin: "simulé",
        source: "Booking engine",
      });
    }
  }

  // 2. Date de lancement
  // Chaque marché a sa propre date de prise de parole (ouverture de sa fenêtre de décision − 14 j).
  // La date de lancement de la fiche = date à laquelle la moitié du volume (en nuitées) est entrée en décision.
  const marketLaunch = (p: MarketPlan) => addDays(p.decisionStart, -RULES.awarenessLeadDays);
  const byLaunch = [...plans].sort((a, b) => marketLaunch(a).localeCompare(marketLaunch(b)));
  const totalShare = plans.reduce((s, p) => s + p.share, 0);
  let cumul = 0;
  const pivot = byLaunch.find((p) => (cumul += p.share) >= totalShare / 2) ?? byLaunch[0];
  const launchIdeal = commsOnly ? moment.start : marketLaunch(pivot);
  const earliest = commsOnly ? moment.start : marketLaunch(byLaunch[0]);
  const launch = schedule(launchIdeal, now);
  let status = statusOf(launchIdeal, moment.start, moment.end, now);
  if (status === "à venir" && earliest < now) status = "à lancer";
  if (!commsOnly && earliest < launchIdeal) {
    const early = byLaunch.filter((p) => marketLaunch(p) < launchIdeal);
    evidence.push({
      label: "Marchés à adresser en avance",
      detail: `${early.map((p) => `${marketByCode[p.market].flag} ${marketByCode[p.market].adjective} dès le ${formatDate(maxDate(marketLaunch(p), now), true)}${marketLaunch(p) < now ? " (déjà en décision)" : ""}`).join(" · ")}. Les campagnes Ads et CRM de ces marchés démarrent avant le lancement principal.`,
      origin: "simulé",
      source: "Booking engine",
    });
  }

  // 3. Signaux : rythme de réservation, occupation, recherche, météo, vacances
  const pc = commsOnly ? null : pace(hotelId, moment.start, moment.end, snapshot);
  if (pc && pc.ratio !== null) {
    const pct = Math.round((pc.ratio - 1) * 100);
    evidence.push({
      label: "Réservations en main",
      detail: `${pc.currentNights} nuitées déjà réservées au ${formatDate(snapshot, true)}, contre ${pc.lastYearNights} l'an dernier à la même date (${pct >= 0 ? "+" : ""}${pct} %). L'an dernier, la période a fini à ${pc.lastYearFinalNights} nuitées.`,
      origin: "simulé",
      source: "Booking engine",
    });
  }
  const occ = commsOnly ? null : lastYearOccupancy(hotelId, moment.start, moment.end, snapshot);
  if (occ !== null) {
    evidence.push({
      label: "Occupation l'an dernier",
      detail: `${Math.round(occ * 100)} % sur la même période.`,
      origin: "simulé",
      source: "Booking engine",
    });
  }

  const search = searchSignal(moment.keywords);
  if (search) {
    evidence.push({
      label: "Recherches Google",
      detail: `Les requêtes liées (« ${moment.keywords.slice(0, 2).join(" », « ")} »…) culminent en ${monthName(search.peakMonth)} (${search.peakValue.toLocaleString("fr-FR")} impressions/mois). ${search.last12.toLocaleString("fr-FR")} impressions sur 12 mois, surtout depuis : ${flags(search.topCountries as MarketCode[])}.`,
      origin: "simulé",
      source: "Google Search Console",
    });
  }

  const weather = loadWeather()?.destinations[hotel.destination];
  if (weather) {
    const m = Number(moment.start.slice(5, 7));
    const n = weather.months[m - 1];
    const detail =
      hotel.destination === "megeve" && n.snowfallCm > 5
        ? `${monthName(m)} à ${dest.name} : ${n.snowfallCm} cm de neige en moyenne, ${n.tempMax} °C en journée, ${n.sunshineHoursPerDay} h de soleil/jour.`
        : `${monthName(m)} à ${dest.name} : ${n.tempMax} °C en journée, ${n.sunshineHoursPerDay} h de soleil/jour, ${n.rainyDays} jours de pluie.`;
    evidence.push({ label: "Météo habituelle", detail: `${detail[0].toUpperCase()}${detail.slice(1)} (moyenne ${weather.period}).`, origin: "réel", source: "Open-Meteo" });
  }

  const targetCodes = plans.map((p) => p.market);
  const holidays = loadSchoolHolidays().filter(
    (h) => targetCodes.includes(h.country) && overlapDays(h.start, h.end, moment.start, moment.end) > 0,
  );
  const publics = loadPublicHolidays().filter(
    (h) => targetCodes.includes(h.country) && h.date >= moment.start && h.date <= moment.end,
  );
  if (holidays.length || publics.length) {
    const parts = [
      ...holidays.slice(0, 5).map((h) => `${marketByCode[h.country].flag} ${h.name} (${formatRange(h.start, h.end)})`),
      ...publics.slice(0, 4).map((h) => `${marketByCode[h.country].flag} ${h.localName} (${formatDate(h.date)})`),
    ];
    evidence.push({ label: "Vacances et jours fériés des marchés ciblés", detail: parts.join(" · "), origin: "réel", source: "OpenHolidays / Nager.Date" });
  }

  evidence.push({
    label: moment.generated ? "Origine du moment (automatique)" : "Origine du moment",
    detail: `${moment.source}${moment.confidence === "à vérifier" ? " · date à vérifier" : ""}`,
    origin: moment.generated ? "réel" : "éditorial",
    source: moment.generated ? "Moteur" : "Catalogue éditorial",
  });

  // 4. Plan d'actions par levier
  const actions: Action[] = [];
  const has = (l: LeverId) => moment.levers.includes(l);
  const mainCodes = main.map((p) => p.market);
  const eventLabel = formatRange(moment.start, moment.end);

  if (has("rp") && moment.resonance !== "locale") {
    const ideal = addDays(moment.start, -Math.max(RULES.pressLeadDays, (main[0]?.windowP75 ?? 0) + 30));
    const s = schedule(ideal, now);
    actions.push({
      lever: "rp",
      date: s.date,
      title: "Pitch presse et influence",
      markets: mainCodes,
      details: [
        `Angle : ${moment.angle}`,
        `Cibles : presse voyage et art de vivre ${mainCodes.map((c) => marketByCode[c].name).join(", ")}. Les magazines bouclent 3 à 4 mois avant parution.`,
        "Kit : communiqué court, 10 visuels HD, citation de la famille Sibuet, offre d'accueil presse.",
        "Relance à J+10, puis contenu prêt à l'emploi pour la presse web (6 semaines avant).",
        ...lateNote(ideal, s.late),
      ],
    });
  }

  if (has("seo")) {
    const peak = search ? nextSearchPeak(search.peakMonth, moment.start) : null;
    const ideal = peak ? addDays(peak, -RULES.seoLeadBeforePeakDays) : addDays(launchIdeal, -21);
    const s = schedule(ideal, now);
    const second = addDays(s.date, RULES.seoSecondArticleGapDays);
    const kw = moment.keywords;
    actions.push({
      lever: "seo",
      date: s.date,
      endDate: second,
      title: "Articles du Magazine Sibuet + maillage",
      details: [
        `Article 1 (guide) le ${formatDate(s.date, true)} : « ${moment.title} à ${dest.name} : le guide » (requête cible « ${kw[0] ?? moment.title} »).`,
        `Article 2 (expérience) le ${formatDate(second, true)} : un récit à la première personne à ${hotel.name}, ciblant « ${kw[1] ?? kw[0] ?? ""} ».`,
        `Maillage : article 1 ↔ article 2, et les deux → page ${hotel.name}. Si un article de l'an dernier existe, le mettre à jour plutôt que d'en créer un nouveau.`,
        "GEO : ajouter une FAQ (dates, accès, distances, pour qui) pour être repris par ChatGPT, Perplexity et les AI Overviews.",
        ...(kw.some((k) => /^[a-z ]+$/.test(k) && /\b(the|in|hotel|fields|harvest|christmas|skiing)\b/.test(k)) ? ["Publier aussi la version EN (site en.maisonsethotels-sibuet.com)."] : []),
        ...(peak ? [`Pic de recherche attendu en ${monthName(search!.peakMonth)} : publier ~6 semaines avant.`] : []),
        ...lateNote(ideal, s.late),
      ],
    });
  }

  if (has("crm")) {
    const guests = commsOnly ? 0 : pastGuests(hotelId, moment.start, moment.end, snapshot, targetCodes);
    const s = schedule(earliest, now);
    actions.push({
      lever: "crm",
      date: s.date,
      title: "Message aux anciens clients",
      markets: targetCodes,
      details: [
        guests
          ? `${guests} séjours ${flags(targetCodes)} sur la même période ces 2 dernières années : les recontacter en premier, avant l'ouverture de leur fenêtre de décision.`
          : "Cibler les clients déjà venus (base du booking engine), segmentés par langue.",
        "Message personnel signé de la maison (« votre chambre vous attend »), avec un avantage fidélité (réservation anticipée, soin offert).",
        "Pas d'outil CRM à ce jour : export du booking engine vers l'outil d'emailing, le temps de mettre en place un CRM.",
        ...lateNote(earliest, s.late),
      ],
    });
  }

  if (has("newsletter")) {
    for (const [lang, group] of languageGroups(plans)) {
      const ideal = commsOnly
        ? moment.start
        : addDays(moment.start, -Math.round(Math.max(...group.map((p) => p.windowMedian))) - 7);
      const s = schedule(ideal, now);
      const codes = group.map((p) => p.market);
      actions.push({
        lever: "newsletter",
        date: s.date,
        title: `Newsletter ${LANG_LABEL[lang] ?? lang.toUpperCase()} · ${flags(codes)}`,
        markets: codes,
        details: [
          commsOnly
            ? `Envoi à l'ouverture de l'opération, relance 5 jours avant la fin (${formatDate(addDays(moment.end, -5), true)}).`
            : `Envoi ~1 semaine avant la date médiane de réservation des ${codes.map((c) => marketByCode[c].adjective).join(" et ")} (${group.map((p) => `${p.windowMedian} j`).join(" / ")} avant l'arrivée).`,
          `Objet : ${moment.title} · ${hotel.shortName}. Angle : ${moment.angle}`,
          "Performances des newsletters en attente : l'heure et le jour d'envoi seront ajustés dès réception.",
          ...lateNote(ideal, s.late),
        ],
      });
    }
  }

  if (has("instagram")) {
    const s = schedule(launchIdeal, now);
    const lastMinute = commsOnly ? moment.end : addDays(moment.start, -Math.max(7, Math.min(...plans.map((p) => p.windowP25))));
    actions.push({
      lever: "instagram",
      date: s.date,
      endDate: moment.end,
      title: "Carrousel, rappel puis stories",
      details: [
        `J0 (${formatDate(s.date, true)}) : carrousel 5 photos sur @${hotel.id.replace(/-/g, "")} et partage sur le compte groupe. 1) ambiance / paysage, 2) chambre, 3) table, 4) spa ou expérience, 5) visuel final avec l'invitation à réserver.`,
        `Légende : ${moment.angle}`,
        commsOnly ? "Rappel en story à mi-opération." : `Rappel le ${formatDate(lastMinute, true)} (reel court) pour les marchés de dernière minute (${flags(plans.filter((p) => p.windowMedian < 45).map((p) => p.market)) || "FR, CH"}).`,
        `Pendant l'événement (${eventLabel}) : stories en direct de ${hotel.shortName}.`,
        ...lateNote(launchIdeal, s.late),
      ],
    });
  }

  if (has("google-ads")) {
    const s = schedule(earliest, now);
    const end = commsOnly ? moment.end : addDays(moment.start, -2);
    if (end > s.date) {
      actions.push({
        lever: "google-ads",
        date: s.date,
        endDate: end,
        title: "Campagne Search par marché",
        markets: targetCodes,
        details: [
          `Ciblage : ${plans.map((p) => `${marketByCode[p.market].flag} ${marketByCode[p.market].name}`).join(", ")}, une campagne par langue.`,
          ...(commsOnly
            ? []
            : [
                `Renforcer les enchères pendant la fenêtre de chaque marché : ${plans
                  .map((p) => `${marketByCode[p.market].flag} ${formatDate(maxDate(p.decisionStart, s.date))} → ${formatDate(minDate(p.decisionEnd, end))}`)
                  .join(" · ")}.`,
              ]),
          `Mots-clés : ${[...moment.keywords.slice(0, 4), `hotel ${dest.name.toLowerCase()} luxe`].map((k) => `« ${k} »`).join(", ")}.`,
          "Budget : à calibrer avec l'historique Google Ads (export en attente).",
          ...lateNote(earliest, s.late),
        ],
      });
    }
  }

  if (has("linkedin")) {
    const s = schedule(addDays(moment.start, -21), now);
    actions.push({
      lever: "linkedin",
      date: s.date,
      endDate: moment.end,
      title: "Posts LinkedIn",
      details: [
        "Portrait d'un collaborateur + offres de la saison (lien vers recrutement-sibuet.com).",
        "Relayer sur les comptes de la direction et des chefs.",
      ],
    });
  }

  actions.sort((a, b) => a.date.localeCompare(b.date));

  // 5. Priorité (0-100) : chaque facteur est expliqué dans les raisons
  const reasons: string[] = [];
  const shareSum = main.reduce((s, p) => s + p.share, 0);
  const sDemand = Math.min(1, shareSum / 60);
  let sPace = 0.3;
  if (pc && pc.ratio !== null) {
    sPace = Math.max(0, Math.min(1, (1.05 - pc.ratio) * 2.5));
    if (pc.ratio < 0.9) reasons.push(`Réservations en retard de ${Math.round((1 - pc.ratio) * 100)} % sur l'an dernier`);
    else if (pc.ratio > 1.1) reasons.push(`Réservations en avance de ${Math.round((pc.ratio - 1) * 100)} % : moins urgent`);
  }
  let sOcc = 0.4;
  if (occ !== null) {
    sOcc = Math.max(0, Math.min(1, (0.9 - occ) / 0.45));
    if (occ < 0.65) reasons.push(`Période creuse (${Math.round(occ * 100)} % d'occupation l'an dernier)`);
  }
  const sRes = moment.resonance === "internationale" ? 1 : moment.resonance === "nationale" ? 0.6 : 0.3;
  const sSearch = search ? Math.min(1, search.last12 / 15000) : 0.2;
  if (search && search.last12 > 10000) reasons.push("Forte demande de recherche sur le sujet");
  const daysToLaunch = diffDays(launchIdeal, now);
  const sUrgency = daysToLaunch < 0 ? 1 : daysToLaunch < 45 ? 0.7 : 0.2;
  if (daysToLaunch < 0) reasons.push("Fenêtre de décision déjà ouverte : agir maintenant");
  if (moment.kind === "b2b-rh") reasons.push("Besoin interne (recrutement)");
  const score = Math.round(100 * (0.2 * sDemand + 0.25 * sPace + 0.2 * sOcc + 0.1 * sRes + 0.1 * sSearch + 0.15 * sUrgency));
  const level = score >= 65 ? "haute" : score >= 45 ? "moyenne" : "basse";
  if (reasons.length === 0) reasons.push(`${main.map((p) => marketByCode[p.market].adjective).join(", ")} = ${Math.round(shareSum)} % des nuitées`);

  const kpis = [
    ...(commsOnly ? [] : [`Nuitées ${flags(targetCodes)} sur la période : objectif ≥ l'an dernier (${pc?.lastYearFinalNights ?? "n.c."} nuitées)`]),
    ...(has("google-ads") ? ["Google Ads : CPA et ROAS par pays"] : []),
    ...(has("seo") ? ["SEO : clics organiques sur les 2 articles et positions sur les requêtes cibles"] : []),
    ...(has("newsletter") ? ["Newsletter : taux d'ouverture et de clic par langue"] : []),
    ...(has("instagram") ? ["Instagram : enregistrements et partages du carrousel, clics vers le site"] : []),
  ];

  return {
    id: `${moment.id}--${hotelId}`,
    moment,
    hotelId,
    eventStart: moment.start,
    eventEnd: moment.end,
    launchDate: launch.date,
    status,
    priority: { score, level, reasons },
    markets: plans,
    actions,
    evidence,
    kpis,
  };
}

let cache: { key: string; fiches: Fiche[] } | null = null;

/** Construit toutes les fiches de l'horizon (12 mois à partir d'aujourd'hui). */
export function buildPlan(): { fiches: Fiche[]; from: string; to: string; snapshot: string } {
  const now = today();
  const snapshot = bookingsSnapshotDate();
  const from = now;
  const to = addDays(now, 365);
  const key = `${now}|${snapshot}`;
  if (cache?.key !== key) {
    const fiches: Fiche[] = [];
    for (const m of allMoments(from, to)) {
      for (const h of m.hotels) {
        const f = buildFiche(m, h, now, snapshot);
        if (f) fiches.push(f);
      }
    }
    fiches.sort((a, b) => a.launchDate.localeCompare(b.launchDate) || b.priority.score - a.priority.score);
    cache = { key, fiches };
  }
  return { fiches: cache.fiches, from, to, snapshot };
}

export function getFiche(id: string) {
  return buildPlan().fiches.find((f) => f.id === id) ?? null;
}
