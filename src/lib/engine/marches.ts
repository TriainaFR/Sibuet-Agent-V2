import { addDays } from "@/lib/dates";
import type { CanalGroupe, Marche } from "@/lib/types";
import type { Contexte } from "./calcul";
import type { Detail } from "./historique";

// Le marché, axe de premier rang : indicateurs par marché tirés des ventes Asterio, de GA4
// et de Semrush, indice de demande, et détection d'une avance fragile. Fonctions pures.

/** Analyse par marché (data/reference/analyse_marches.json, fichier de Jérôme Hoerlé du 26 nov. 2026). */
export interface AnalyseMarches {
  source: string;
  marches: Record<
    string,
    {
      nom: string;
      base: string;
      recherches_megeve: number | null;
      mots_cles: number | null;
      clics_gsc: number | null;
      impressions_gsc: number | null;
      position_gsc: number | null;
      sessions_ga4: number | null;
      engagement_ga4: number | null;
      debuts_reservation: number | null;
      langue_site: string | null;
      lecture: string | null;
    }
  >;
  mots_cles: Record<string, { mot_cle: string; recherches: number; cpc: number; intention: string; famille: string }[]>;
}

/** Un an plus tôt, même jour du calendrier (le 16 oct. 2025 se compare au 16 oct. 2024). */
export const unAnAvant = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4) === "-02-29" ? "-02-28" : d.slice(4)}`;

/** Hiver de la saison du contexte : nuits de décembre à mars. */
export function hiverDe(ctx: Contexte) {
  const an = Number(ctx.saison.debut.slice(0, 4));
  return { debut: `${an}-12-01`, fin: `${an + 1}-03-31`, nom: `hiver ${an}-${an + 1}` };
}
const hiverPrecedent = (h: { debut: string; fin: string }) => ({ debut: unAnAvant(h.debut), fin: unAnAvant(h.fin) });

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const NOM_CANAL: Record<CanalGroupe, string> = { direct: "direct", site: "moteur de réservation", ota: "plateformes (OTA)", agences: "agences", groupes: "groupe", autre: "autre" };

interface Somme {
  total: number;
  individuels: number;
  groupe: number;
  parMois: Record<number, number>;
  parCanal: Partial<Record<CanalGroupe, number>>;
}
function sommer(detail: Detail, pays: string | null, debut: string, fin: string, aLaDate?: string): Somme {
  const s: Somme = { total: 0, individuels: 0, groupe: 0, parMois: {}, parCanal: {} };
  for (const [nuit, reservee, p, n, canal, g] of detail) {
    if (nuit < debut || nuit > fin || (pays !== null && p !== pays) || (aLaDate && reservee > aLaDate)) continue;
    s.total += n;
    if (g) s.groupe += n;
    else s.individuels += n;
    const m = Number(nuit.slice(5, 7));
    s.parMois[m] = (s.parMois[m] ?? 0) + n;
    const c = g ? "groupes" : canal;
    s.parCanal[c] = (s.parCanal[c] ?? 0) + n;
  }
  return s;
}

export interface IndicateursMarche {
  marche: Marche;
  /** Nuitées de décembre à mars : hiver précédent, hiver de la saison (connu seulement si la saison est passée). */
  nuiteesN1: number;
  nuiteesN: number | null;
  evolution: number | null;
  /** Réservé à la date de calcul, et un an plus tôt à la même date. */
  aDate: number;
  aDateN1: number;
  partGroupe: number;
  moisFort: string | null;
  canaux: { canal: CanalGroupe; nom: string; nuitees: number; part: number }[];
  delai: { q1: number; med: number; q3: number; nuitees: number; medAvecGroupes: number | null; hivers: string[] } | null;
  groupeAchat: "proche" | "moyen" | "lointain" | null;
  analyse: AnalyseMarches["marches"][string] | null;
  panier: { mot_cle: string; recherches: number; famille: string }[];
  recherchesPanier: number;
  langueSite: boolean;
  /** Indice de demande 0 à 1 (ventes, GA4, recherches) et son mot. */
  demande: number;
  demandeMot: "haute" | "moyenne" | "basse";
}

export function indicateursMarche(ctx: Contexte, m: Marche): IndicateursMarche {
  const detail = ctx.historique?.donnees.detail ?? [];
  const h = hiverDe(ctx);
  const h1 = hiverPrecedent(h);
  const couvert = (ctx.historique?.donnees.fenetre[1] ?? "") >= h.fin;
  const n1 = sommer(detail, m.pays, h1.debut, h1.fin);
  const n = couvert ? sommer(detail, m.pays, h.debut, h.fin) : null;
  // La saison rejouée est connue jusqu'au bout ; on ne s'en sert que pour l'afficher, jamais pour décider.
  const ref = n && ctx.saison.rejeu ? n : n1;
  const moisFort = Object.entries(ref.parMois).sort((a, b) => b[1] - a[1])[0];
  const totalCanaux = Object.values(ref.parCanal).reduce((a, b) => a + (b ?? 0), 0);
  const d = ctx.historique?.donnees.delaisMarches?.[m.id] ?? null;
  const analyse = ctx.analyse?.marches[m.id] ?? null;
  const panier = (ctx.analyse?.mots_cles[m.id] ?? []).map(({ mot_cle, recherches, famille }) => ({ mot_cle, recherches, famille }));
  const recherchesPanier = panier.reduce((t, k) => t + k.recherches, 0) || analyse?.recherches_megeve || 0;
  return {
    marche: m,
    nuiteesN1: n1.total,
    nuiteesN: n?.total ?? null,
    evolution: n && n1.total ? n.total / n1.total - 1 : null,
    aDate: sommer(detail, m.pays, h.debut, h.fin, ctx.date).total,
    aDateN1: sommer(detail, m.pays, h1.debut, h1.fin, unAnAvant(ctx.date)).total,
    partGroupe: ref.total ? ref.groupe / ref.total : 0,
    moisFort: moisFort ? MOIS[Number(moisFort[0]) - 1] : null,
    canaux: (Object.entries(ref.parCanal) as [CanalGroupe, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([canal, v]) => ({ canal, nom: NOM_CANAL[canal], nuitees: v, part: totalCanaux ? v / totalCanaux : 0 })),
    delai: d,
    groupeAchat: d ? (d.med < 14 ? "proche" : d.med <= 42 ? "moyen" : "lointain") : null,
    analyse,
    panier,
    recherchesPanier,
    langueSite: m.langue_site ?? true,
    demande: 0,
    demandeMot: "basse",
  };
}

/**
 * Indice de demande par marché : ventes de l'hiver précédent (moitié), débuts de réservation GA4
 * (un quart) et recherches du panier de mots-clés dans la langue du marché (un quart).
 * Chaque composante est rapportée au marché le plus fort, en logarithme. Une composante absente
 * ne pèse pas : son poids passe aux autres.
 */
export function indicateursDesMarches(ctx: Contexte): IndicateursMarche[] {
  const tous = ctx.marches.map((m) => indicateursMarche(ctx, m));
  const max = (f: (x: IndicateursMarche) => number) => Math.max(1, ...tous.map(f));
  const mv = max((x) => x.nuiteesN1);
  const mg = max((x) => x.analyse?.debuts_reservation ?? 0);
  const mr = max((x) => x.recherchesPanier);
  for (const x of tous) {
    const parts: [number, number][] = [];
    parts.push([0.5, Math.log1p(x.nuiteesN1) / Math.log1p(mv)]);
    if (x.analyse?.debuts_reservation != null) parts.push([0.25, Math.log1p(x.analyse.debuts_reservation) / Math.log1p(mg)]);
    if (x.recherchesPanier) parts.push([0.25, Math.log1p(x.recherchesPanier) / Math.log1p(mr)]);
    const poids = parts.reduce((t, [w]) => t + w, 0);
    x.demande = Math.round((parts.reduce((t, [w, v]) => t + w * v, 0) / poids) * 100) / 100;
    x.demandeMot = x.demande >= 0.7 ? "haute" : x.demande >= 0.5 ? "moyenne" : "basse";
  }
  return tous;
}

export interface AvanceFragile {
  /** Phrase prête à afficher, ou null si l'avance n'est pas fragile (ou s'il n'y a pas d'avance). */
  phrase: string | null;
  ecart: number;
  aDate: number;
  aDateN1: number;
  moteurs: { pays: string; gain: number }[];
  principal: { pays: string; aDate: number; aDateN1: number } | null;
}

/**
 * Avance fragile : l'hiver est en avance sur l'an dernier à la même date, mais l'avance repose
 * sur moins de trois marchés, ou le marché principal recule. Calcul sur tous les pays (Asterio).
 */
export function avanceFragile(ctx: Contexte): AvanceFragile | null {
  const detail = ctx.historique?.donnees.detail;
  if (!detail) return null;
  const h = hiverDe(ctx);
  const h1 = hiverPrecedent(h);
  const d1 = unAnAvant(ctx.date);
  const parPays = new Map<string, { a: number; b: number; finalN1: number }>();
  for (const [nuit, reservee, p, n] of detail) {
    const pays = p || "Pays non renseigné";
    const x = parPays.get(pays) ?? { a: 0, b: 0, finalN1: 0 };
    if (nuit >= h.debut && nuit <= h.fin && reservee <= ctx.date) x.a += n;
    if (nuit >= h1.debut && nuit <= h1.fin) {
      x.finalN1 += n;
      if (reservee <= d1) x.b += n;
    }
    parPays.set(pays, x);
  }
  const aDate = [...parPays.values()].reduce((t, x) => t + x.a, 0);
  const aDateN1 = [...parPays.values()].reduce((t, x) => t + x.b, 0);
  const ecart = aDate - aDateN1;
  const moteurs = [...parPays.entries()]
    .map(([pays, x]) => ({ pays, gain: x.a - x.b }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain);
  const [principalNom, p] = [...parPays.entries()].sort((a, b) => b[1].finalN1 - a[1].finalN1)[0] ?? [];
  const principal = principalNom ? { pays: principalNom, aDate: p.a, aDateN1: p.b } : null;
  if (ecart <= 0) return { phrase: null, ecart, aDate, aDateN1, moteurs, principal };
  // Combien de pays portent les trois quarts de la hausse
  let cumul = 0;
  let k = 0;
  for (const x of moteurs) {
    cumul += x.gain;
    k++;
    if (cumul >= 0.75 * moteurs.reduce((t, y) => t + y.gain, 0)) break;
  }
  const recul = principal && principal.aDate < principal.aDateN1;
  if (k >= 3 && !recul) return { phrase: null, ecart, aDate, aDateN1, moteurs, principal };
  const noms = moteurs.slice(0, Math.min(4, Math.max(k, 3))).map((x) => `${x.pays} (+${x.gain})`);
  const liste = noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}` : noms[0];
  const phrase =
    `L'hiver compte ${aDate} nuitées réservées contre ${aDateN1} un an plus tôt, mais la hausse vient de quelques pays : ${liste}` +
    (recul && principal ? `. ${principal.pays === "France" ? "La France" : principal.pays}, premier marché, recule déjà : ${principal.aDate} nuitées contre ${principal.aDateN1}.` : ".");
  return { phrase, ecart, aDate, aDateN1, moteurs, principal };
}

