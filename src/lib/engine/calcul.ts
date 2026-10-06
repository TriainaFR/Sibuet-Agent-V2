import { addDays, diffDays, formatDate, formatRange, maxDate, minDate, monthName } from "@/lib/dates";
import { canalCourt, nombre } from "@/lib/format";
import type {
  ActionAFaire,
  Activation,
  DonneesAds,
  DonneesAsterio,
  DonneesGsc,
  Envoi,
  Evenement,
  Facteur,
  LigneSemrush,
  Maison,
  Marche,
  ModeReleve,
  Opportunite,
  Origine,
  PerfNewsletter,
  SaisieClient,
  Statut,
  SujetCalcule,
  SujetDef,
  VacancesMarche,
  Vague,
  Verdict,
} from "@/lib/types";
import { REGLES, VOCABULAIRE_INTERDIT } from "./regles";

// ─────────────────────────────────────────────────────────────────────────────
// Moteur de détection (P2) et de compilation des fiches (P3), en fonctions pures.
// Entrée : un Contexte (connaissance + derniers relevés + saisie client).
// Sortie : sujets calculés, opportunités par marché, activations en vagues, liste « À faire ».
// ─────────────────────────────────────────────────────────────────────────────

export interface Source<T> {
  donnees: T;
  collecte_le: string;
  mode: ModeReleve;
  origine: string;
}

export interface SemaineNeige {
  semaine: string;
  neige_j10_moyenne: number;
  par_saison: number[];
  tmoy: number;
}

