import { addDays, diffDays, formatDate } from "@/lib/dates";
import { clientsDe } from "@/lib/format";
import type { ActionAFaire, Activation, Marche, Opportunite, SujetCalcule } from "@/lib/types";
import { LANGUES, indicateurs, type Contexte } from "./calcul";
import { NOM_CANAL, mardiSuivant, type IndicateursMarche } from "./marches";

// Décisions lisibles et recommandations par levier. Fonctions pures : elles ne font que mettre en
// mots ce que le calcul a déjà établi (fenêtres, facteurs, plan d'envois, indicateurs de marché).

const fmt = new Intl.NumberFormat("fr-FR");
const n = (x: number) => fmt.format(Math.round(x));

/** Pays avec son article, pour les phrases (« la France », « le Royaume-Uni », « les États-Unis »). */
export function lePays(m: Marche) {
  if (["États-Unis", "Émirats arabes unis", "Pays-Bas"].includes(m.nom)) return `les ${m.nom}`;
  if (m.nom === "Israël") return "Israël";
  if (/^[AEIOUÉ]/.test(m.nom)) return `l'${m.nom}`;
  return ["Royaume-Uni", "Portugal", "Brésil"].includes(m.nom) ? `le ${m.nom}` : `la ${m.nom}`;
}
export const pourLe = (m: Marche) => {
  const l = lePays(m);
  return l.startsWith("le ") ? `pour le ${m.nom}` : l.startsWith("les ") ? `pour les ${m.nom}` : `pour ${l}`;
};

const FUSEAU: Record<string, string> = {
  fr: "heure de Paris", ch: "heure de Zurich", be: "heure de Bruxelles", it: "heure de Rome", uk: "heure de Londres", pt: "heure de Lisbonne",
  us: "heure de New York", br: "heure de São Paulo", tr: "heure d'Istanbul", ru: "heure de Moscou", gr: "heure d'Athènes",
  sa: "heure de Riyad", ae: "heure de Dubaï", il: "heure de Tel-Aviv",
};

/** Accroche propre à chaque marché : ce qui parle à ces clients-là. */
const ACCROCHE: Record<string, string> = {
  fr: "Vos dates de vacances, réservées au cœur du village",
  ch: "À une heure de Genève, un séjour qui se décide la veille",
  be: "Les vacances de carnaval à la montagne, sans changer de langue",
  uk: "Half-term in Megève: English-speaking ski school, transfer from Geneva",
  us: "The most refined village of the French Alps, one flight to Geneva",
  it: "Megève, a due passi dal Monte Bianco",
  tr: "Megève in January: the French Alps, a short flight to Geneva",
  ru: "New Year in the French Alps, in the heart of Megève",
  sa: "A private winter in the French Alps, for the whole family",
  ae: "Winter break in the French Alps, a direct flight to Geneva",
  gr: "Megève for the holidays: snow, village and fine dining",
  pt: "Megève in winter, the elegance of a French Alpine village",
  br: "Inverno nos Alpes franceses, no coração de Megève",
  il: "Megève for the holidays, the French Alps at their most refined",
};

/** Message clé décliné par marché : l'angle du sujet, l'accroche du marché, la langue réellement disponible. */
export function messageMarche(s: SujetCalcule, m: Marche) {
  const langue = m.langue_site === false ? `en anglais (aucune page en ${LANGUES[m.langue_locale ?? ""] ?? m.langue_locale})` : `en ${LANGUES[m.langue] ?? m.langue}`;
  return { accroche: ACCROCHE[m.id] ?? s.def.angle, angle: s.def.angle, langue };
}

// ── Décision d'un sujet ──────────────────────────────────────────────────────

export type Confiance = "fiable" | "partiel" | "estimé";

export interface DecisionSujet {
  phrase: string;
  verbe: "Lancer maintenant" | "Préparer" | "Garder le plan" | "Ne rien lancer";
  marche: Marche | null;
  opportunite: Opportunite | null;
  confiance: Confiance;
  confianceDetail: string;
  changerAvis: string[];
}

const ligneDe = (s: SujetCalcule) => s.opportunites.find((o) => o.demandeDetectee && !o.close && o.fenetre) ?? s.opportunites.find((o) => !o.close) ?? null;

