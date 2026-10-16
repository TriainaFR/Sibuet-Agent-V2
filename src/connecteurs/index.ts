import { agenda } from "./agenda";
import { asterioFictif, googleAdsFictif, newslettersPerfFictif } from "./fictifs";
import { asterio, asterioHistorique, gsc, newsletters, semrush } from "./imports";
import { meteoHistorique, meteoPrevision } from "./meteo";
import type { Connecteur } from "./types";
import { releve } from "./types";
import { lireMarches } from "@/services/reference";

// Registre des connecteurs, dans l'ordre de la routine du lundi.

const vacancesControle: Connecteur = {
  id: "vacances_controle",
  nom: "Vacances scolaires, contrôle (OpenHolidays)",
  categorie: "contexte",
  cadence: "une fois par an",
  statut: "branché",
  apporte: "Recoupe les vacances saisies par marché avec une source publique et signale les écarts.",
  pourBrancher: "Rien : API publique. Les vacances de référence restent celles vérifiées sur les sites officiels (data/reference).",
  async collecter({ date, depot, forcer, journal }) {
    const dernier = depot.lireReleve("vacances_controle");
    if (dernier && !forcer && dernier.collecte_le > `${Number(date.slice(0, 4)) - 1}${date.slice(4)}`) {
      journal("vacances : contrôle de moins d'un an, rien à faire");
      return null;
    }
    const an = Number(date.slice(0, 4));
    const items: unknown[] = [];
    for (const pays of ["FR", "BE", "NL", "CH", "DE"]) {
      const res = await fetch(`https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${pays}&languageIsoCode=FR&validFrom=${an}-09-01&validTo=${an + 1}-08-31`);
      if (!res.ok) continue;
      for (const it of (await res.json()) as { startDate: string; endDate: string; name: { text: string }[]; groups?: { code: string }[]; subdivisions?: unknown[] }[]) {
        items.push({ pays, nom: it.name[0]?.text, debut: it.startDate, fin: it.endDate, groupes: (it.groups ?? []).map((g) => g.code), regions: (it.subdivisions ?? []).length });
      }
    }
    journal(`vacances : ${items.length} périodes relevées pour contrôle`);
    return releve("vacances_controle", date, "réel", "OpenHolidays API (openholidaysapi.org)", `${items.length} périodes, FR, BE, NL, CH, DE`, { items });
  },
};

function aBrancher(c: Omit<Connecteur, "collecter" | "statut">, fictif?: Connecteur["collecter"]): Connecteur {
  return { ...c, statut: "à brancher", fictif: Boolean(fictif), collecter: fictif ?? (async () => null) };
}

export const connecteurs: Connecteur[] = [
  meteoPrevision,
  meteoHistorique,
  agenda,
  vacancesControle,
  semrush,
  gsc,
  aBrancher({
    id: "ga4",
    nom: "Fréquentation et conversions (GA4)",
    categorie: "captation",
    cadence: "chaque lundi",
    apporte: "Sessions par pays et page d'entrée, passage vers le moteur SynXis, conversions. Mix de marchés réel en attendant Asterio.",
    pourBrancher: "Propriété GA4 281196949 en lecture (déjà accessible via le connecteur ga4-gsc de Jérôme, non chargée).",
  }),
  newsletters,
  aBrancher(
    {
      id: "newsletters_perf",
      nom: "Performance des newsletters",
      categorie: "performance",
      cadence: "chaque mois",
      apporte: "Par envoi : volume, ouvertures, clics, réservations à J+10 par pays. Ligne de base des activations CRM.",
      pourBrancher: "Export mensuel de l'outil d'emailing (outil à identifier), agrégé par envoi et par pays.",
    },
    async (ctx) => (ctx.fictif ? newslettersPerfFictif(ctx) : null),
  ),
  asterioHistorique,
  asterio,
  aBrancher(
    {
      id: "google_ads",
      nom: "Google Ads",
      categorie: "coûts",
      cadence: "chaque mois",
      apporte: "Campagnes, budgets, clics, conversions, coût par acquisition. Ligne de base des activations Google Ads.",
      pourBrancher: "Accès lecture au compte Google Ads (identifiant client à 10 chiffres) pour l'adresse de service.",
    },
    async (ctx) => (ctx.fictif ? googleAdsFictif(ctx, ctx.sujets) : null),
  ),
  aBrancher({
    id: "meta_ads",
    nom: "Meta Ads",
    categorie: "coûts",
    cadence: "chaque mois",
    apporte: "Audiences, portée, coût par acquisition. Indispensable aux marchés lointains (États-Unis, Royaume-Uni, Pays-Bas).",
    pourBrancher: "Accès analyste au compte publicitaire du Business Manager Sibuet.",
  }),
  aBrancher({
    id: "instagram",
    nom: "Instagram",
    categorie: "performance",
    cadence: "chaque mois",
    apporte: "Portée, enregistrements et clics par publication : la résonance d'un sujet.",
    pourBrancher: "Compte professionnel relié à l'API Meta Graph (jeton longue durée) ou export Meta Business Suite.",
  }),
];

/** Le connecteur Asterio produit des données fictives quand aucun export n'est déposé et que la démo le demande. */
export async function collecterAsterio(ctx: Parameters<Connecteur["collecter"]>[0]) {
  const reel = await asterio.collecter(ctx);
  if (reel) return reel;
  const dernier = ctx.depot.lireReleve("asterio");
  if (ctx.fictif && (!dernier || dernier.mode === "fictif")) return asterioFictif(ctx, lireMarches());
  return null;
}