/** Date d'envoi locale : 9 h 30 heure du marché un mardi, au plus tôt à la date donnée. */
export function mardiSuivant(date: string) {
  const j = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, (2 - j + 7) % 7);
}

/** Nuitées de la maison par canal de vente, hiver précédent et hiver de la saison (groupes compris dans leur canal). */
export function canauxDeLaMaison(ctx: Contexte) {
  const detail = ctx.historique?.donnees.detail ?? [];
  const h = hiverDe(ctx);
  const h1 = hiverPrecedent(h);
  const couvert = (ctx.historique?.donnees.fenetre[1] ?? "") >= h.fin;
  const parCanal = new Map<CanalGroupe, { n1: number; n: number; aDate: number; aDateN1: number }>();
  const d1 = unAnAvant(ctx.date);
  for (const [nuit, reservee, , n, canal] of detail) {
    const x = parCanal.get(canal) ?? { n1: 0, n: 0, aDate: 0, aDateN1: 0 };
    if (nuit >= h1.debut && nuit <= h1.fin) {
      x.n1 += n;
      if (reservee <= d1) x.aDateN1 += n;
    }
    if (nuit >= h.debut && nuit <= h.fin) {
      x.n += n;
      if (reservee <= ctx.date) x.aDate += n;
    }
    parCanal.set(canal, x);
  }
  return {
    couvert,
    hiver: h,
    hiverN1: { ...h1, nom: `hiver ${Number(h1.debut.slice(0, 4))}-${Number(h1.debut.slice(0, 4)) + 1}` },
    canaux: [...parCanal.entries()].map(([canal, v]) => ({ canal, nom: NOM_CANAL[canal], ...v, n: couvert ? v.n : null })).sort((a, b) => b.n1 - a.n1),
  };
}