export function confianceDe(o: Opportunite | null): { confiance: Confiance; detail: string } {
  if (!o) return { confiance: "estimé", detail: "Aucune ligne de marché exploitable." };
  const mesures = [o.facteurs.demande, o.facteurs.visibilite, o.facteurs.besoin].filter((f) => !f.manquant && (f.origine === "mesuré" || f.origine === "saisi")).length;
  const delaiMesure = o.delai.origine === "mesuré";
  const total = mesures + (delaiMesure ? 1 : 0);
  const confiance: Confiance = total >= 4 ? "fiable" : total >= 2 ? "partiel" : "estimé";
  return { confiance, detail: `${mesures} facteur${mesures > 1 ? "s" : ""} sur 3 mesuré${mesures > 1 ? "s" : ""}, délai ${delaiMesure ? "mesuré dans Asterio" : "estimé"}.` };
}

export function decisionSujet(ctx: Contexte, s: SujetCalcule): DecisionSujet {
  const o = ligneDe(s);
  const m = o ? (ctx.marches.find((x) => x.id === o.marche) ?? null) : null;
  const { confiance, detail } = confianceDe(o);
  const base = { marche: m, opportunite: o, confiance, confianceDetail: detail };
  if (!s.ouvert) return { ...base, verbe: "Ne rien lancer", phrase: "Ne rien lancer : la maison est fermée sur cette période.", changerAvis: ["Une réouverture avancée remettrait le sujet en jeu."] };
  if (!o || !m || !o.fenetre) return { ...base, verbe: "Ne rien lancer", phrase: "Ne rien lancer : aucune fenêtre d'achat ouverte ou à venir.", changerAvis: [] };
  const ind = indicateurs(ctx).get(m.id);
  const raisons: string[] = [];
  raisons.push(ctx.date >= o.fenetre.debut ? `que la fenêtre d'achat ferme le ${formatDate(o.fenetre.fin)}` : `que la fenêtre d'achat s'ouvre le ${formatDate(o.fenetre.debut)}`);
  const b = o.facteurs.besoin;
  const chiffres = /^(\d+) nuitées réservées contre (\d+)/.exec(b.detail);
  if (!b.manquant && chiffres)
    raisons.push(
      Number(chiffres[1]) === 0
        ? `qu'aucune nuitée n'est encore réservée, contre ${chiffres[2]} l'an dernier à la même date`
        : `que ${chiffres[1]} nuitées sont réservées contre ${chiffres[2]} l'an dernier à la même date`,
    );
  else if (ind) raisons.push(`que ce marché a pesé ${n(ind.nuiteesN1)} nuitées l'hiver précédent`);
  raisons.push(
    o.verdict === "Déjà prévu, on garde"
      ? "que le plan d'envois le couvre déjà"
      : o.verdict === "On envoie trop tard"
        ? "que l'envoi prévu part après la fermeture de la fenêtre"
        : o.verdict === "Prévu trop tôt"
          ? "que l'envoi prévu part avant l'ouverture de la fenêtre"
          : "que rien n'est prévu au plan d'envois",
  );
  const verbe: DecisionSujet["verbe"] = o.verdict === "Déjà prévu, on garde" ? "Garder le plan" : ctx.date >= o.fenetre.debut ? "Lancer maintenant" : "Préparer";
  const tete =
    verbe === "Garder le plan"
      ? `Garder le plan ${pourLe(m)}`
      : verbe === "Lancer maintenant"
        ? `Lancer maintenant ${pourLe(m)}`
        : `Préparer dès maintenant ${pourLe(m).replace(/^pour /, "l'envoi pour ")}`;
  const liste = raisons.length > 1 ? `${raisons.slice(0, -1).join(", ")} et ${raisons.at(-1)}` : raisons[0];
  const changerAvis: string[] = [];
  if (/contre (\d+)/.test(b.detail)) {
    const n1 = Number(/contre (\d+)/.exec(b.detail)![1]);
    changerAvis.push(`Si les réservations ${pourLe(m).replace("pour ", "de ").replace("de le ", "du ").replace("de les ", "des ")} dépassent ${n1} nuitées à date, la période n'a plus besoin d'être poussée : on lève le pied.`);
  } else changerAvis.push("Dès que les réservations à date sont connues, le besoin de remplissage remplace l'estimation.");
  if (ctx.marches.find((x) => x.id === o.marche)?.court) changerAvis.push("Si plus de 20 cm de neige sont annoncés sur 5 jours, le déclencheur neige passe devant pour les marchés proches.");
  changerAvis.push("Si la newsletter fait moins de 30 % d'ouvertures, on la relance une fois avec un autre objet.");
  return { ...base, verbe, phrase: `${tete}, parce ${liste}.`, changerAvis };
}

