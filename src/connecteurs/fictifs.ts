import { addDays } from "@/lib/dates";
import type { DonneesAds, DonneesAsterio, Marche, MarcheId, PerfNewsletter, SujetDef } from "@/lib/types";
import type { ContexteCollecte } from "./types";
import { releve } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Données FICTIVES pour la démonstration, produites seulement quand le mode
// « données fictives » est activé (page Sources). Elles sont marquées « fictif »
// partout dans l'interface et ne doivent jamais servir à une décision réelle.
// Elles permettent de montrer la boucle complète : besoin, lignes de base, mesure.
// ─────────────────────────────────────────────────────────────────────────────

/** Pseudo-aléatoire déterministe : la démo est identique à chaque exécution. */
function alea(graine: string) {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Scénario de démo : certaines périodes en retard, d'autres en avance sur l'an dernier.
const RYTHME: Record<string, number> = { fetes: 1.08, sapin: 0.72, janvier: 0.58, spa: 0.8, fevrier: 0.92, printemps: 0.65, paques: 0.85 };

export function asterioFictif(ctx: ContexteCollecte, marches: Marche[]) {
  const r = alea(`asterio-${ctx.date}`);
  const delais: DonneesAsterio["delais"] = {};
  for (const m of marches) {
    const med = +(m.delai_semaines * (0.8 + r() * 0.5)).toFixed(1);
    delais[m.id] = { q1: +(med * (0.45 + r() * 0.2)).toFixed(1), med, q3: +(med * (1.5 + r() * 0.4)).toFixed(1) };
  }
  const otb: DonneesAsterio["otb"] = [];
  for (const s of ctx.sujets.filter((x) => x.sejour && x.famille !== "declencheur")) {
    for (const m of s.marches ?? marches.map((x) => x.id)) {
      const n1 = Math.round(20 + r() * 140);
      const ratio = (RYTHME[s.id] ?? 1) * (0.85 + r() * 0.3);
      otb.push({ sujet: s.id, marche: m as MarcheId, otb_n1: n1, otb: Math.round(n1 * ratio) });
    }
  }
  return releve<DonneesAsterio>("asterio", ctx.date, "fictif", "Données fictives de démonstration (en attente de l'interface Asterio OnSite V3)", `${otb.length} lignes de remplissage fictives`, { delais, otb });
}

export function newslettersPerfFictif(ctx: ContexteCollecte) {
  const r = alea(`nl-${ctx.date}`);
  const themes = ["Ouverture décembre", "Repasse nouveau LP, fêtes, offres", "Nouvelles chambres, nouvelles images", "Hiver 2, luxe ultime au coeur des Alpes", "Boost mars, Wellness break"];
  const perf: PerfNewsletter[] = themes.flatMap((theme, i) =>
    (["fr", "en"] as const).map((langue) => {
      const envois = langue === "fr" ? 18000 + Math.round(r() * 6000) : 6000 + Math.round(r() * 3000);
      const ouvertures = Math.round(envois * (0.26 + r() * 0.16));
      const clics = Math.round(ouvertures * (0.06 + r() * 0.08));
      return { date: addDays("2025-10-23", i * 35), theme, langue, envois, ouvertures, clics, resa_j10: Math.round(clics * (0.02 + r() * 0.03)) };
    }),
  );
  return releve("newsletters_perf", ctx.date, "fictif", "Données fictives de démonstration (en attente de l'export de l'outil d'emailing)", `${perf.length} envois 2025-2026 fictifs`, { envois: perf });
}

export function googleAdsFictif(ctx: ContexteCollecte, sujets: SujetDef[]) {
  const r = alea(`ads-${ctx.date}`);
  const campagnes: DonneesAds["campagnes"] = [];
  for (const m of ["fr", "ch", "uk"] as MarcheId[]) {
    for (const s of sujets.filter((x) => ["fetes", "fevrier", "spa"].includes(x.id))) {
      const budget = Math.round(800 + r() * 2400);
      const clics = Math.round(budget / (0.9 + r() * 1.4));
      const conversions = Math.max(1, Math.round(clics * (0.01 + r() * 0.025)));
      campagnes.push({ nom: `${s.nom} · ${m}`, marche: m, sujet: s.id, budget, clics, conversions, cpa: Math.round(budget / conversions) });
    }
  }
  return releve<DonneesAds>("google_ads", ctx.date, "fictif", "Données fictives de démonstration (en attente de l'accès lecture Google Ads)", `${campagnes.length} campagnes 2025-2026 fictives`, { campagnes });
}