/**
 * Courbe cumulée des nuitées de l'hiver (décembre à mars) selon la date de réservation, semaine par semaine,
 * pour l'hiver de la saison (jusqu'à la date de calcul) et l'hiver précédent ramené au même calendrier.
 */
export function courbeCumulee(ctx: Contexte) {
  const detail = ctx.historique?.donnees.detail ?? [];
  const h = hiverDe(ctx);
  const h1 = hiverPrecedent(h);
  const an = Number(h.debut.slice(0, 4));
  const debut = `${an}-06-01`;
  const semaines: string[] = [];
  for (let d = debut; d <= h.fin; d = addDays(d, 7)) semaines.push(d);
  if (semaines.at(-1) !== h.fin) semaines.push(h.fin);
  const plus1 = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4) === "-02-29" ? "-02-28" : d.slice(4)}`;
  const n: number[] = semaines.map(() => 0);
  const n1: number[] = semaines.map(() => 0);
  for (const [nuit, reservee, , q] of detail) {
    if (nuit >= h.debut && nuit <= h.fin) {
      const i = semaines.findIndex((s) => s >= reservee);
      for (let k = i < 0 ? semaines.length : i; k < semaines.length; k++) n[k] += q;
    } else if (nuit >= h1.debut && nuit <= h1.fin) {
      const r = plus1(reservee);
      const i = semaines.findIndex((s) => s >= r);
      for (let k = i < 0 ? semaines.length : i; k < semaines.length; k++) n1[k] += q;
    }
  }
  const coupe = semaines.findIndex((s) => s > ctx.date);
  return {
    semaines,
    n: n.slice(0, coupe < 0 ? semaines.length : coupe),
    n1,
    debut,
    fin: h.fin,
    hiverDebut: h.debut,
  };
}
