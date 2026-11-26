import "server-only";
import { diffDays, formatDate, iso } from "@/lib/dates";
import { dateExcel, lireFeuille } from "@/lib/xlsx";
import { releve } from "@/connecteurs/types";
import { depot } from "@/stockage/depot";
import { lireMarches } from "@/services/reference";
import type {
  CanalGroupe,
  DonneesAsterio,
  HistoriqueAsterio,
  HistoriqueMaison,
  Maison,
  MarcheId,
  PaysHistorique,
  Quartiles,
  ResumeReservations,
  SaisonHistorique,
} from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Exports Asterio « nuitées » : une ligne par date de réservation, nuit, canal, segment et pays,
// avec le nombre de chambres occupées et la composition (adultes, enfants). Aucun nom.
//
// L'agrégation ne garde que des totaux par maison, saison, pays, canal et mois, plus,
// pour la maison pilote, un détail par nuit (nuit, réservée le, pays, chambres, canal)
// qui sert au rythme de remplissage. Les fichiers bruts ne sont jamais conservés.
// ─────────────────────────────────────────────────────────────────────────────

export interface LigneAsterio {
  hotel: string;
  reservee: string;
  nuit: string;
  canal: CanalGroupe;
  chambres: number;
  pays: string | null;
  /** Délai en jours, renseigné sur la première nuit du séjour. */
  anticipation: number | null;
  personnes: number | null;
  enfants: number | null;
  /** Segment groupe (« Groupe Events ») : écarté des calculs de demande et de délai. */
  groupe: boolean;
}

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const COLONNES = {
  hotel: ["hotel"],
  reservee: ["date reservation"],
  nuit: ["date nuitee"],
  groupe: ["groupes canaux"],
  chambres: ["nb chb occupees", "chambres occupees"],
  pays: ["pays"],
  anticipation: ["anticipation moyenne", "anticipation"],
  personnes: ["nb personnes"],
  enfants: ["nb enfants"],
  segment: ["segments", "segment"],
} as const;

/** Un export Asterio « nuitées » se reconnaît à ses colonnes date de nuitée et chambres occupées. */
export function estExportAsterio(entetes: unknown[]) {
  const h = entetes.map(norm);
  return h.includes("date nuitee") && h.some((x) => x.startsWith("nb chb"));
}

const CANAUX: Record<string, CanalGroupe> = { direct: "direct", be: "site", ota: "ota", agence: "agences", groupe: "groupes" };

function lireDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) return dateExcel(v);
  const s = String(v ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
const nombre = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Lit un export (xlsx ou csv déjà découpé en lignes) et renvoie les lignes utiles. */
export async function lireExportAsterio(contenu: Buffer): Promise<{ lignes: LigneAsterio[]; nuitsMin: string | null; nuitsMax: string | null }> {
  const brut = await lireFeuille(contenu);
  const iEntete = brut.findIndex((r) => estExportAsterio(r));
  if (iEntete < 0) throw new Error("Ce fichier n'a pas les colonnes d'un export Asterio (Date Nuitée, Nb Chb Occupées).");
  const h = brut[iEntete].map(norm);
  const col = Object.fromEntries(Object.entries(COLONNES).map(([k, noms]) => [k, h.findIndex((x) => (noms as readonly string[]).includes(x))])) as Record<keyof typeof COLONNES, number>;
  const lignes: LigneAsterio[] = [];
  let nuitsMin: string | null = null;
  let nuitsMax: string | null = null;
  for (const r of brut.slice(iEntete + 1)) {
    const hotel = String(r[col.hotel] ?? "").trim();
    const nuit = lireDate(r[col.nuit]);
    const reservee = lireDate(r[col.reservee]);
    // Les lignes « Total » et « Filtres appliqués » des exports n'ont pas de date de nuitée.
    if (!hotel || !nuit || !reservee) continue;
    if (!nuitsMin || nuit < nuitsMin) nuitsMin = nuit;
    if (!nuitsMax || nuit > nuitsMax) nuitsMax = nuit;
    const chambres = nombre(r[col.chambres]) ?? 0;
    if (chambres <= 0) continue; // annulations et lignes sans occupation
    const pays = String(r[col.pays] ?? "").trim();
    lignes.push({
      hotel,
      reservee,
      nuit,
      canal: CANAUX[norm(r[col.groupe])] ?? "autre",
      chambres,
      pays: !pays || /inconnu|indetermine/i.test(norm(pays)) ? null : pays,
      anticipation: col.anticipation >= 0 ? nombre(r[col.anticipation]) : null,
      personnes: col.personnes >= 0 ? nombre(r[col.personnes]) : null,
      enfants: col.enfants >= 0 ? nombre(r[col.enfants]) : null,
      groupe: col.segment >= 0 && /groupe/.test(norm(r[col.segment])),
    });
  }
  return { lignes, nuitsMin, nuitsMax };
}

// ── Pays ─────────────────────────────────────────────────────────────────────

const NOMS_PAYS: Record<string, string> = {
  "etats unis": "États-Unis",
  "royaume uni": "Royaume-Uni",
  "saint barthelemy": "Saint-Barthélemy",
  "emirats arabes unis": "Émirats arabes unis",
  "russie federation de": "Russie",
  "coree republique de": "Corée du Sud",
  "iran republique islamique d": "Iran",
  "taiwan province de chine": "Taïwan",
  "hong kong": "Hong Kong",
  "chine": "Chine",
};
/** Pays Asterio vers marchés suivis : construit à partir de data/reference/marches.json. */
let MARCHES_PAYS: Record<string, MarcheId[]> = {};
export function definirMarches(marches: { id: string; pays: string }[]) {
  MARCHES_PAYS = {};
  for (const m of marches) MARCHES_PAYS[m.pays] = [...(MARCHES_PAYS[m.pays] ?? []), m.id];
}

export function nomPays(brut: string) {
  const n = norm(brut);
  if (NOMS_PAYS[n]) return NOMS_PAYS[n];
  const base = brut.split(",")[0].trim().toLowerCase();
  return base.replace(/^./, (c) => c.toUpperCase()).replace(/-(.)/g, (_, c: string) => `-${c.toUpperCase()}`);
}

// ── Saisons ──────────────────────────────────────────────────────────────────

const slug = (s: string) => norm(s).replace(/ /g, "-");

/** Saison d'une nuit selon la configuration de la maison. */
function saisonDe(nuit: string, saisons: NonNullable<Maison["saisons"]>) {
  const an = Number(nuit.slice(0, 4));
  const md = nuit.slice(5);
  for (const s of saisons) {
    const chevauche = s.debut > s.fin;
    if (!chevauche && md >= s.debut && md <= s.fin) return { id: `${slug(s.nom)}-${an}`, nom: `${s.nom} ${an}`, debut: `${an}-${s.debut}`, fin: `${an}-${s.fin}`, type: s.nom };
    if (chevauche && (md >= s.debut || md <= s.fin)) {
      const a = md >= s.debut ? an : an - 1;
      return { id: `${slug(s.nom)}-${a}-${a + 1}`, nom: `${s.nom} ${a}-${a + 1}`, debut: `${a}-${s.debut}`, fin: `${a + 1}-${s.fin}`, type: s.nom };
    }
  }
  return null;
}

const anMoins = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4) === "-02-29" ? "-02-28" : d.slice(4)}`;

// ── Statistiques ─────────────────────────────────────────────────────────────

/** Quartiles pondérés (valeurs en jours). */
function quartiles(valeurs: { v: number; poids: number }[]): Quartiles | null {
  if (valeurs.length < 5) return null;
  const t = [...valeurs].sort((a, b) => a.v - b.v);
  const total = t.reduce((s, x) => s + x.poids, 0);
  const q = (p: number) => {
    let cumul = 0;
    for (const x of t) {
      cumul += x.poids;
      if (cumul >= p * total) return x.v;
    }
    return t.at(-1)!.v;
  };
  return { q1: q(0.25), med: q(0.5), q3: q(0.75), n: Math.round(total) };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const part = (a: number, b: number) => (b > 0 ? r3(a / b) : 0);
const JOURS_RYTHME = Array.from({ length: 27 }, (_, i) => i * 14); // de 0 à 364 jours, tous les 14 jours

function rythme(lignes: LigneAsterio[]) {
  const total = lignes.reduce((s, l) => s + l.chambres, 0);
  return JOURS_RYTHME.map((j) => ({ j, part: part(lignes.filter((l) => diffDays(l.nuit, l.reservee) >= j).reduce((s, l) => s + l.chambres, 0), total) }));
}

function canaux(lignes: LigneAsterio[]) {
  const c: Partial<Record<CanalGroupe, number>> = {};
  for (const l of lignes) c[l.canal] = (c[l.canal] ?? 0) + l.chambres;
  return c;
}
const partDirecte = (lignes: LigneAsterio[]) => part(lignes.filter((l) => l.canal === "direct" || l.canal === "site").reduce((s, l) => s + l.chambres, 0), lignes.reduce((s, l) => s + l.chambres, 0));

function familles(lignes: LigneAsterio[]) {
  const connues = lignes.filter((l) => l.enfants !== null && l.personnes !== null && l.personnes > 0);
  if (connues.length < 5) return null;
  return part(connues.filter((l) => l.enfants! > 0).reduce((s, l) => s + l.chambres, 0), connues.reduce((s, l) => s + l.chambres, 0));
}
function personnesParChambre(lignes: LigneAsterio[]) {
  const connues = lignes.filter((l) => l.personnes !== null && l.personnes > 0 && l.personnes <= 8 * l.chambres);
  if (connues.length < 5) return null;
  return Math.round((connues.reduce((s, l) => s + l.personnes!, 0) / connues.reduce((s, l) => s + l.chambres, 0)) * 10) / 10;
}
/**
 * Délai de réservation : date de la nuit moins date de réservation, pondéré par les nuitées, hors groupes.
 * La colonne « Anticipation moyenne » d'Asterio n'est pas utilisée (vide sur trois lignes sur quatre).
 */
const delaiSejours = (lignes: LigneAsterio[]) => quartiles(lignes.filter((l) => !l.groupe).map((l) => ({ v: diffDays(l.nuit, l.reservee), poids: l.chambres })));
const somme = (lignes: LigneAsterio[]) => lignes.reduce((s, l) => s + l.chambres, 0);

// ── Agrégation ───────────────────────────────────────────────────────────────

export function agregerHistorique(
  lignes: LigneAsterio[],
  fenetre: { nuits: [string, string]; fichiers: string[] },
  maisons: Maison[],
  pilote: string,
): HistoriqueAsterio {
  const grouper = <K,>(ls: LigneAsterio[], cle: (l: LigneAsterio) => K | null) => {
    const m = new Map<K, LigneAsterio[]>();
    for (const l of ls) {
      const k = cle(l);
      if (k === null) continue;
      const t = m.get(k);
      if (t) t.push(l);
      else m.set(k, [l]);
    }
    return m;
  };
  const parHotel = grouper(lignes, (l) => l.hotel);
  const inconnus: string[] = [];
  const resultat: HistoriqueMaison[] = [];

  for (const [hotel, ls] of parHotel) {
    const maison = maisons.find((m) => norm(m.asterio ?? m.nom) === norm(hotel));
    if (!maison) {
      inconnus.push(hotel);
      continue;
    }
    const saisonsDef = maison.saisons ?? [{ nom: "Année", debut: "01-01", fin: "12-31" }];
    const nuits = ls.map((l) => l.nuit).sort();
    const nuitsOuvertes = (sous: LigneAsterio[]) => new Set(sous.map((l) => l.nuit)).size;

    // Mensuel
    const mois = grouper(ls, (l) => l.nuit.slice(0, 7));
    const mensuel = [...mois.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, sous]) => ({ mois: m, nuitees: somme(sous), direct: somme(sous.filter((l) => l.canal === "direct" || l.canal === "site")), nuitsOuvertes: nuitsOuvertes(sous) }));

    // Saisons
    const groupes = new Map<string, { def: NonNullable<ReturnType<typeof saisonDe>>; lignes: LigneAsterio[] }>();
    for (const l of ls) {
      const s = saisonDe(l.nuit, saisonsDef);
      if (!s) continue;
      const g = groupes.get(s.id) ?? { def: s, lignes: [] };
      g.lignes.push(l);
      groupes.set(s.id, g);
    }
    const saisons: SaisonHistorique[] = [...groupes.values()]
      .sort((a, b) => a.def.debut.localeCompare(b.def.debut))
      .map(({ def, lignes: sous }) => {
        const couverte: [string, string] = [def.debut > fenetre.nuits[0] ? def.debut : fenetre.nuits[0], def.fin < fenetre.nuits[1] ? def.fin : fenetre.nuits[1]];
        const ouvertes = nuitsOuvertes(sous);
        const pays = new Map<string, number>();
        for (const l of sous) if (l.pays) pays.set(nomPays(l.pays), (pays.get(nomPays(l.pays)) ?? 0) + l.chambres);
        return {
          id: def.id,
          nom: def.nom,
          debut: def.debut,
          fin: def.fin,
          couverte,
          complete: couverte[0] === def.debut && couverte[1] === def.fin,
          nuitees: somme(sous),
          nuitsOuvertes: ouvertes,
          occupation: maison.chambres ? Math.min(1, r3(somme(sous) / (maison.chambres * ouvertes))) : null,
          direct: partDirecte(sous),
          canaux: canaux(sous),
          delai: delaiSejours(sous),
          familles: familles(sous),
          personnesParChambre: personnesParChambre(sous),
          pays: [...pays.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, n]) => ({ pays: p, nuitees: n })),
          precedente: null,
          rythme: rythme(sous),
        };
      });
    // Comparaison avec la saison précédente du même nom, sur la même fenêtre de dates
    for (const s of saisons) {
      const type = s.nom.replace(/ \d{4}(-\d{4})?$/, "");
      const prec = saisons.filter((x) => x.nom.startsWith(type) && x.debut < s.debut).at(-1);
      if (!prec) continue;
      const [d, f] = [anMoins(s.couverte[0]), anMoins(s.couverte[1])];
      // Comparable seulement si l'export couvre la même fenêtre un an plus tôt.
      const couverte = d >= fenetre.nuits[0];
      const memeFenetre = couverte ? somme(groupes.get(prec.id)!.lignes.filter((l) => l.nuit >= d && l.nuit <= f)) : null;
      s.precedente = { id: prec.id, nom: prec.nom, nuitees: prec.nuitees, memeFenetre };
    }

    // Pays
    const parPays = grouper(ls, (l) => (l.pays ? nomPays(l.pays) : null));
    const tries = [...parPays.entries()].sort((a, b) => somme(b[1]) - somme(a[1]));
    const fiche = (p: string, sous: LigneAsterio[]): PaysHistorique => ({
      pays: p,
      marches: MARCHES_PAYS[p] ?? [],
      nuitees: somme(sous),
      delai: delaiSejours(sous),
      familles: familles(sous),
      direct: partDirecte(sous),
    });
    const pays = tries.slice(0, 12).map(([p, sous]) => fiche(p, sous));
    const reste = tries.slice(12).flatMap(([, sous]) => sous);
    if (reste.length) pays.push(fiche("Autres pays", reste));

    // Calendrier d'achat : mois de séjour × mois de réservation
    const calendrierAchat = Array.from({ length: 12 }, () => Array(12).fill(0) as number[]);
    for (const l of ls) calendrierAchat[Number(l.nuit.slice(5, 7)) - 1][Number(l.reservee.slice(5, 7)) - 1] += l.chambres;

    // Délais par saison et par marché suivi (pour l'agent)
    const h: HistoriqueMaison = {
      id: maison.id,
      fenetre: fenetre.nuits,
      nomAsterio: hotel,
      chambres: maison.chambres ?? null,
      nuits: [nuits[0], nuits.at(-1)!],
      nuitees: somme(ls),
      sejours: ls.filter((l) => l.anticipation !== null).length,
      mensuel,
      saisons,
      pays,
      paysInconnu: part(somme(ls.filter((l) => !l.pays)), somme(ls)),
      canaux: canaux(ls),
      calendrierAchat,
      delai: delaiSejours(ls),
    };
    // Délais par marché : deux derniers hivers complets, nuits de décembre à mars, hors groupes.
    const hivers = saisons.filter((x) => x.complete && /^hiver/i.test(x.nom)).slice(-2);
    if (hivers.length) {
      const dansHivers = ls.filter((l) => hivers.some((x) => l.nuit >= x.debut && l.nuit <= `${x.fin.slice(0, 4)}-03-31`));
      h.delaisMarches = {};
      for (const [paysNom, ids] of Object.entries(MARCHES_PAYS)) {
        const duPays = dansHivers.filter((l) => l.pays && nomPays(l.pays) === paysNom);
        const q = delaiSejours(duPays);
        if (!q) continue;
        const tous = quartiles(duPays.map((l) => ({ v: diffDays(l.nuit, l.reservee), poids: l.chambres })));
        for (const id of ids) h.delaisMarches[id] = { q1: q.q1, med: q.med, q3: q.q3, nuitees: q.n, medAvecGroupes: tous && tous.med !== q.med ? tous.med : null, hivers: hivers.map((x) => x.nom) };
      }
    }
    if (maison.id === pilote) {
      const detail = new Map<string, number>();
      for (const l of ls) {
        const cle = [l.nuit, l.reservee, l.pays ? nomPays(l.pays) : "", l.canal, l.groupe ? 1 : 0].join("|");
        detail.set(cle, (detail.get(cle) ?? 0) + l.chambres);
      }
      h.detail = [...detail.entries()].map(([cle, n]) => {
        const [nuit, reservee, p, canal, g] = cle.split("|");
        return Number(g) ? [nuit, reservee, p, n, canal as CanalGroupe, 1] : [nuit, reservee, p, n, canal as CanalGroupe];
      });
    }
    resultat.push(h);
  }

  const reservations = lignes.map((l) => l.reservee).sort();
  return {
    nuits: fenetre.nuits,
    reservations: [reservations[0], reservations.at(-1)!],
    fichiers: fenetre.fichiers,
    lignes: lignes.length,
    maisons: resultat.sort((a, b) => maisons.findIndex((m) => m.id === a.id) - maisons.findIndex((m) => m.id === b.id)),
    inconnus,
  };
}

/** Lit plusieurs exports et les agrège. */
export async function importerExportsAsterio(fichiers: { nom: string; contenu: Buffer }[], maisons: Maison[], pilote: string) {
  definirMarches(lireMarches());
  const toutes: LigneAsterio[] = [];
  let min: string | null = null;
  let max: string | null = null;
  for (const f of fichiers) {
    const { lignes, nuitsMin, nuitsMax } = await lireExportAsterio(f.contenu);
    toutes.push(...lignes);
    if (nuitsMin && (!min || nuitsMin < min)) min = nuitsMin;
    if (nuitsMax && (!max || nuitsMax > max)) max = nuitsMax;
  }
  if (!toutes.length || !min || !max) throw new Error("Aucune nuitée exploitable dans ces fichiers.");
  return agregerHistorique(toutes, { nuits: [min, max], fichiers: fichiers.map((f) => f.nom) }, maisons, pilote);
}

// ── Ce que l'agent en tire pour la maison pilote ─────────────────────────────

/** Délais par marché suivi, en semaines, à partir des pays assez représentés (10 séjours au moins). */
export function delaisPilote(h: HistoriqueMaison): DonneesAsterio["delais"] {
  const delais: DonneesAsterio["delais"] = {};
  for (const [m, d] of Object.entries(h.delaisMarches ?? {})) if (d.nuitees >= 15) delais[m] = { q1: sem(d.q1), med: sem(d.med), q3: sem(d.q3), n: d.nuitees };
  return delais;
}
const sem = (jours: number) => Math.round((jours / 7) * 10) / 10;

/** Synthèse lisible pour « Vos données », au même format que le chargement d'un fichier de réservations. */
export function resumePilote(h: HistoriqueMaison, fichiers: string[]): ResumeReservations {
  return {
    fichier: fichiers.length > 1 ? `${fichiers.length} exports Asterio` : fichiers[0],
    lignes: h.sejours,
    retenues: h.sejours,
    ignorees: [],
    colonnes: { "Date de réservation": "Date Réservation", "Nuit": "Date Nuitée", "Chambres": "Nb Chb Occupées", "Pays d'origine": "Pays", "Personnes": "Nb Personnes", "Canal": "Groupes Canaux" },
    arrivees: h.nuits,
    parPays: h.pays
      .filter((p) => p.pays !== "Autres pays")
      .map((p) => ({ pays: p.pays, marche: p.marches[0] ?? null, reservations: p.delai?.n ?? 0, nuitees: p.nuitees, personnesMoyennes: null, delaiMedianSemaines: p.delai ? sem(p.delai.med) : 0 })),
    typesChambres: [],
    chambresMoyennes: null,
  };
}

export { courbePeriode, rythmePeriode } from "@/lib/engine/historique";

/** Le fichier est-il un export Asterio « nuitées » ? (lecture des premières lignes) */
export async function estFichierAsterio(contenu: Buffer) {
  try {
    return (await lireFeuille(contenu)).slice(0, 10).some((r) => estExportAsterio(r));
  } catch {
    return false;
  }
}

/** Enregistre l'historique (toutes maisons) et le relevé asterio de la maison pilote. Renvoie l'origine. */
export function enregistrerHistorique(h: HistoriqueAsterio, noms: string[], pilote: string) {
  const origine = `Exports Asterio (${noms.length} fichier${noms.length > 1 ? "s" : ""}), nuits du ${formatDate(h.nuits[0], true)} au ${formatDate(h.nuits[1], true)}`;
  depot().ecrireReleve(releve("asterio_historique", h.nuits[1], "import", origine, `${h.maisons.length} maisons, ${h.lignes} lignes agrégées`, h));
  const p = h.maisons.find((m) => m.id === pilote);
  if (p) {
    const delais = delaisPilote(p);
    depot().ecrireReleve(releve("asterio", h.nuits[1], "import", `${origine}, ${p.nomAsterio}`, `${Object.keys(delais).length} délais mesurés, ${p.sejours} séjours`, { delais, otb: [], resume: resumePilote(p, noms) }));
  }
  return origine;
}
