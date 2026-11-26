import "server-only";
import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";
import { addDays, diffDays, iso, overlapDays, shiftYears } from "@/lib/dates";
import { periodesDuMarche, type Contexte } from "@/lib/engine/calcul";
import type { DonneesAsterio, MarcheId, ResumeReservations } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Chargement d'un fichier de réservations (export du PMS, Excel ou CSV).
// Colonnes reconnues : date de réservation, pays et ville d'origine (la ville sert à la météo au départ), dates de séjour
// (arrivée et départ, ou nuits), nombre de personnes, nombre de chambres, type de chambre.
//
// Règle du projet : rien de nominatif n'est conservé. Le fichier est lu en mémoire,
// seuls des comptages agrégés par marché et par sujet sont enregistrés.
// ─────────────────────────────────────────────────────────────────────────────

type Champ = "reservation" | "ville" | "pays" | "arrivee" | "depart" | "sejour" | "nuits" | "personnes" | "enfants" | "chambres" | "type" | "statut";

const norm = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Synonymes d'en-têtes, du plus précis au plus large.
const SYNONYMES: [Champ, string[]][] = [
  ["reservation", ["date de reservation", "date reservation", "reserve le", "booking date", "date creation", "date de creation", "creation date", "created", "creation"]],
  ["arrivee", ["date d arrivee", "date arrivee", "arrivee", "debut de sejour", "debut sejour", "date debut", "check in", "checkin", "arrival", "start date"]],
  ["depart", ["date de depart", "date depart", "depart", "fin de sejour", "fin sejour", "date fin", "check out", "checkout", "departure", "end date"]],
  ["sejour", ["dates de sejour", "date de sejour", "sejour", "stay dates", "stay"]],
  ["nuits", ["nombre de nuits", "nb nuits", "nuitees", "nuits", "nights"]],
  ["enfants", ["nombre d enfants", "nb enfants", "enfants", "children", "kids"]],
  ["personnes", ["nombre de guests", "nombre de personnes", "nb personnes", "guests", "personnes", "pax", "adultes", "adults", "occupants"]],
  ["chambres", ["nombre de chambres", "nb chambres", "chambres", "rooms", "room count", "nombre de logements"]],
  ["type", ["types de chambres", "type de chambre", "type chambre", "categorie de chambre", "categorie", "room type", "typologie"]],
  ["ville", ["ville d origine", "ville origine", "ville de residence", "ville", "city", "town", "localite", "commune"]],
  ["pays", ["pays d origine", "pays origine", "pays", "country", "nationalite", "nationality", "origine", "provenance"]],
  ["statut", ["statut", "status", "etat", "annulation", "cancelled", "annule"]],
];

function reconnaitreColonnes(entetes: string[]) {
  const pris = new Set<number>();
  const colonnes: Partial<Record<Champ, number>> = {};
  for (const [champ, mots] of SYNONYMES) {
    for (const mot of mots) {
      const i = entetes.findIndex((h, k) => !pris.has(k) && (norm(h) === mot || norm(h).includes(mot)));
      if (i >= 0) {
        colonnes[champ] = i;
        pris.add(i);
        break;
      }
    }
  }
  return colonnes;
}

// Pays → marchés suivis. Sans code postal ni canton, un client français compte pour les trois zones,
// un client suisse pour Genève et Vaud.
const PAYS: [string[], MarcheId[], string][] = [
  [["fr", "fra", "france", "francais", "francaise"], ["fr"], "France"],
  [["ch", "che", "suisse", "switzerland", "schweiz", "swiss"], ["ch"], "Suisse"],
  [["gb", "gbr", "uk", "royaume uni", "united kingdom", "angleterre", "england", "great britain", "britannique"], ["uk"], "Royaume-Uni"],
  [["be", "bel", "belgique", "belgium", "belgie", "belge"], ["be"], "Belgique"],
  [["nl", "nld", "pays bas", "netherlands", "nederland", "hollande", "holland", "neerlandais"], ["nl"], "Pays-Bas"],
  [["us", "usa", "etats unis", "united states", "united states of america", "americain", "america"], ["us"], "États-Unis"],
];