export interface Contexte {
  date: string;
  maison: Maison;
  marches: Marche[];
  sujets: SujetDef[];
  vacances: VacancesMarche[];
  semrush: Source<{ lignes: LigneSemrush[] }> | null;
  gsc: Source<DonneesGsc> | null;
  neige: Source<{ semaines: SemaineNeige[]; saisons: string[] }> | null;
  prevision: Source<{ neige_5j: number; neige_16j: number; jours: { date: string; neige_cm: number; tmin: number; tmax: number }[] }> | null;
  agenda: Source<{ evenements: Evenement[] }> | null;
  envois: Source<{ envois: Envoi[]; statut: string }> | null;
  asterio: Source<DonneesAsterio> | null;
  perfNl: Source<{ envois: PerfNewsletter[] }> | null;
  ads: Source<DonneesAds> | null;
  saisie: SaisieClient;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const semaines = (j: number) => j / 7;
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[«»"“”’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
const origineMode = (m: ModeReleve): Origine => (m === "fictif" ? "fictif" : "mesuré");
const src = (s: Source<unknown>, nom: string) => `${nom}, relevé du ${formatDate(s.collecte_le, true)}${s.mode === "fictif" ? " (fictif)" : ""}`;

// ── Délais de réservation ────────────────────────────────────────────────────

export function delaiMarche(ctx: Contexte, m: Marche) {
  const a = ctx.asterio?.donnees.delais[m.id];
  if (a) return { mediane: a.med, q1: a.q1, q3: a.q3, origine: origineMode(ctx.asterio!.mode) };
  const saisi = Number(ctx.saisie.delais[m.id]);
  if (saisi > 0) return { mediane: saisi, q1: saisi * REGLES.q1SurMediane, q3: saisi * REGLES.q3SurMediane, origine: "saisi" as Origine };
  const h = m.delai_semaines;
  return { mediane: h, q1: h * REGLES.q1SurMediane, q3: h * REGLES.q3SurMediane, origine: "estimation" as Origine };
}

// ── Demande (Semrush) ────────────────────────────────────────────────────────

function volume(ctx: Contexte, requete: string, base: string) {
  return ctx.semrush?.donnees.lignes.find((l) => l.requete === requete && l.base === base);
}

function requetesAchat(s: SujetDef, base: string) {
  return s.requetes.filter((q) => q.base === base && q.usage === "achat");
}

function volumeAchat(ctx: Contexte, s: SujetDef, base: string) {
  return requetesAchat(s, base).reduce((t, q) => t + (volume(ctx, q.requete, base)?.volume ?? 0), 0);
}

/** Prochaine date de pic (1er du mois) d'une requête, à partir de la date de calcul. */
function prochainPic(l: LigneSemrush, date: string): string | null {
  const vals = Object.entries(l.tendance);
  if (vals.length === 0) return null;
  const max = Math.max(...vals.map(([, v]) => v));
  const moisPic = vals.filter(([, v]) => v >= REGLES.seuilPic * max).map(([k]) => Number(k.slice(5, 7)));
  let meilleur: string | null = null;
  for (const m of moisPic) {
    for (const an of [Number(date.slice(0, 4)), Number(date.slice(0, 4)) + 1]) {
      const d = `${an}-${String(m).padStart(2, "0")}-01`;
      if (d >= `${date.slice(0, 7)}-01` && (!meilleur || d < meilleur)) meilleur = d;
    }
  }
  return meilleur;
}

function moisDePic(l: LigneSemrush) {
  const vals = Object.entries(l.tendance);
  const max = Math.max(...vals.map(([, v]) => v));
  return [...new Set(vals.filter(([, v]) => v >= REGLES.seuilPic * max).map(([k]) => Number(k.slice(5, 7))))];
}

function facteurDemande(ctx: Contexte, s: SujetDef, m: Marche, volumeMax: number): Facteur {
  if (!ctx.semrush) return { valeur: REGLES.facteurAbsent, manquant: true, origine: null, detail: "Semrush non chargé.", source: "Semrush" };
  const qs = requetesAchat(s, m.semrush_db)
    .map((q) => volume(ctx, q.requete, m.semrush_db))
    .filter((l): l is LigneSemrush => Boolean(l && l.volume > 0));
  const source = src(ctx.semrush, "Semrush");
  if (qs.length === 0) {
    return { valeur: REGLES.demandePlancher, manquant: false, origine: "mesuré", detail: `Aucune requête d'achat sur la base ${m.semrush_db} : demande non détectée.`, source };
  }
  const vol = qs.reduce((t, l) => t + l.volume, 0);
  const n = Math.log1p(vol) / Math.log1p(volumeMax);
  let poids = 0;
  for (const l of qs) {
    const pic = prochainPic(l, ctx.date);
    const sem = pic ? semaines(diffDays(pic, ctx.date)) : 52;
    poids += l.volume * (sem <= REGLES.picSemaines ? 1 : Math.max(REGLES.picPlancher, 1 - (sem - REGLES.picSemaines) / 52));
  }
  const valeur = r2(clamp(n * (poids / vol), REGLES.demandePlancher, 1));
  const top = [...qs].sort((a, b) => b.volume - a.volume)[0];
  return {
    valeur,
    manquant: false,
    origine: "mesuré",
    detail: `${qs.length} requête${qs.length > 1 ? "s" : ""} d'achat, ${nombre(vol)} recherches par mois sur la base ${m.semrush_db}. La plus forte : « ${top.requete} », ${nombre(top.volume)}, pic en ${moisDePic(top).map(monthName).join(", ")}.`,
    source,
  };
}

// ── Visibilité (Search Console) ──────────────────────────────────────────────

function facteurVisibilite(ctx: Contexte, s: SujetDef, m: Marche): Facteur {
  if (!ctx.gsc) return { valeur: REGLES.facteurAbsent, manquant: true, origine: null, detail: "Search Console non chargée.", source: "Search Console" };
  const qs = requetesAchat(s, m.semrush_db).filter((q) => (volume(ctx, q.requete, m.semrush_db)?.volume ?? 0) > 0);
  const suivies = qs.filter((q) => ctx.gsc!.donnees.requetes[q.requete]);
  const source = src(ctx.gsc, "Search Console");
  if (suivies.length === 0) {
    return { valeur: REGLES.facteurAbsent, manquant: true, origine: null, detail: `Aucune requête d'achat du marché suivie dans la Search Console.`, source };
  }
  let total = 0;
  let poids = 0;
  const lignes: string[] = [];
  for (const q of suivies) {
    const g = ctx.gsc.donnees.requetes[q.requete];
    const e = !g.impressions || g.position === null ? 1 : clamp((g.position - 1) / (REGLES.positionMax - 1), REGLES.ecartPlancher, 1);
    const w = volume(ctx, q.requete, m.semrush_db)?.volume ?? 1;
    total += e * w;
    poids += w;
    lignes.push(g.impressions ? `« ${q.requete} » position ${String(g.position).replace(".", ",")}` : `« ${q.requete} » aucune impression`);
  }
  return { valeur: r2(total / poids), manquant: false, origine: "mesuré", detail: `${lignes.join(", ")} (tous pays, 12 mois).`, source };
}

// ── Besoin (Asterio ou saisie) ───────────────────────────────────────────────

function facteurBesoin(ctx: Contexte, s: SujetDef, m: Marche): { f: Facteur; otb?: { otb: number; otb_n1: number } } {
  const ligne = ctx.asterio?.donnees.otb.find((o) => o.sujet === s.id && o.marche === m.id);
  if (ligne && ligne.otb_n1 > 0) {
    const v = clamp(1 - ligne.otb / ligne.otb_n1, REGLES.besoinPlancher, 1);
    const pct = Math.round((ligne.otb / ligne.otb_n1 - 1) * 100);
    return {
      f: { valeur: r2(v), manquant: false, origine: origineMode(ctx.asterio!.mode), detail: `${ligne.otb} nuitées réservées contre ${ligne.otb_n1} l'an dernier à la même date (${pct >= 0 ? "+" : ""}${pct} %).`, source: src(ctx.asterio!, ctx.asterio!.origine.startsWith("Fichier") ? "Réservations chargées" : "Asterio") },
      otb: ligne,
    };
  }
  const r = ctx.saisie.rempl[s.id];
  if (r && r !== "inconnu") {
    const libelle = r === "bas" ? "bas" : r === "plein" ? "déjà bien vendu" : "comme l'an dernier";
    return { f: { valeur: REGLES.besoinSaisi[r], manquant: false, origine: "saisi", detail: `Remplissage indiqué : ${libelle}.`, source: "Vos données" } };
  }
  return { f: { valeur: REGLES.facteurAbsent, manquant: true, origine: null, detail: "Non disponible : on ne sait pas encore ce qui est déjà vendu.", source: "Asterio (à brancher)" } };
}

// ── Canal déduit du temps restant ────────────────────────────────────────────

export function canalParDelai(joursAvantSejour: number) {
  return REGLES.canalParDelai.find((c) => joursAvantSejour > c.auDela)?.canal ?? REGLES.canalParDelai.at(-1)!.canal;
}


// ── Plan newsletters ─────────────────────────────────────────────────────────

function envoisDuSujet(ctx: Contexte, s: SujetDef) {
  const themes = s.envois.map(norm);
  return (ctx.envois?.donnees.envois ?? []).filter((e) => themes.some((t) => norm(e.theme) === t));
}

/** Verdict d'un marché face au plan d'envois. Un envoi n'atteint que les marchés de sa langue. */
function verdictEnvoi(envoisSujet: Envoi[], fenetre: { debut: string; fin: string } | null, demande: boolean, langue: string): { verdict: Verdict; envoi: Envoi | null } {
  if (!demande) return { verdict: "Pas de demande sur ce marché", envoi: null };
  const envois = envoisSujet.filter((e) => (e.langues ?? ["fr"]).includes(langue));
  const clients = envois.filter((e) => e.cible === "clients");
  const dansFenetre = (e: Envoi) => !fenetre || (e.date >= fenetre.debut && e.date <= fenetre.fin);
  const dedans = clients.find(dansFenetre);
  if (dedans) return { verdict: "Déjà prévu, on garde", envoi: dedans };
  const agences = envois.find((e) => e.cible === "agences" && dansFenetre(e));
  if (agences) return { verdict: "Seules les agences sont touchées", envoi: agences };
  if (fenetre && clients.length) {
    const apres = clients.filter((e) => e.date > fenetre.fin).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (apres) return { verdict: "On envoie trop tard", envoi: apres };
    return { verdict: "Prévu trop tôt", envoi: [...clients].sort((a, b) => b.date.localeCompare(a.date))[0] };
  }
  return { verdict: "Rien n'est prévu, à créer", envoi: null };
}

// ── Opportunités d'un sujet ──────────────────────────────────────────────────

export function periodesDuMarche(ctx: Contexte, s: SujetDef, m: Marche): { libelle: string; sejour: { debut: string; fin: string } | null; vacances: string | null }[] {
  if (s.fenetre_fixe) return [{ libelle: m.nom, sejour: null, vacances: null }];
  if (s.periode_par_marche && s.sejour) {
    const v = ctx.vacances.find((x) => x.id === m.id);
    const noms = s.periode_par_marche.vacances.map(norm);
    const per = (v?.periodes ?? []).filter(
      (p) => noms.some((n) => norm(p.nom).startsWith(n)) && p.fin >= addDays(s.sejour!.debut, -20) && p.debut <= addDays(s.sejour!.fin, 20),
    );
    if (per.length) {
      return per.map((p) => ({
        libelle: per.length > 1 ? `${m.nom} ${p.nom.split(" ").slice(1).join(" ") || p.nom}` : m.nom,
        sejour: { debut: p.debut, fin: p.fin },
        vacances: `${p.nom}, ${formatRange(p.debut, p.fin)}`,
      }));
    }
  }
  return [{ libelle: m.nom, sejour: s.sejour ?? null, vacances: null }];
}

function urgenceDe(date: string, fenetre: { debut: string; fin: string } | null) {
  if (!fenetre) return 0.6;
  if (date > fenetre.fin) return 0;
  if (date >= fenetre.debut) return 1;
  return Math.max(REGLES.urgencePlancher, 1 - semaines(diffDays(fenetre.debut, date)) / REGLES.urgenceHorizonSemaines);
}

export function volumeMaximum(ctx: Contexte) {
  let max = 1;
  for (const s of ctx.sujets) for (const m of ctx.marches) max = Math.max(max, volumeAchat(ctx, s, m.semrush_db));
  return max;
}

export function opportunites(ctx: Contexte, s: SujetDef, volumeMax: number): Opportunite[] {
  const marches = ctx.marches.filter((m) => !s.marches || s.marches.includes(m.id));
  const envois = envoisDuSujet(ctx, s);
  const out: Opportunite[] = [];
  for (const m of marches) {
    for (const p of periodesDuMarche(ctx, s, m)) {
      const delai = delaiMarche(ctx, m);
      const fenetre = s.fenetre_fixe
        ? { ...s.fenetre_fixe }
        : p.sejour && s.famille !== "declencheur"
          ? { debut: addDays(p.sejour.debut, -Math.round(delai.q3 * 7)), fin: addDays(p.sejour.debut, -Math.round(delai.q1 * 7)) }
          : null;
      const jours = diffDays(p.sejour?.debut ?? fenetre?.fin ?? ctx.date, ctx.date);
      const demande = facteurDemande(ctx, s, m, volumeMax);
      const visibilite = facteurVisibilite(ctx, s, m);
      const { f: besoin, otb } = facteurBesoin(ctx, s, m);
      const score = r2(demande.valeur * visibilite.valeur * besoin.valeur * 100);
      const urgence = r2(urgenceDe(ctx.date, fenetre));
      const demandeDetectee = demande.valeur > REGLES.demandePlancher || (demande.manquant && !ctx.semrush);
      const close = Boolean(fenetre && ctx.date > fenetre.fin);
      const { verdict, envoi } = verdictEnvoi(envois, fenetre, demandeDetectee, m.langue);
      out.push({
        cle: `${s.id}:${m.id}:${p.sejour?.debut ?? "fixe"}`,
        marche: m.id,
        libelle: p.libelle,
        sejour: p.sejour,
        fenetre,
        delai: { mediane: r2(delai.mediane), q1: r2(delai.q1), q3: r2(delai.q3), origine: delai.origine },
        facteurs: { demande, visibilite, besoin },
        score,
        urgence,
        ordre: r2(score * urgence),
        type: otb ? (otb.otb >= otb.otb_n1 ? "défensive" : "offensive") : "offensive",
        close,
        demandeDetectee,
        dateProposee:
          fenetre && demandeDetectee && !close ? maxDate(ctx.date, addDays(fenetre.debut, diffDays(fenetre.fin, fenetre.debut) * REGLES.partFenetre)) : null,
        envoi,
        verdict,
        canalADate: canalParDelai(jours),
        vacances: p.vacances,
      });
    }
  }
  return out.sort((a, b) => b.ordre - a.ordre);
}

// ── Activations en vagues (P3, section Activations) ──────────────────────────

const statut = (code: Statut["code"], libelle: string): Statut => ({ code, libelle });

function grouper<T>(items: T[], date: (t: T) => string): T[][] {
  const tries = [...items].sort((a, b) => date(a).localeCompare(date(b)));
  const groupes: T[][] = [];
  for (const it of tries) {
    const g = groupes.at(-1);
    if (g && diffDays(date(it), date(g[0])) <= REGLES.ecartVagueJours) g.push(it);
    else groupes.push([it]);
  }
  return groupes;
}

const libelleMarches = (ops: Opportunite[]) => [...new Set(ops.map((o) => o.libelle))].join(", ");
const langues = (ctx: Contexte, ops: Opportunite[]) =>
  [...new Set(ops.map((o) => ctx.marches.find((m) => m.id === o.marche)!.langue))].map((l) => ({ fr: "français", en: "anglais", nl: "néerlandais" })[l]);

function ligneBaseCrm(ctx: Contexte, s: SujetDef) {
  const perf = ctx.perfNl?.donnees.envois ?? [];
  if (perf.length) {
    const envois = perf.reduce((t, p) => t + p.envois, 0);
    const ouv = perf.reduce((t, p) => t + p.ouvertures, 0);
    const clics = perf.reduce((t, p) => t + p.clics, 0);
    const proche = perf.filter((p) => s.envois.some((e) => norm(e) === norm(p.theme)));
    const base = `${Math.round((ouv / envois) * 100)} % d'ouverture et ${((clics / envois) * 100).toFixed(1).replace(".", ",")} % de clic en moyenne sur ${perf.length} envois`;
    return `${base}${proche.length ? `, dont ${proche.length} sur ce thème` : ""} (${src(ctx.perfNl!, "outil d'emailing")}).`;
  }
  if (Number(ctx.saisie.ouv) > 0) return `${ctx.saisie.ouv} % d'ouverture et ${ctx.saisie.clic || "?"} % de clic en moyenne (saisi).`;
  return "Pas de référence : la performance des newsletters n'a pas été communiquée.";
}

function ligneBaseSea(ctx: Contexte, s: SujetDef) {
  const c = ctx.ads?.donnees.campagnes.filter((x) => x.sujet === s.id) ?? [];
  if (!c.length) return "Pas de référence : aucun historique de campagne communiqué.";
  const budget = c.reduce((t, x) => t + x.budget, 0);
  const conv = c.reduce((t, x) => t + x.conversions, 0);
  return `CPA moyen ${nombre(Math.round(budget / Math.max(1, conv)))} € sur ${c.length} campagnes de la saison passée (${src(ctx.ads!, "Google Ads")}).`;
}

function semantiqueDe(ctx: Contexte, s: SujetDef, ops: Opportunite[]) {
  const bases = new Set(ops.map((o) => ctx.marches.find((m) => m.id === o.marche)!.semrush_db));
  return [...new Set(s.requetes.filter((q) => bases.has(q.base) && q.usage !== "veille").map((q) => q.requete))];
}

export function activations(ctx: Contexte, s: SujetDef, ops: Opportunite[], ouvert: boolean, evenementsLies: Evenement[]): Activation[] {
  const ferme = statut("ferme", "Maison fermée, sans objet");
  const plein = ctx.saisie.rempl[s.id] === "plein";
  const actives = ops.filter((o) => o.demandeDetectee && !o.close && o.fenetre);
  const interdits = [...VOCABULAIRE_INTERDIT, ...(s.vocabulaire_interdit ?? [])];
  const typeSujet = ops.some((o) => o.type === "défensive") && !ops.some((o) => o.type === "offensive") ? "défensive" : "offensive";
  const aConfirmer = evenementsLies.find((e) => !e.confirme);
  const fermetureInconnue = s.conditionne_fermeture && !ctx.saisie.fermeture;
  const reserve = (st: Statut) => (!ouvert ? ferme : fermetureInconnue ? statut("a_confirmer", "Date de fermeture à confirmer") : st);
  const out: Activation[] = [];
  const base = {
    sujetId: s.id,
    type: typeSujet as Activation["type"],
    interdits,
    message: s.angle,
  };

  // Déclencheur neige : pas de date fixe, une activation en veille sur prévision.
  if (s.famille === "declencheur" && s.sejour) {
    const seuil = s.seuil_neige_5j_cm ?? REGLES.seuilNeige5jCm;
    const n5 = ctx.prevision?.donnees.neige_5j ?? 0;
    const declenche = ctx.prevision && n5 >= seuil && ctx.date >= addDays(s.sejour.debut, -10) && ctx.date <= s.sejour.fin;
    const marches = ops.map((o) => o.marche);
    out.push({
      ...base,
      cle: `${s.id}:declencheur`,
      canal: "declencheur",
      objectif: "Capter les réservations de dernière minute des marchés proches quand la neige tombe ou s'annonce.",
      cible: libelleMarches(ops),
      semantique: semantiqueDe(ctx, s, ops),
      assets: "Annonces Google prêtes à activer, message push et CRM flash, renvoi vers la page de la maison.",
      declencheur: `Prévision Open-Meteo supérieure ou égale à ${seuil} cm sur 5 jours, pendant la saison, dans les 10 jours avant l'arrivée.`,
      justification: "Les marchés proches réservent moins de 10 jours avant l'arrivée : la neige annoncée décide.",
      changement: "Rien au plan d'envois : activation conditionnelle.",
      effort: "Annonces et message préparés une fois, activés sur décision.",
      kpi: "Réservations à J-7 sur les marchés proches, coût par acquisition.",
      ligneBase: "Pas de référence : corrélation entre chutes à J-10 et réservations à établir avec Asterio.",
      vagues: [
        {
          numero: 1,
          debut: maxDate(ctx.date, s.sejour.debut),
          fin: s.sejour.fin,
          marches,
          libelleMarches: libelleMarches(ops),
          note: ctx.prevision ? `${n5} cm prévus sur 5 jours au relevé du ${formatDate(ctx.prevision.collecte_le, true)}` : "Prévision non chargée",
          statut: declenche ? statut("declencher", "À déclencher maintenant") : statut("veille", "En veille"),
        },
      ],
      statut: !ouvert ? ferme : declenche ? statut("declencher", `À déclencher : ${n5} cm annoncés`) : statut("veille", `En veille, seuil ${seuil} cm sur 5 jours`),
    });
    return out;
  }

  if (actives.length === 0) return out;

  // 1. CRM : vagues datées au premier tiers de chaque fenêtre, marchés à moins de 10 jours regroupés.
  const crmVagues: Vague[] = grouper(actives, (o) => o.dateProposee!).map((g, i) => {
    const date = minDate(maxDate(...g.map((o) => o.dateProposee!)), ...g.map((o) => o.fenetre!.fin));
    const fin = minDate(...g.map((o) => o.fenetre!.fin));
    const existant = g.every((o) => o.verdict === "Déjà prévu, on garde") ? g[0].envoi : null;
    return {
      numero: i + 1,
      debut: existant ? existant.date : maxDate(date, ctx.date),
      fin,
      marches: [...new Set(g.map((o) => o.marche))],
      libelleMarches: libelleMarches(g),
      note: existant ? `Envoi existant du ${formatDate(existant.date)} conservé (« ${existant.theme} »)` : `À créer, ${langues(ctx, g).join(" et ")}`,
      statut: reserve(existant ? statut("existant", "Envoi existant conservé") : statut("a_creer", "À créer")),
    };
  });
  const envoisLies = envoisDuSujet(ctx, s).filter((e) => e.cible === "clients");
  const trop = actives.filter((o) => o.verdict === "On envoie trop tard");
  const garde = actives.filter((o) => o.verdict === "Déjà prévu, on garde");
  const creees = crmVagues.filter((v) => v.statut.code === "a_creer");
  out.push({
    ...base,
    cle: `${s.id}:crm`,
    canal: s.famille === "b2b" ? "agences" : "crm",
    objectif: "Parler à chaque marché pendant sa fenêtre d'achat, avant qu'il ne décide.",
    cible: `${s.famille === "b2b" ? "Agences et entreprises" : "Clients et inscrits Lodge Park"}, ${s.cibles.charAt(0).toLowerCase()}${s.cibles.slice(1)}`,
    semantique: semantiqueDe(ctx, s, actives),
    assets: `Un envoi maître décliné en ${crmVagues.length} version${crmVagues.length > 1 ? "s" : ""} datée${crmVagues.length > 1 ? "s" : ""}, ${langues(ctx, actives).join(", ")}.`,
    declencheur: "Ouverture de la fenêtre d'achat de chaque marché.",
    justification: `Dates placées au premier tiers de chaque fenêtre d'achat ; les marchés dont les dates tombent à moins de ${REGLES.ecartVagueJours} jours sont regroupés en une vague, datée sur la fenêtre la plus contraignante.`,
    changement: envoisLies.length
      ? `${garde.length ? `L'envoi du ${formatDate(garde[0].envoi!.date)} est conservé pour ${libelleMarches(garde)}. ` : ""}${trop.length ? `L'envoi du ${formatDate(trop[0].envoi!.date)} arrive après la fenêtre de ${libelleMarches(trop)}. ` : ""}${creees.length ? `${creees.length} vague${creees.length > 1 ? "s" : ""} créée${creees.length > 1 ? "s" : ""}, la première le ${formatDate(creees[0].debut, true)}.` : ""}`.trim()
      : `Aucun envoi du plan ne porte ce sujet : ${crmVagues.length} vague${crmVagues.length > 1 ? "s" : ""} à créer.`,
    effort: "Interne : un envoi décliné par marché.",
    kpi: "Ouvertures, clics, réservations directes à J+10 par marché.",
    ligneBase: ligneBaseCrm(ctx, s),
    vagues: crmVagues,
    statut: reserve(creees.length ? statut("a_creer", `${creees.length} vague${creees.length > 1 ? "s" : ""} à créer`) : statut("existant", "Plan existant conservé")),
  });

  // 2. SEO et GEO : en ligne au plus tard 6 semaines avant le pic, et avant l'ouverture des fenêtres proches.
  const pics = s.requetes
    .filter((q) => q.usage === "achat")
    .map((q) => volume(ctx, q.requete, q.base))
    .filter((l): l is LigneSemrush => Boolean(l))
    .map((l) => prochainPic(l, ctx.date))
    .filter((d): d is string => Boolean(d))
    .sort();
  const fenetresProches = actives.filter((o) => ctx.marches.find((m) => m.id === o.marche)!.court).map((o) => o.fenetre!.debut);
  const limiteBrute = minDate(...[pics[0] ? addDays(pics[0], -REGLES.seoAvantPicJours) : null, ...fenetresProches].filter((d): d is string => Boolean(d)), addDays(minDate(...actives.map((o) => o.fenetre!.fin)), -7));
  const enLigne = maxDate(limiteBrute, addDays(ctx.date, 14));
  const pages = ctx.gsc?.donnees.pages_par_sujet[s.id] ?? [];
  const aMettreAJour = pages.find((p) => p.decision.startsWith("mettre"));
  const decision = aMettreAJour
    ? `Mettre à jour ${aMettreAJour.page} (${nombre(aMettreAJour.impressions)} impressions, ${nombre(aMettreAJour.clics)} clics, position ${String(aMettreAJour.position).replace(".", ",")}).`
    : pages.length
      ? "Créer une page dédiée : aucune page ne traite le sujet, les impressions tombent sur l'accueil et les pages de service."
      : "Créer ou mettre à jour : inventaire des contenus à faire (crawl de la Content Factory).";
  const gscReq = s.requetes.map((q) => ctx.gsc?.donnees.requetes[q.requete]).filter(Boolean) as { impressions: number; clics: number }[];
  out.push({
    ...base,
    cle: `${s.id}:seo`,
    canal: "seo",
    objectif: "Exister sur les requêtes d'achat du sujet avant le pic de recherche, et donner une destination aux autres canaux.",
    cible: `Recherche organique et réponses des moteurs IA, ${langues(ctx, actives).join(", ")}.`,
    semantique: semantiqueDe(ctx, s, actives),
    assets: decision,
    declencheur: pics[0] ? `Pic de recherche en ${monthName(Number(pics[0].slice(5, 7)))}.` : "Ouverture des fenêtres d'achat.",
    justification: `En ligne au plus tard ${REGLES.seoAvantPicJours / 7} semaines avant le pic de recherche et avant l'ouverture des fenêtres des marchés proches.`,
    changement: "Rien au plan d'envois. La page devient la destination des envois et des campagnes, au lieu de la page d'accueil.",
    effort: "Production Content Factory.",
    kpi: "Impressions et clics sur les requêtes cibles à 8 semaines, position, présence dans les réponses IA (Peec).",
    ligneBase: gscReq.length
      ? `${nombre(gscReq.reduce((t, g) => t + g.impressions, 0))} impressions et ${nombre(gscReq.reduce((t, g) => t + g.clics, 0))} clics sur les requêtes du sujet en 12 mois (${src(ctx.gsc!, "Search Console")}).`
      : "Pas de référence.",
    vagues: [
      {
        numero: 1,
        debut: maxDate(ctx.date, addDays(enLigne, -45)),
        fin: enLigne,
        marches: [...new Set(actives.map((o) => o.marche))],
        libelleMarches: langues(ctx, actives).join(", "),
        note: `En ligne au plus tard le ${formatDate(enLigne, true)}`,
        statut: reserve(aConfirmer ? statut("a_confirmer", `Date « ${aConfirmer.nom} » à confirmer`) : statut("a_lancer", "À lancer")),
      },
    ],
    statut: reserve(aConfirmer ? statut("a_confirmer", `Date « ${aConfirmer.nom} » à confirmer`) : statut("a_lancer", "À lancer")),
  });

  // 3 et 4. Payant : Google Ads pour les marchés proches, Meta pour les marchés lointains.
  for (const canal of ["sea", "meta"] as const) {
    const ops2 = actives.filter((o) => ctx.marches.find((m) => m.id === o.marche)!.court === (canal === "sea"));
    if (!ops2.length || s.famille === "b2b") continue;
    const acces = canal === "sea" ? ctx.saisie.acces_google_ads : ctx.saisie.acces_meta;
    const st = plein
      ? statut("suspendu", "Suspendu : déjà bien vendu")
      : !acces
        ? statut("bloque", `Bloqué : accès ${canal === "sea" ? "Google Ads" : "Meta"}`)
        : statut("a_lancer", "À lancer");
    const vagues: Vague[] = grouper(ops2, (o) => o.fenetre!.debut).map((g, i) => ({
      numero: i + 1,
      debut: maxDate(ctx.date, minDate(...g.map((o) => o.fenetre!.debut))),
      fin: maxDate(...g.map((o) => o.fenetre!.fin)),
      marches: [...new Set(g.map((o) => o.marche))],
      libelleMarches: libelleMarches(g),
      note: g.map((o) => `${o.libelle} du ${formatDate(maxDate(ctx.date, o.fenetre!.debut))} au ${formatDate(o.fenetre!.fin)}`).join(" ; "),
      statut: reserve(st),
    }));
    out.push({
      ...base,
      cle: `${s.id}:${canal}`,
      canal,
      objectif: canal === "sea" ? "Capter la demande d'achat des marchés proches pendant leur fenêtre, courte." : "Tenir la fenêtre des marchés lointains, qui décident tôt et que le CRM ne couvre pas seul.",
      cible: canal === "sea" ? `${libelleMarches(ops2)}, géociblage et langue du marché.` : `${libelleMarches(ops2)}, géociblage, centres d'intérêt et reciblage des visiteurs des pages en langue étrangère.`,
      semantique: semantiqueDe(ctx, s, ops2),
      assets: "La page de l'activation référencement comme destination, visuels du sujet.",
      declencheur: "Ouverture de la fenêtre d'achat de chaque marché, diffusion continue jusqu'à sa fermeture.",
      justification: "Une diffusion démarre à l'ouverture de la fenêtre, pas à son premier tiers ; chaque marché reste borné par sa propre fenêtre.",
      changement: "Rien au plan d'envois.",
      effort: "Budget à fixer avec l'équipe, à partir de l'historique des campagnes.",
      kpi: "Coût par acquisition, réservations attribuées, retour sur dépense publicitaire.",
      ligneBase: canal === "sea" ? ligneBaseSea(ctx, s) : "Pas de référence : aucun historique de campagne communiqué.",
      vagues,
      statut: reserve(st),
    });
  }

  // 5. Social organique, pendant la période et autour des événements rattachés.
  if (s.sejour && s.famille !== "b2b") {
    const premierEv = evenementsLies.filter((e) => e.debut >= addDays(s.sejour!.debut, -15)).sort((a, b) => a.debut.localeCompare(b.debut))[0];
    const debut = maxDate(ctx.date, minDate(addDays(s.sejour.debut, -14), premierEv ? addDays(premierEv.debut, -10) : s.sejour.debut));
    out.push({
      ...base,
      cle: `${s.id}:social`,
      canal: "social",
      objectif: "Donner à voir ce qui se passe sur place, pour nourrir l'envie et les autres canaux.",
      cible: "Audience Instagram de la maison et du groupe.",
      semantique: [],
      assets: evenementsLies.length ? `Publications liées à : ${evenementsLies.slice(0, 4).map((e) => e.nom).join(", ")}.` : "Publications sur le thème du sujet.",
      declencheur: evenementsLies.length ? `Dates des événements de la station (${evenementsLies.slice(0, 3).map((e) => `${e.nom} le ${formatDate(e.debut)}`).join(", ")}).` : "Période de séjour.",
      justification: "Période de séjour et événements confirmés à l'agenda de la station.",
      changement: "Rien au plan d'envois.",
      effort: "Interne.",
      kpi: "Portée, enregistrements, clics sortants vers la page cible.",
      ligneBase: "Pas de référence : l'accès Instagram n'est pas obtenu.",
      vagues: [
        {
          numero: 1,
          debut,
          fin: s.sejour.fin,
          marches: [...new Set(actives.map((o) => o.marche))],
          libelleMarches: "Instagram",
          note: premierEv ? `Premier rendez-vous : ${premierEv.nom}, ${formatDate(premierEv.debut)}` : "Pendant le séjour",
          statut: reserve(aConfirmer ? statut("a_confirmer", `Date « ${aConfirmer.nom} » à confirmer`) : statut("a_lancer", "À lancer")),
        },
      ],
      statut: reserve(statut("a_lancer", "À lancer")),
    });
  }

  return out.slice(0, REGLES.maxActivations);
}

// ── Sujet calculé : fiche de thème ───────────────────────────────────────────

/** Événements rattachés à un sujet : même nom, et pendant la période (à 15 jours près). */
function lier(ev: Evenement[], noms: string[], periode?: { debut: string; fin: string }) {
  const n = noms.map(norm);
  return ev.filter(
    (e) =>
      n.some((x) => norm(e.nom).includes(x) || x.includes(norm(e.nom))) &&
      (!periode || (e.fin >= addDays(periode.debut, -15) && e.debut <= addDays(periode.fin, 15))),
  );
}

export function calculerSujet(ctx: Contexte, s: SujetDef, volumeMax: number): SujetCalcule {
  const ops = opportunites(ctx, s, volumeMax);
  const evenements = ctx.agenda?.donnees.evenements ?? [];
  const evenementsLies = lier(evenements, s.evenements, s.sejour);
  const autresEvenements = s.sejour
    ? evenements
        .filter((e) => e.debut >= s.sejour!.debut && e.debut <= s.sejour!.fin && e.type !== "décor" && !evenementsLies.includes(e))
        .slice(0, 8)
    : [];
  let ouvert = true;
  const per = s.sejour ?? null;
  if (per && ctx.saisie.ouverture && ctx.saisie.ouverture > per.fin) ouvert = false;
  if (per && ctx.saisie.fermeture && ctx.saisie.fermeture < per.debut) ouvert = false;
  const acts = activations(ctx, s, ops, ouvert, evenementsLies);
  const actives = ops.filter((o) => o.demandeDetectee && !o.close);
  const tete = actives[0] ?? ops[0];
  const fen = actives.filter((o) => o.fenetre);
  const toutesVagues = acts.flatMap((a) => a.vagues.filter((v) => v.statut.code !== "ferme"));
  const premiere = toutesVagues.map((v) => v.debut).sort()[0] ?? null;

  // Textes de la fiche : pourquoi ce sujet, pourquoi maintenant, ce qui change.
  const envoisLies = envoisDuSujet(ctx, s);
  const couvertes = actives.filter((o) => o.verdict === "Déjà prévu, on garde").length;
  let pourquoi: string;
  if (s.famille === "declencheur") {
    pourquoi = `${s.theme} La maison est déjà visible sur la météo et les webcams : le levier est l'activation sur prévision, pas le contenu.`;
  } else if (!tete?.fenetre) {
    pourquoi = s.theme;
  } else {
    const etat =
      ctx.date >= tete.fenetre.debut
        ? `est ouverte depuis le ${formatDate(tete.fenetre.debut)} et se ferme le ${formatDate(tete.fenetre.fin, true)}`
        : `s'ouvre le ${formatDate(tete.fenetre.debut, true)}, dans ${diffDays(tete.fenetre.debut, ctx.date)} jours`;
    const plan = envoisLies.length
      ? `Le plan d'envois porte le sujet ${envoisLies.length === 1 ? "une fois" : `${envoisLies.length} fois`} (${envoisLies.map((e) => `${formatDate(e.date)}, ${e.cible}`).join(" ; ")}) : ${couvertes} fenêtre${couvertes > 1 ? "s" : ""} sur ${actives.length} ${couvertes > 1 ? "sont couvertes" : "est couverte"}.`
      : "Aucun envoi du plan ne porte ce sujet.";
    pourquoi = `La fenêtre d'achat ${tete.libelle === "tous marchés" ? "" : `de ${tete.libelle} `}${etat}. ${plan}`;
  }
  const dem = tete ? tete.facteurs.demande : null;
  const gscTop = s.requetes
    .filter((q) => q.usage === "achat")
    .map((q) => ({ q, g: ctx.gsc?.donnees.requetes[q.requete] }))
    .filter((x) => x.g)
    .sort((a, b) => (b.g!.impressions ?? 0) - (a.g!.impressions ?? 0))[0];
  const maintenant = [
    dem && !dem.manquant ? dem.detail : null,
    gscTop
      ? gscTop.g!.impressions
        ? `Sur Google, « ${gscTop.q.requete} » : ${nombre(gscTop.g!.impressions)} impressions, ${nombre(gscTop.g!.clics)} clics, position ${String(gscTop.g!.position).replace(".", ",")}.`
        : `Sur Google, la maison n'apparaît jamais sur « ${gscTop.q.requete} ».`
      : null,
    premiere ? `Première action le ${formatDate(premiere, true)}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const crm = acts.find((a) => a.canal === "crm" || a.canal === "agences");
  const changement = crm?.changement ?? (acts.length ? "Rien au plan d'envois." : "Aucune activation proposée à cette date.");

  // Ce qui manque pour trancher.
  const manque: string[] = [];
  if (ops.some((o) => o.facteurs.besoin.manquant))
    manque.push("Le remplissage : on the books et rythme contre l'an dernier par semaine et par marché (Asterio), ou à défaut le remplissage saisi dans Vos données. Sans lui, rien ne distingue une semaine à remplir d'une semaine déjà vendue.");
  if (ops.some((o) => o.delai.origine === "estimation"))
    manque.push("Les délais de réservation réels par pays (Asterio) : toutes les fenêtres reposent sur des estimations ; deux semaines d'écart déplacent la moitié des dates proposées.");
  const sansVisibilite = [...new Set(ops.filter((o) => o.facteurs.visibilite.manquant && o.demandeDetectee).map((o) => o.libelle))];
  if (sansVisibilite.length) manque.push(`Requêtes d'achat suivies dans la Search Console pour ${sansVisibilite.join(", ")} : la visibilité y est estimée.`);
  const sansDemande = [...new Set(ops.filter((o) => !o.demandeDetectee).map((o) => o.libelle))];
  if (sansDemande.length && s.famille !== "declencheur") manque.push(`Aucune requête d'achat sur les bases Semrush de ${sansDemande.join(", ")} : la sémantique du sujet est à compléter sur ces marchés.`);
  if (!ctx.perfNl && acts.some((a) => a.canal === "crm")) manque.push("La performance des newsletters passées : aucune activation CRM ne peut porter une cible chiffrée.");
  if (acts.some((a) => a.canal === "sea") && !ctx.saisie.acces_google_ads) manque.push("L'accès en lecture à Google Ads.");
  if (acts.some((a) => a.canal === "meta") && !ctx.saisie.acces_meta) manque.push("L'accès au compte Meta Ads.");
  if (s.conditionne_fermeture && !ctx.saisie.fermeture) manque.push("La date de fermeture de la maison : le sujet la suppose ouverte jusqu'au bout.");
  if (!ctx.saisie.ouverture && s.sejour && s.sejour.debut < "2026-12-20") manque.push("La date de réouverture de la maison : une maison fermée sur la période coupe toutes les actions.");
  for (const e of evenementsLies.filter((x) => !x.confirme)) manque.push(`La date 2027 de « ${e.nom} », à confirmer avant toute production.`);
  for (const v of ctx.vacances.filter((v) => v.ecart_controle && ops.some((o) => o.marche === v.id && o.demandeDetectee))) manque.push(`${v.nom} : ${v.ecart_controle}`);
  if (ctx.maison.base_de_marque === "à produire") manque.push("La base de marque Lodge Park : sans elle, les messages restent descriptifs et le vocabulaire autorisé n'est pas fixé.");

  const visib = actives.find((o) => !o.facteurs.visibilite.manquant)?.facteurs.visibilite.valeur ?? null;
  return {
    def: s,
    opportunites: ops,
    activations: acts,
    ouvert,
    remplissage: ctx.saisie.rempl[s.id] ?? "inconnu",
    score: Math.max(0, ...ops.map((o) => o.score)),
    urgence: Math.max(0, ...(actives.length ? actives : ops).map((o) => o.urgence)),
    ordre: Math.max(0, ...ops.map((o) => o.ordre)),
    ecart: visib,
    fenetre: fen.length ? { debut: minDate(...fen.map((o) => o.fenetre!.debut)), fin: maxDate(...fen.map((o) => o.fenetre!.fin)) } : null,
    pourquoi,
    maintenant,
    changement,
    manque,
    premiereAction: premiere,
    evenementsLies,
    autresEvenements,
  };
}

/** Intérêt d'un sujet : demande × reste à gagner, sur sa meilleure ligne. */
export function interet(s: SujetCalcule) {
  return Math.max(0, ...s.opportunites.map((o) => o.facteurs.demande.valeur * o.facteurs.visibilite.valeur));
}

export function calculerSaison(ctx: Contexte) {
  const vmax = volumeMaximum(ctx);
  const sujets = ctx.sujets.map((s) => calculerSujet(ctx, s, vmax));
  // Classés par urgence puis par intérêt ; une maison fermée passe en dernier.
  sujets.sort((a, b) => Number(b.ouvert) - Number(a.ouvert) || b.urgence - a.urgence || b.score - a.score);
  return sujets;
}

// ── À faire dans les six semaines ────────────────────────────────────────────

export function aFaire(ctx: Contexte, sujets: SujetCalcule[]): ActionAFaire[] {
  const limite = addDays(ctx.date, REGLES.horizonAFaireJours);
  const out: ActionAFaire[] = [];
  for (const s of sujets) {
    for (const a of s.activations) {
      for (const v of a.vagues) {
        if (v.fin < ctx.date || v.debut > limite) continue;
        if (a.canal === "declencheur" && v.statut.code === "veille") continue;
        const enRetard = v.debut < ctx.date;
        const quoi =
          a.canal === "seo"
            ? `${canalCourt.seo} ${s.def.nom.toLowerCase()} : ${v.note.charAt(0).toLowerCase()}${v.note.slice(1)}`
            : `${canalCourt[a.canal]} ${s.def.nom.toLowerCase()}${a.vagues.length > 1 ? `, vague ${v.numero}` : ""}`;
        const qui = v.libelleMarches;
        const seo = s.activations.find((x) => x.canal === "seo");
        const titre =
          a.canal === "crm"
            ? v.statut.code === "existant"
              ? `Garder l'envoi prévu, pour ${qui}`
              : `Envoyer la newsletter${a.vagues.length > 1 ? ` (vague ${v.numero})` : ""} à ${qui}`
            : a.canal === "agences"
              ? `Écrire aux agences et entreprises, ${qui}`
              : a.canal === "seo"
                ? seo?.assets.startsWith("Mettre à jour")
                  ? `Mettre à jour la page ${seo.assets.split(" ")[3]}, en ligne au plus tard le ${formatDate(v.fin)}`
                  : `Créer la page « ${s.def.nom} », en ligne au plus tard le ${formatDate(v.fin)}`
                : a.canal === "sea"
                  ? `Lancer Google Ads pour ${qui}`
                  : a.canal === "meta"
                    ? `Lancer Meta Ads pour ${qui}`
                    : a.canal === "social"
                      ? `Publier sur Instagram${s.evenementsLies[0] ? ` autour de « ${s.evenementsLies[0].nom} »` : ""}`
                      : "Activer le déclencheur neige";
        out.push({
          date: enRetard ? ctx.date : v.debut,
          quoi,
          titre,
          sujetId: s.def.id,
          sujetNom: s.def.nom,
          activationCle: a.cle,
          canal: a.canal,
          marches: v.marches,
          statut: v.statut,
          enRetard,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.sujetNom.localeCompare(b.sujetNom));
}
