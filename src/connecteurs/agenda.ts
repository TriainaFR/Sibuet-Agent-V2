import { diffDays } from "@/lib/dates";
import type { Evenement } from "@/lib/types";
import type { Connecteur } from "./types";
import { releve } from "./types";

// Agenda de la station (megeve-tourisme.fr). Portage en TypeScript du collecteur de Jérôme
// (05_code_version_initiale/collect_agenda_megeve.py) : les dates ne sont ni dans les titres
// ni dans les H1, on lit chaque carte de la liste par motifs texte, sans dépendre des classes CSS.

const BASE = "https://www.megeve-tourisme.fr/tout-lagenda/";
const UA = { "User-Agent": "AgentSibuet-agenda/0.2 (contact: jerome@allin-conseil.com)" };
const MOIS: Record<string, number> = { janv: 1, févr: 2, fevr: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, août: 8, aout: 8, sept: 9, oct: 10, nov: 11, déc: 12, dec: 12 };
const CATEGORIES = [
  "Conférence / Débat / Rencontre", "Visite guidée et/ou commentée", "Compétition sportive", "Animation sportive",
  "Manifestations commerciales", "Distractions et loisirs", "Traditions et folklore", "Nature et détente",
  "Fête traditionnelle", "Fête locale", "Illuminations", "Exposition", "Festival", "Spectacle", "Concert", "Marché", "Culture", "Sports",
];
const JOUR = /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zéû]+)\.?\s+(\d{4})/i;
const PLAGE = /(\d{2})\s+([a-zéû]+)\.?\s+(?:(\d{4})\s+)?(\d{2})\s+([a-zéû]+)\.?\s+(\d{4})/i;

