import "server-only";
import { collecterAsterio, connecteurs } from "@/connecteurs";
import type { ContexteCollecte } from "@/connecteurs/types";
import { today } from "@/lib/dates";
import { detecterAlertes, resumer } from "@/lib/engine/alertes";
import { calculerSaison } from "@/lib/engine/calcul";
import type { Evenement, ResumeCalcul } from "@/lib/types";
import { depot } from "@/stockage/depot";
import { construireContexte } from "./contexte";
import { lireCalculs, lireJournal, lireMaison, lireParametres, lireSujets } from "./reference";

// ─────────────────────────────────────────────────────────────────────────────
// Routine du lundi : collecte → relevés datés → calcul des opportunités → alertes.
// Lancée par `npm run routine` (cron sur le serveur) ou depuis la page Sources.
// ─────────────────────────────────────────────────────────────────────────────

export interface OptionsRoutine {
  date?: string;
  rapide?: boolean;
  forcer?: boolean;
  sources?: string[];
  sansCollecte?: boolean;
}

export async function lancerRoutine(opts: OptionsRoutine = {}) {
  const date = opts.date ?? today();
  const lignes: string[] = [];
  const journal = (l: string) => {
    lignes.push(l);
    if (process.env.ROUTINE_VERBEUSE) console.log(l);
  };
  const d = depot();
  const sujets = lireSujets();
  const ctxCollecte: ContexteCollecte = {
    date,
    rapide: opts.rapide ?? false,
    fictif: lireParametres().donneesFictives,
    forcer: opts.forcer ?? false,
    maison: lireMaison(sujets.maison),
    sujets: sujets.sujets,
    depot: d,
    journal,
  };

  // 1. Collecte
  if (!opts.sansCollecte) {
    for (const c of connecteurs) {
      if (opts.sources && !opts.sources.includes(c.id)) continue;
      try {
        const r = c.id === "asterio" ? await collecterAsterio(ctxCollecte) : await c.collecter(ctxCollecte);
        if (r) {
          const cle = d.ecrireReleve(r);
          journal(`✓ ${c.nom} : relevé ${cle} (${r.mode})`);
        } else if (c.statut === "à brancher" && !(c.fictif && ctxCollecte.fictif)) {
          journal(`· ${c.nom} : à brancher`);
        }
      } catch (e) {
        journal(`✗ ${c.nom} : ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // 2. Calcul et alertes
  const ctx = construireContexte(date);
  const saison = calculerSaison(ctx);
  const calculs = lireCalculs();
  const precedent = [...calculs].reverse().find((c) => c.date < date) ?? null;
  // Agenda tel qu'il était au calcul précédent : sert à détecter les nouveaux événements.
  const cleAgendaAvant = precedent ? d.listerReleves("agenda").filter((c) => c.slice(0, 10) <= precedent.date).at(-1) : undefined;
  const agendaAvant = cleAgendaAvant ? (d.lireReleve<{ evenements: Evenement[] }>("agenda", cleAgendaAvant)?.donnees.evenements ?? null) : null;
  const sources: Record<string, string> = {};
  for (const [nom, s] of Object.entries({ semrush: ctx.semrush, gsc: ctx.gsc, meteo: ctx.prevision, agenda: ctx.agenda, newsletters: ctx.envois, asterio: ctx.asterio })) {
    if (s) sources[nom] = `${s.collecte_le}${s.mode === "fictif" ? " (fictif)" : ""}`;
  }
  const resume: ResumeCalcul = {
    ...resumer(ctx, saison, (calculs.at(-1)?.numero ?? 0) + 1, sources),
    alertes: detecterAlertes(ctx, saison, precedent, agendaAvant),
  };
  d.ecrireEtat("calculs", [...calculs.filter((c) => c.date !== date), resume].sort((a, b) => a.numero - b.numero).slice(-52));
  journal(`calcul n° ${resume.numero} du ${date} : ${saison.length} sujets, ${resume.alertes.length} alertes`);
  d.ecrireEtat("journal_routine", [{ horodatage: new Date().toISOString(), lignes }, ...lireJournal()].slice(0, 20));
  return { resume, lignes };
}
