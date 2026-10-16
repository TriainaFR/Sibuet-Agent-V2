import { formatDate } from "@/lib/dates";
import type { CanalGroupe, HistoriqueMaison, SaisonHistorique } from "@/lib/types";

// Portrait d'une maison à partir de son historique de réservations : chiffres clés et constats
// rédigés (français, chiffres sourcés, aucun superlatif). Fonctions pures.

const fmt = new Intl.NumberFormat("fr-FR");
const n = (x: number) => fmt.format(Math.round(x));
const pc = (x: number) => `${Math.round(x * 100)} %`;
const signe = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;

export interface Constat {
  theme: "saison" | "pays" | "delai" | "canal" | "famille" | "rythme";
  titre: string;
  texte: string;
  /** Chiffre mis en avant. */
  chiffre: string;
}

export interface Portrait {
  saison: SaisonHistorique | null;
  evolution: number | null;
  constats: Constat[];
  /** Deux années glissantes d'octobre à septembre, pour la comparaison mensuelle. */
  annees: { id: string; nom: string; mois: { x: number; mois: string; nuitees: number | null }[] }[];
  source: string;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/**
 * Saison de référence : la plus récente qui se compare à la précédente sur les mêmes dates
 * (même en cours, si l'export en couvre au moins 60 %), sinon la dernière complète.
 */
export function saisonDeReference(h: HistoriqueMaison) {
  const jours = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000 + 1;
  const assez = (s: SaisonHistorique) => s.nuitees > 50 && jours(s.couverte[0], s.couverte[1]) / jours(s.debut, s.fin) >= 0.6;
  const comparables = h.saisons.filter((s) => assez(s) && (s.precedente?.memeFenetre ?? 0) > 0);
  return comparables.at(-1) ?? h.saisons.filter((s) => s.complete && s.nuitees > 50).at(-1) ?? h.saisons.at(-1) ?? null;
}

/** « l'hiver 2025-2026 », « la saison 2025 ». */
export const laSaison = (nom: string) => {
  const b = nom.charAt(0).toLowerCase() + nom.slice(1);
  return /^[aeéèiouh]/.test(b) ? `l'${b}` : `la ${b}`;
};

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pays avec son article : « la France », « le Royaume-Uni », « les États-Unis », « Monaco ». */
export function lePays(p: string) {
  if (["Monaco", "Israël", "Singapour", "Saint-Barthélemy", "Hong Kong", "Cuba", "Taïwan", "Autres pays"].includes(p)) return p;
  if (["États-Unis", "Pays-Bas", "Émirats arabes unis"].includes(p)) return `les ${p}`;
  if (/^[AEIOUÉÈÎ]/.test(p)) return `l'${p}`;
  const masculins = ["Royaume-Uni", "Brésil", "Canada", "Portugal", "Luxembourg", "Danemark", "Japon", "Liban", "Maroc", "Mexique", "Qatar", "Koweït", "Chili", "Pérou", "Kazakhstan"];
  return masculins.includes(p) || !p.endsWith("e") ? `le ${p}` : `la ${p}`;
}

/** « de l'hiver 2025-2026 », « de la saison 2025 ». */
export const delaSaison = (nom: string) => {
  const b = nom.charAt(0).toLowerCase() + nom.slice(1);
  return /^[aeéèiouh]/.test(b) ? `de l'${b}` : `de la ${b}`;
};

/** Nom de saison, avec la date d'arrêt de l'export si elle est en cours. */
export const nomSaison = (s: SaisonHistorique) => (s.complete ? s.nom : `${s.nom} (au ${formatDate(s.couverte[1])})`);

export const partDirecte = (c: Partial<Record<CanalGroupe, number>>) => {
  const total = Object.values(c).reduce((a, b) => a + (b ?? 0), 0);
  return total ? ((c.direct ?? 0) + (c.site ?? 0)) / total : 0;
};

export function portrait(h: HistoriqueMaison): Portrait {
  const s = saisonDeReference(h);
  const evolution = s?.precedente?.memeFenetre ? s.nuitees / s.precedente.memeFenetre - 1 : null;
  const nom = s ? nomSaison(s) : "";
  const constats: Constat[] = [];
  const prec = s?.precedente ? h.saisons.find((x) => x.id === s.precedente!.id) : null;

  // 1. La saison
  if (s && evolution !== null && prec) {
    const occ = s.occupation !== null && prec.occupation !== null ? ` Le taux d'occupation passe de ${pc(prec.occupation)} à ${pc(s.occupation)}.` : "";
    constats.push({
      theme: "saison",
      titre: `${nom} contre ${laSaison(prec.nom)}`,
      chiffre: signe(evolution),
      texte: `${n(s.nuitees)} nuitées, contre ${n(s.precedente!.memeFenetre!)} sur les mêmes dates un an plus tôt.${occ}`,
    });
  }

  // 2. D'où viennent les clients, et ce qui bouge
  const total = h.pays.reduce((a, p) => a + p.nuitees, 0);
  const [p1, p2] = h.pays;
  if (p1 && total) {
    let bouge = "";
    if (s && prec) {
      const avant = new Map(prec.pays.map((x) => [x.pays, x.nuitees / prec.nuitees]));
      const ecarts = s.pays.map((x) => ({ pays: x.pays, d: x.nuitees / s.nuitees - (avant.get(x.pays) ?? 0) })).sort((a, b) => b.d - a.d);
      const monte = ecarts[0];
      if (monte && monte.d > 0.03) bouge = ` Les ${adjectifPluriel(monte.pays)} gagnent le plus de place : ${pc(monte.d + (avant.get(monte.pays) ?? 0))} des nuitées ${delaSaison(nom)}, contre ${pc(avant.get(monte.pays) ?? 0)} la saison précédente.`;
    }
    constats.push({
      theme: "pays",
      titre: "D'où viennent les clients",
      chiffre: pc(p1.nuitees / total),
      texte: `${majuscule(lePays(p1.pays))} en tête avec ${pc(p1.nuitees / total)} des nuitées sur deux ans${p2 ? `, puis ${lePays(p2.pays)} (${pc(p2.nuitees / total)})` : ""}.${bouge}${h.paysInconnu > 0.1 ? ` Le pays n'est pas renseigné pour ${pc(h.paysInconnu)} des nuitées.` : ""}`,
    });
  }

  // 3. Quand ils réservent
  const avecDelai = h.pays.filter((p) => p.delai && p.delai.n >= 15 && p.pays !== "Autres pays").sort((a, b) => b.nuitees - a.nuitees).slice(0, 4);
  if (h.delai && avecDelai.length) {
    const tot = [...avecDelai].sort((a, b) => b.delai!.med - a.delai!.med);
    const tard = tot.at(-1)!;
    const tot1 = tot[0];
    constats.push({
      theme: "delai",
      titre: "Quand ils réservent",
      chiffre: `${h.delai.med} j`,
      texte: `Sur deux ans, la moitié des séjours se réserve moins de ${h.delai.med} jours avant l'arrivée${s?.delai && s.delai.med !== h.delai.med ? `, ${s.delai.med} jours sur ${laSaison(nom)}` : ""}. ${tot1.pays === tard.pays ? "" : `Les clients ${adjectif(tot1.pays)} s'y prennent le plus tôt (${tot1.delai!.med} jours en médiane), les ${adjectifPluriel(tard.pays)} le plus tard (${tard.delai!.med} jours).`}`.trim(),
    });
  }

  // 4. Par quel canal
  const direct = partDirecte(h.canaux);
  const totalCanaux = Object.values(h.canaux).reduce((a, b) => a + (b ?? 0), 0);
  if (totalCanaux) {
    const site = (h.canaux.site ?? 0) / totalCanaux;
    const ota = (h.canaux.ota ?? 0) / totalCanaux;
    constats.push({
      theme: "canal",
      titre: "Ce qui se vend en direct",
      chiffre: pc(direct),
      texte: `Sur deux ans, ${pc(direct)} des nuitées sont vendues en direct, dont ${pc(site)} par le site. Les plateformes en portent ${pc(ota)}.${site < 0.08 && direct > 0 ? " Le site pèse peu : c'est la marge de progression la plus nette de la vente directe." : ""}`,
    });
  }

  // 5. Familles
  if (s?.familles !== null && s?.familles !== undefined) {
    const avant = prec?.familles ?? null;
    constats.push({
      theme: "famille",
      titre: "Familles et couples",
      chiffre: pc(s.familles),
      texte: `${pc(s.familles)} des nuitées ${delaSaison(nom)} comptent des enfants${avant !== null ? `, contre ${pc(avant)} la saison précédente` : ""}.${s.personnesParChambre ? ` ${String(s.personnesParChambre).replace(".", ",")} personnes par chambre en moyenne.` : ""}`,
    });
  }

  // 6. Rythme de remplissage
  if (s) {
    const a60 = s.rythme.find((r) => r.j === 56)?.part;
    const a14 = s.rythme.find((r) => r.j === 14)?.part;
    if (a60 !== undefined && a14 !== undefined)
      constats.push({
        theme: "rythme",
        titre: "Le rythme de remplissage",
        chiffre: pc(a60),
        texte: `Huit semaines avant la nuit, ${pc(a60)} des nuitées ${delaSaison(nom)} étaient vendues ; deux semaines avant, ${pc(a14)}. Le reste se joue au dernier moment.`,
      });
  }

  // Comparaison mensuelle sur deux années glissantes (octobre à septembre)
  const [debut, fin] = h.fenetre;
  const premierOct = Number(debut.slice(0, 4)) + (debut.slice(5, 7) > "10" ? 1 : 0);
  const annees = [0, 1].map((k) => {
    const a = premierOct + k;
    const mois = Array.from({ length: 12 }, (_, i) => {
      const m = ((9 + i) % 12) + 1;
      const an = m >= 10 ? a : a + 1;
      const cle = `${an}-${String(m).padStart(2, "0")}`;
      const complet = `${cle}-01` >= debut && `${cle}-28` <= fin;
      const ligne = h.mensuel.find((x) => x.mois === cle);
      return { x: i, mois: `${MOIS[m - 1]} ${an}`, nuitees: complet ? (ligne?.nuitees ?? 0) : null };
    });
    return { id: `a${a}`, nom: `Oct. ${a} à sept. ${a + 1}`, mois };
  });

  return { saison: s, evolution, constats, annees, source: `Asterio, nuits du ${formatDate(debut, true)} au ${formatDate(fin, true)}` };
}

const ADJ: Record<string, [string, string]> = {
  France: ["français", "Français"],
  Suisse: ["suisses", "Suisses"],
  "Royaume-Uni": ["britanniques", "Britanniques"],
  "États-Unis": ["américains", "Américains"],
  Belgique: ["belges", "Belges"],
  "Pays-Bas": ["néerlandais", "Néerlandais"],
  Allemagne: ["allemands", "Allemands"],
  Italie: ["italiens", "Italiens"],
  Espagne: ["espagnols", "Espagnols"],
  "Émirats arabes unis": ["émiriens", "Émiriens"],
  "Arabie saoudite": ["saoudiens", "Saoudiens"],
  Turquie: ["turcs", "Turcs"],
  Russie: ["russes", "Russes"],
  Brésil: ["brésiliens", "Brésiliens"],
  Israël: ["israéliens", "Israéliens"],
  Canada: ["canadiens", "Canadiens"],
  Australie: ["australiens", "Australiens"],
  "Saint-Barthélemy": ["résidents de Saint-Barthélemy", "résidents de Saint-Barthélemy"],
};
const adjectif = (p: string) => ADJ[p]?.[0] ?? de(p);
const adjectifPluriel = (p: string) => ADJ[p]?.[1] ?? `clients ${de(p)}`;
export function de(pays: string) {
  if (["États-Unis", "Pays-Bas", "Émirats arabes unis"].includes(pays)) return `des ${pays}`;
  if (["Royaume-Uni", "Brésil", "Canada", "Portugal", "Luxembourg", "Danemark"].includes(pays)) return `du ${pays}`;
  return /^[AEIOUÉÈÎ]/.test(pays) ? `d'${pays}` : `de ${pays}`;
}