// ── Les trois priorités de la semaine ────────────────────────────────────────

export interface Priorite {
  /** Titre centré sur le marché de la carte (l'action elle-même peut viser plusieurs marchés). */
  titre: string;
  action: ActionAFaire;
  sujet: SujetCalcule;
  marche: Marche;
  opportunite: Opportunite;
  raison: string;
  autresMarches: string[];
}

const ACTIONNABLE = ["a_lancer", "a_creer", "declencher", "en_retard"];

/**
 * Au plus trois actions, une par marché, les plus prioritaires : lançables tout de suite (ni bloquées
 * par un accès, ni maison fermée), classées par l'ordre de leur marché dans le sujet.
 */
export function priorites(ctx: Contexte, sujets: SujetCalcule[], actions: ActionAFaire[], marche?: string | null): Priorite[] {
  const candidats: Priorite[] = [];
  for (const a of actions) {
    if (!ACTIONNABLE.includes(a.statut.code)) continue;
    const s = sujets.find((x) => x.def.id === a.sujetId);
    if (!s || !s.ouvert) continue;
    // Le référencement d'une page vise la langue de la page : on le rattache à un marché de cette langue.
    const page = a.canal === "seo" ? (/\/(en|es|ar)\//.exec(a.titre)?.[1] ?? (/« /.test(a.titre) ? null : "fr")) : null;
    const ops = s.opportunites
      .filter((o) => a.marches.includes(o.marche) && (!marche || o.marche === marche))
      .filter((o) => !page || (ctx.marches.find((x) => x.id === o.marche)?.langue === (page === "fr" ? "fr" : "en")))
      .sort((x, y) => y.ordre - x.ordre);
    const o = ops[0];
    if (!o) continue;
    const m = ctx.marches.find((x) => x.id === o.marche);
    if (!m) continue;
    const parts: string[] = [];
    if (o.fenetre) parts.push(ctx.date >= o.fenetre.debut ? `Les ${clientsDe([m.id])} réservent jusqu'au ${formatDate(o.fenetre.fin)}` : `Les ${clientsDe([m.id])} commencent à réserver le ${formatDate(o.fenetre.debut)}`);
    const ch = /^(\d+) nuitées réservées contre (\d+)/.exec(o.facteurs.besoin.detail);
    if (!o.facteurs.besoin.manquant && ch) parts.push(Number(ch[1]) === 0 ? `aucune nuitée réservée, contre ${ch[2]} l'an dernier à date` : `${ch[1]} nuitées réservées, contre ${ch[2]} l'an dernier à date`);
    if (o.verdict === "Rien n'est prévu, à créer") parts.push("rien n'est prévu au plan d'envois");
    else if (o.verdict === "On envoie trop tard") parts.push("l'envoi prévu arrive trop tard");
    const nomSujet = s.def.nom.split(",")[0].toLowerCase();
    const titre =
      a.canal === "crm"
        ? `Envoyer la newsletter « ${nomSujet} » aux ${clientsDe([m.id])}`
        : a.canal === "agences"
          ? `Écrire aux agences et voyagistes ${pourLe(m).replace(/^pour /, "").replace(/^le /, "du ").replace(/^la /, "de la ").replace(/^les /, "des ").replace(/^l'/, "de l'")}`
          : a.canal === "sea"
            ? `Lancer Google Ads ${pourLe(m)}, ${nomSujet}`
            : a.canal === "meta"
              ? `Lancer Meta ${pourLe(m)}, ${nomSujet}`
              : a.titre;
    candidats.push({
      titre,
      action: a,
      sujet: s,
      marche: m,
      opportunite: o,
      raison: `${parts.join(" ; ")}.`,
      autresMarches: [...new Set(a.marches.filter((x) => x !== m.id))].map((x) => ctx.marches.find((y) => y.id === x)?.nom ?? x),
    });
  }
  // Les leviers qui touchent un marché précis passent devant le référencement, commun à tous.
  const POIDS: Record<string, number> = { crm: 1, agences: 0.92, sea: 0.9, meta: 0.88, declencheur: 0.85, seo: 0.7, social: 0.6 };
  const note = (c: Priorite) => c.opportunite.ordre * (POIDS[c.action.canal] ?? 0.7);
  candidats.sort((x, y) => note(y) - note(x) || x.action.date.localeCompare(y.action.date));
  const marchesVus = new Set<string>();
  const canauxVus = new Set<string>();
  const out: Priorite[] = [];
  // Un marché et un levier différents à chaque priorité ; on relâche le levier s'il n'y a pas assez de choix.
  for (const strict of [true, false]) {
    for (const c of candidats) {
      if (out.length === 3) break;
      if (marchesVus.has(c.marche.id) || out.some((p) => p.action.activationCle === c.action.activationCle)) continue;
      if (strict && canauxVus.has(c.action.canal)) continue;
      marchesVus.add(c.marche.id);
      canauxVus.add(c.action.canal);
      out.push(c);
    }
  }
  return out;
}

// ── Recommandations par levier ───────────────────────────────────────────────

export interface Recommandation {
  levier: string;
  lignes: { libelle: string; valeur: string }[];
  estime: boolean;
}

const objetsCrm = (s: SujetCalcule, m: Marche) =>
  m.langue === "fr"
    ? [`${s.def.nom} à Megève : vos dates sont encore ouvertes`, `Lodge Park, ${s.def.nom.toLowerCase()} : réservez avant le week-end`]
    : [`${s.def.nom.replace(/^Vacances d'hiver.*$/, "February half-term")} in Megève: your dates are still open`, `Lodge Park, Megève: book your winter week now`];

export function recommandation(ctx: Contexte, s: SujetCalcule, a: Activation): Recommandation[] {
  const marches = [...new Set(a.vagues.flatMap((v) => v.marches))].map((id) => ctx.marches.find((m) => m.id === id)).filter((m): m is Marche => Boolean(m));
  const out: Recommandation[] = [];
  for (const m of marches.slice(0, 4)) {
    const ind = indicateurs(ctx).get(m.id);
    const o = s.opportunites.find((x) => x.marche === m.id);
    const v = a.vagues.find((x) => x.marches.includes(m.id));
    const msg = messageMarche(s, m);
    const panier = ind?.panier ?? [];
    if (a.canal === "crm") {
      const date = v ? mardiSuivant(v.debut) : null;
      const besoin = o && /contre (\d+)/.exec(o.facteurs.besoin.detail);
      const ecart = besoin && o ? Math.max(0, Number(besoin[1]) - Number(/^(\d+)/.exec(o.facteurs.besoin.detail)?.[1] ?? 0)) : null;
      out.push({
        levier: `Newsletter, ${m.nom}`,
        estime: true,
        lignes: [
              { libelle: "Segment", valeur: `${clientsDe([m.id])[0].toUpperCase()}${clientsDe([m.id]).slice(1)} ayant séjourné au Lodge Park ou aux Fermes de Marie, plus les abonnés ${m.nom}` },
              { libelle: "Langue", valeur: msg.langue },
              { libelle: "Objets à tester", valeur: objetsCrm(s, m).map((x) => `« ${x} »`).join(" ou ") },
              { libelle: "Accroche", valeur: msg.accroche },
              { libelle: "Date d'envoi", valeur: date ? `${formatDate(date, true)}, 9 h 30 ${FUSEAU[m.id] ?? "heure locale"}` : "à caler" },
              { libelle: "Appel à l'action", valeur: "Voir les disponibilités, vers la page du séjour dans la bonne langue, avec UTM" },
              {
                libelle: "Objectif",
                valeur: `${ecart ? `${n(ecart)} nuitées à reprendre sur la période (l'écart à date avec l'an dernier), ` : ""}35 % d'ouvertures et 3 réservations à 10 jours (estimé, sans historique d'envois)`,
              },
            ],
      });
    } else if (a.canal === "seo") {
      const cibles = panier.filter((k) => /Hébergement|Familles|Domaine|Accès|Générique/.test(k.famille)).sort((x, y) => y.recherches - x.recherches).slice(0, 5);
      out.push({
        levier: `Référencement, ${m.nom}`,
        estime: false,
        lignes: [
          { libelle: "Langue", valeur: m.langue_site === false ? `page à créer en ${LANGUES[m.langue_locale ?? ""] ?? m.langue_locale} (langue manquante), en attendant la version anglaise` : msg.langue.replace(/^en /, "") },
          { libelle: "Requêtes cibles", valeur: cibles.length ? cibles.map((k) => `« ${k.mot_cle} » (${n(k.recherches)}/mois)`).join(", ") : "panier de mots-clés à constituer pour ce marché" },
          { libelle: "Plan de page", valeur: `H1 : ${s.def.nom} au Lodge Park, Megève. H2 : venir depuis Genève, l'école de ski, l'enneigement, où dormir au cœur du village` },
          { libelle: "À ajouter", valeur: "données structurées Hotel et Event, balises hreflang, une réponse courte en tête de page pour les moteurs IA" },
          { libelle: "Date butoir", valeur: v ? `en ligne au plus tard le ${formatDate(v.fin, true)}` : "à caler" },
        ],
      });
    } else if (a.canal === "sea" || a.canal === "meta") {
      const motsCpc = (ctx.analyse?.mots_cles[m.id] ?? []).filter((k) => k.cpc > 0);
      const cpcMoyen = motsCpc.length ? motsCpc.reduce((t, k) => t + k.cpc, 0) / motsCpc.length : 1.5;
      const jours = o?.fenetre ? Math.max(7, diffDays(o.fenetre.fin, o.fenetre.debut)) : 28;
      const budget = Math.round((cpcMoyen * (a.canal === "sea" ? 15 : 25) * jours) / 50) * 50;
      out.push(
        a.canal === "sea"
          ? {
              levier: `Google Ads, ${m.nom}`,
              estime: true,
              lignes: [
                { libelle: "Structure", valeur: `une campagne ${m.nom}, trois groupes : marque Lodge Park, « megeve » générique, hôtel Megève` },
                { libelle: "Mots-clés", valeur: motsCpc.slice(0, 4).map((k) => `« ${k.mot_cle} » (CPC ${k.cpc.toFixed(2).replace(".", ",")} $)`).join(", ") || "à constituer" },
                { libelle: "Exclusions", valeur: "webcam, météo, forfait, emploi, « four seasons » ; pays hors marché" },
                { libelle: "Budget indicatif", valeur: `${n(budget)} € sur la fenêtre (${jours} jours, CPC moyen ${cpcMoyen.toFixed(2).replace(".", ",")} $ Semrush)` },
                { libelle: "Page d'atterrissage", valeur: `page du séjour ${msg.langue}` },
              ],
            }
          : {
              levier: `Meta, ${m.nom}`,
              estime: true,
              lignes: [
                { libelle: "Audience", valeur: `${m.nom}, langue ${LANGUES[m.langue] ?? m.langue}, intérêts ski et voyages haut de gamme, visiteurs du site à 180 jours` },
                { libelle: "Exclusions", valeur: "Audience Network ; pays sans valeur repérés dans GA4 (Ukraine, Albanie, Kosovo, Moldavie)" },
                { libelle: "Format et angle", valeur: `carrousel de chambres et du village, accroche : « ${msg.accroche} »` },
                { libelle: "Objectif", valeur: "conversion (début de réservation), pas trafic" },
                { libelle: "Budget indicatif", valeur: `${n(Math.max(300, budget))} € sur la fenêtre` },
              ],
            },
      );
    } else if (a.canal === "agences") {
      out.push({
        levier: `Agences, ${m.nom}`,
        estime: true,
        lignes: [
          { libelle: "Cibles", valeur: `agences et voyagistes haut de gamme ${m.nom === "France" ? "en France" : `du marché ${m.nom}`}, liste à valider avec Sibuet` },
          { libelle: "Argumentaire", valeur: msg.accroche },
          { libelle: "Relance", valeur: v ? `premier envoi le ${formatDate(v.debut)}, relance dix jours plus tard` : "à caler" },
        ],
      });
    }
  }
  return out;
}

/** Dates de l'action, en clair (pour la file de décisions). */
export const quandAction = (a: ActionAFaire, date: string) => (a.date <= date ? "Cette semaine" : `Semaine du ${formatDate(addDays(a.date, 0))}`);

/** Canal dominant et mois fort, en une phrase (fiche marché). */
export function profilMarche(ind: IndicateursMarche) {
  const c = ind.canaux.slice(0, 3).filter((x) => x.part >= 0.2);
  const canal = c.length >= 3 && c[0].part - c[2].part < 0.1 ? `${c.map((x) => x.nom).join(", ")} à parts égales` : (ind.canaux[0]?.nom ?? "n.d.");
  return { canal, moisFort: ind.moisFort ?? "n.d.", nomCanal: NOM_CANAL };
}