// Pays non suivis, pour un affichage lisible.
const AUTRES: Record<string, string> = {
  de: "Allemagne", deu: "Allemagne", it: "Italie", ita: "Italie", es: "Espagne", esp: "Espagne", lu: "Luxembourg", lux: "Luxembourg",
  at: "Autriche", aut: "Autriche", ie: "Irlande", irl: "Irlande", se: "Suède", swe: "Suède", dk: "Danemark", dnk: "Danemark", no: "Norvège",
  nor: "Norvège", ca: "Canada", can: "Canada", br: "Brésil", bra: "Brésil", il: "Israël", isr: "Israël", ae: "Émirats arabes unis", are: "Émirats arabes unis",
  ru: "Russie", rus: "Russie", cn: "Chine", chn: "Chine", au: "Australie", aus: "Australie", pt: "Portugal", prt: "Portugal", pl: "Pologne", pol: "Pologne",
};

function marchesDuPays(valeur: string): { pays: string; marches: MarcheId[] } {
  const v = norm(valeur);
  for (const [cles, marches, nom] of PAYS) if (cles.includes(v)) return { pays: nom, marches };
  if (!v) return { pays: "Non renseigné", marches: [] };
  return { pays: AUTRES[v] ?? String(valeur).trim().replace(/^./, (c) => c.toUpperCase()), marches: [] };
}

/** Dates : objets Date (Excel), 31/12/2026, 31-12-26, 2026-12-31, 31.12.2026, nombre de série Excel. */
function lireDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return iso(v);
  if (typeof v === "number" && v > 20000 && v < 80000) return iso(new Date(Date.UTC(1899, 11, 30) + v * 86_400_000));
  const s = String(v ?? "").trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/.exec(s);
  if (m) {
    const an = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${an}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

const entier = (v: unknown, defaut: number) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : defaut;
};

async function lireLignes(contenu: Buffer, nom: string): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(nom)) return (await readSheet(contenu)) as unknown[][];
  const texte = contenu.toString("utf8").replace(/^﻿/, "");
  return Papa.parse<string[]>(texte, { skipEmptyLines: true }).data;
}

interface Resa {
  reservee: string;
  arrivee: string;
  nuits: number;
  personnes: number | null;
  chambres: number;
  type: string | null;
  pays: string;
  ville: string | null;
  marches: MarcheId[];
}

/** « LONDON », « london » → « London » ; vide → null. */
const nomVille = (v: unknown) => {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s ? s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase()).slice(0, 60) : null;
};