/** Nom normalisé pour reconnaître un même événement d'une saisie à l'autre. */
export const nomNormalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[«»"“”'’:,.!?()–-]/g, " ")
    .replace(/\b(l|le|la|les)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const memeNom = (a: string, b: string) => {
  const x = nomNormalise(a);
  const y = nomNormalise(b);
  return x === y || (x.length > 8 && y.includes(x)) || (y.length > 8 && x.includes(y));
};

const iso = (j: string, m: string, a: string) => {
  const mm = MOIS[m.toLowerCase().replace(".", "").slice(0, 4)] ?? MOIS[m.toLowerCase().slice(0, 3)];
  return mm ? `${a}-${String(mm).padStart(2, "0")}-${j.padStart(2, "0")}` : null;
};

const decoder = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&rsquo;/g, "’")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»");

interface Occurrence {
  titre: string;
  cle: string;
  date: string | null;
  periode: [string, string] | null;
  categorie: string | null;
}

function lirePage(html: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (const bloc of html.split('<li class="wpet-block-list__offer"').slice(1)) {
    const lien = /href="(https:\/\/www\.megeve-tourisme\.fr\/agenda\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(bloc);
    if (!lien) continue;
    const titre = decoder(lien[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    // La carte se termine par la légende de son image, qui répète le titre : on coupe là
    // pour ne jamais lire la date de la carte suivante.
    const brut = decoder(bloc.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
    const debutTitre = brut.indexOf(titre);
    const fin = debutTitre >= 0 ? brut.indexOf(titre, debutTitre + titre.length) : -1;
    const texte = fin > 0 ? brut.slice(0, fin) : brut.slice(0, 600);
    const j = JOUR.exec(texte);
    const p = PLAGE.exec(texte.slice(j ? j.index + j[0].length : 0));
    out.push({
      titre,
      cle: lien[1].replace(/\/occ\/\d+\/?$/, "/"),
      date: j ? iso(j[2], j[3], j[4]) : null,
      periode: p ? ([iso(p[1], p[2], p[3] ?? p[6]), iso(p[4], p[5], p[6])].filter(Boolean) as [string, string]) : null,
      categorie: CATEGORIES.find((c) => texte.includes(c)) ?? null,
    });
  }
  return out;
}

/** Regroupe les occurrences par événement et le classe : ponctuel, temps fort (2 à 4 jours), période, décor. */
function regrouper(occ: Occurrence[], collecte: string): Evenement[] {
  const parCle = new Map<string, Occurrence[]>();
  for (const o of occ) if (o.date) parCle.set(o.cle, [...(parCle.get(o.cle) ?? []), o]);
  const out: Evenement[] = [];
  for (const [cle, liste] of parCle) {
    const dates = liste.map((o) => o.date!).sort();
    const periode = liste.find((o) => o.periode?.length === 2)?.periode;
    const debut = periode && periode[0] > dates[0] ? dates[0] : (periode?.[0] ?? dates[0]);
    const fin = periode?.[1] ?? dates.at(-1)!;
    const duree = diffDays(fin, debut) + 1;
    const categorie = liste[0].categorie;
    const type =
      categorie === "Marché" || categorie === "Exposition" || duree > 60 ? "décor" : duree <= 1 ? "ponctuel" : duree <= 4 ? "temps fort" : "période";
    out.push({ nom: liste[0].titre.replace(/\s*[–—]\s*/g, ", "), debut, fin, type, confirme: true, categorie, cle, source: `megeve-tourisme.fr, agenda, collecte du ${collecte}` });
  }
  return out.sort((a, b) => a.debut.localeCompare(b.debut));
}

export const agenda: Connecteur = {
  id: "agenda",
  nom: "Agenda de la station (megeve-tourisme.fr)",
  categorie: "contexte",
  cadence: "chaque lundi",
  statut: "branché",
  apporte: "Événements datés, catégorie, durée. Détecte les nouveautés d'une semaine à l'autre.",
  pourBrancher: "Rien : collecte du site public, une seconde entre deux pages. Ajouter l'URL d'agenda de chaque nouvelle destination.",
  async collecter({ date, rapide, depot, journal }) {
    const maxPages = rapide ? 12 : 120;
    const occ: Occurrence[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await fetch(page === 1 ? BASE : `${BASE}page/${page}/`, { headers: UA });
      if (!res.ok) break;
      const lues = lirePage(await res.text());
      if (lues.length === 0) break;
      occ.push(...lues);
      await new Promise((r) => setTimeout(r, rapide ? 300 : 1000));
    }
    if (occ.length === 0) throw new Error("agenda : aucune occurrence lue");
    const nouveaux = regrouper(occ, date);
    const horizon = occ.map((o) => o.date).filter(Boolean).sort().at(-1)!;

    // On reprend du relevé précédent ce qui est au-delà de l'horizon parcouru (mode rapide)
    // et les saisies manuelles (sans clé d'agenda), comme les dates à confirmer.
    const precedent = depot.lireReleve<{ evenements: Evenement[] }>("agenda");
    const vus = new Set(nouveaux.map((e) => e.cle ?? e.nom));
    const repris = (precedent?.donnees.evenements ?? []).filter((e) => !vus.has(e.cle ?? e.nom) && !nouveaux.some((n) => memeNom(n.nom, e.nom)) && (e.debut > horizon || !e.cle));
    const evenements = [...nouveaux, ...repris].sort((a, b) => a.debut.localeCompare(b.debut));
    journal(`agenda : ${occ.length} occurrences lues jusqu'au ${horizon}, ${nouveaux.length} événements, ${repris.length} repris du relevé précédent`);
    return releve("agenda", date, "réel", `${BASE}, ${occ.length} occurrences lues jusqu'au ${horizon}`, `${evenements.length} événements, dont ${nouveaux.filter((e) => e.type !== "décor").length} ponctuels ou temps forts`, { destination: "megeve", horizon, evenements }, evenements.map((e) => ({
      source: "agenda" as const, type: "contexte" as const, maison: null, marche: null, sujet: null, semaine_sejour: null, cle: "evenement", valeur: null, valeur_texte: e.nom, observe_le: date, detail: { debut: e.debut, fin: e.fin, type: e.type },
    })));
  },
};