const quantile = (t: number[], q: number) => {
  if (!t.length) return 0;
  const p = (t.length - 1) * q;
  const lo = Math.floor(p);
  return t[lo] + (t[Math.ceil(p)] - t[lo]) * (p - lo);
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Lit le fichier, l'agrège, et renvoie seulement des comptages (aucune ligne individuelle). */
export async function agregerReservations(contenu: Buffer, nom: string, ctx: Contexte): Promise<{ donnees: DonneesAsterio; resume: ResumeReservations }> {
  const lignes = await lireLignes(contenu, nom);
  if (lignes.length < 2) throw new Error("Le fichier est vide ou n'a pas de ligne d'en-tête.");
  // La ligne d'en-tête est la première où l'on reconnaît au moins deux colonnes.
  let idxEntete = 0;
  let colonnes: Partial<Record<Champ, number>> = {};
  for (let i = 0; i < Math.min(10, lignes.length); i++) {
    const c = reconnaitreColonnes(lignes[i].map(String));
    if (Object.keys(c).length > Object.keys(colonnes).length) {
      colonnes = c;
      idxEntete = i;
    }
  }
  const entetes = lignes[idxEntete].map(String);
  const manquantes = [
    colonnes.reservation === undefined && "date de réservation",
    colonnes.pays === undefined && "pays d'origine",
    colonnes.arrivee === undefined && colonnes.sejour === undefined && "dates de séjour (arrivée)",
  ].filter(Boolean);
  if (manquantes.length) throw new Error(`Colonnes introuvables : ${manquantes.join(", ")}. Vérifiez les en-têtes ou partez du modèle.`);

  const ignorees = new Map<string, number>();
  const ignorer = (raison: string) => ignorees.set(raison, (ignorees.get(raison) ?? 0) + 1);
  const resas: Resa[] = [];
  const cell = (row: unknown[], c?: number) => (c === undefined ? undefined : row[c]);

  for (const row of lignes.slice(idxEntete + 1)) {
    if (!row.some((x) => String(x ?? "").trim())) continue;
    const statut = norm(String(cell(row, colonnes.statut) ?? ""));
    if (/annul|cancel|no show/.test(statut)) {
      ignorer("annulées");
      continue;
    }
    let arrivee = lireDate(cell(row, colonnes.arrivee));
    let depart = lireDate(cell(row, colonnes.depart));
    if (!arrivee && colonnes.sejour !== undefined) {
      const dates = String(cell(row, colonnes.sejour) ?? "").match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}/g) ?? [];
      arrivee = lireDate(dates[0]);
      depart = lireDate(dates[1]);
    }
    const reservee = lireDate(cell(row, colonnes.reservation));
    if (!arrivee || !reservee) {
      ignorer("aux dates illisibles");
      continue;
    }
    if (reservee > arrivee) {
      ignorer("réservées après l'arrivée");
      continue;
    }
    const nuits = depart && depart > arrivee ? diffDays(depart, arrivee) : entier(cell(row, colonnes.nuits), 1);
    const personnes = colonnes.personnes !== undefined ? entier(cell(row, colonnes.personnes), 0) + (colonnes.enfants !== undefined ? entier(cell(row, colonnes.enfants), 0) : 0) : null;
    const { pays, marches } = marchesDuPays(String(cell(row, colonnes.pays) ?? ""));
    resas.push({
      reservee,
      arrivee,
      nuits,
      personnes: personnes || null,
      chambres: entier(cell(row, colonnes.chambres), 1),
      type: colonnes.type !== undefined ? String(cell(row, colonnes.type) ?? "").trim() || null : null,
      pays,
      ville: colonnes.ville !== undefined ? nomVille(cell(row, colonnes.ville)) : null,
      marches,
    });
  }
  if (resas.length === 0) throw new Error("Aucune réservation exploitable dans le fichier.");

  // Délais par marché (en semaines). Sur les séjours déjà commencés : la saison en cours, encore incomplète,
  // ne contient que les réservations prises tôt et fausserait la mesure. À défaut, sur tout le fichier.
  const delais: DonneesAsterio["delais"] = {};
  const passees = resas.filter((r) => r.arrivee <= ctx.date);
  const base = passees.length >= 20 ? passees : resas;
  for (const m of ctx.marches) {
    const t = base.filter((r) => r.marches.includes(m.id)).map((r) => diffDays(r.arrivee, r.reservee) / 7).sort((a, b) => a - b);
    if (t.length >= 5) delais[m.id] = { q1: r1(quantile(t, 0.25)), med: r1(quantile(t, 0.5)), q3: r1(quantile(t, 0.75)), n: t.length };
  }

  // Remplissage par sujet et par marché : nuitées-chambres réservées à date, contre l'an dernier à la même date.
  // Un client français compte pour les trois zones : le total par sujet (synthèse) ne le compte qu'une fois.
  const nuiteesResa = (r: Resa, periodes: { debut: string; fin: string }[]) =>
    periodes.reduce((t, p) => t + overlapDays(r.arrivee, addDays(r.arrivee, r.nuits - 1), p.debut, p.fin), 0) * r.chambres;
  const n1Date = shiftYears(ctx.date, -1);
  const otb: DonneesAsterio["otb"] = [];
  const remplissage: ResumeReservations["remplissage"] = [];
  for (const s of ctx.sujets.filter((x) => x.sejour && x.famille !== "declencheur")) {
    const periodes = new Map<MarcheId, { debut: string; fin: string }[]>();
    for (const m of ctx.marches.filter((x) => !s.marches || s.marches.includes(x.id))) {
      periodes.set(m.id, periodesDuMarche(ctx, s, m).flatMap((p) => (p.sejour ? [p.sejour] : [])));
    }
    const decale = (ps: { debut: string; fin: string }[]) => ps.map((p) => ({ debut: shiftYears(p.debut, -1), fin: shiftYears(p.fin, -1) }));
    for (const [m, ps] of periodes) {
      const actuel = resas.filter((r) => r.marches.includes(m) && r.reservee <= ctx.date).reduce((t, r) => t + nuiteesResa(r, ps), 0);
      const n1 = resas.filter((r) => r.marches.includes(m) && r.reservee <= n1Date).reduce((t, r) => t + nuiteesResa(r, decale(ps)), 0);
      if (actuel || n1) otb.push({ sujet: s.id, marche: m, otb: actuel, otb_n1: n1 });
    }
    const total = (aLaDate: string, decaler: boolean) =>
      resas
        .filter((r) => r.reservee <= aLaDate)
        .reduce((t, r) => t + Math.max(0, ...r.marches.filter((m) => periodes.has(m)).map((m) => nuiteesResa(r, decaler ? decale(periodes.get(m)!) : periodes.get(m)!))), 0);
    const tot = { sujet: s.id, otb: total(ctx.date, false), otb_n1: total(n1Date, true) };
    if (tot.otb || tot.otb_n1) remplissage.push(tot);
  }

  // Synthèse lisible (agrégée)
  const parPays = new Map<string, Resa[]>();
  for (const r of resas) parPays.set(r.pays, [...(parPays.get(r.pays) ?? []), r]);
  // Villes d'origine : comptage seulement, base de la météo au départ.
  const villes = new Map<string, { ville: string; pays: string; reservations: number }>();
  for (const r of resas) {
    if (!r.ville) continue;
    const cle = `${r.ville}|${r.pays}`;
    const v = villes.get(cle) ?? { ville: r.ville, pays: r.pays, reservations: 0 };
    v.reservations++;
    villes.set(cle, v);
  }
  const types = new Map<string, number>();
  for (const r of resas) if (r.type) types.set(r.type, (types.get(r.type) ?? 0) + r.chambres);
  const totalTypes = [...types.values()].reduce((a, b) => a + b, 0);
  const arrivees = resas.map((r) => r.arrivee).sort();
  const libelles: Record<Champ, string> = {
    reservation: "Date de réservation",
    pays: "Pays d'origine",
    ville: "Ville d'origine",
    arrivee: "Arrivée",
    depart: "Départ",
    sejour: "Dates de séjour",
    nuits: "Nuits",
    personnes: "Personnes",
    enfants: "Enfants",
    chambres: "Chambres",
    type: "Type de chambre",
    statut: "Statut",
  };
  const resume: ResumeReservations = {
    fichier: nom,
    lignes: lignes.length - idxEntete - 1,
    retenues: resas.length,
    ignorees: [...ignorees.entries()].map(([raison, nombre]) => ({ raison, nombre })),
    colonnes: Object.fromEntries(Object.entries(colonnes).map(([k, i]) => [libelles[k as Champ], entetes[i!]])),
    arrivees: [arrivees[0], arrivees.at(-1)!],
    parPays: [...parPays.entries()]
      .map(([pays, rs]) => {
        const avecPersonnes = rs.filter((r) => r.personnes);
        const passeesPays = rs.filter((r) => r.arrivee <= ctx.date);
        const delaisPays = (passeesPays.length >= 5 ? passeesPays : rs).map((r) => diffDays(r.arrivee, r.reservee) / 7).sort((a, b) => a - b);
        return {
          pays,
          marche: rs[0].marches[0] ?? null,
          reservations: rs.length,
          nuitees: rs.reduce((t, r) => t + r.nuits * r.chambres, 0),
          personnesMoyennes: avecPersonnes.length ? r1(avecPersonnes.reduce((t, r) => t + r.personnes!, 0) / avecPersonnes.length) : null,
          delaiMedianSemaines: r1(quantile(delaisPays, 0.5)),
        };
      })
      .sort((a, b) => b.reservations - a.reservations),
    typesChambres: [...types.entries()]
      .map(([type, n]) => ({ type, part: Math.round((n / totalTypes) * 100) }))
      .sort((a, b) => b.part - a.part)
      .slice(0, 8),
    remplissage,
    villes: [...villes.values()].sort((a, b) => b.reservations - a.reservations).slice(0, 12),
    chambresMoyennes: r1(resas.reduce((t, r) => t + r.chambres, 0) / resas.length),
  };
  return { donnees: { delais, otb, resume }, resume };
}
