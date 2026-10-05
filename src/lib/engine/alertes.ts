import { addDays, formatDate } from "@/lib/dates";
import type { Alerte, Evenement, ResumeCalcul, SujetCalcule } from "@/lib/types";
import type { Contexte } from "./calcul";
import { REGLES } from "./regles";
import { nomNormalise } from "@/connecteurs/agenda";

// Alertes : ce qui a changé depuis le calcul précédent (brief, section 8).

export function resumer(ctx: Contexte, sujets: SujetCalcule[], numero: number, sources: Record<string, string>): Omit<ResumeCalcul, "alertes"> {
  return {
    numero,
    date: ctx.date,
    horodatage: new Date().toISOString(),
    sources,
    sujets: sujets.map((s) => ({
      id: s.def.id,
      ordre: s.ordre,
      score: s.score,
      urgence: s.urgence,
      besoin: s.opportunites.map((o) => o.facteurs.besoin.valeur),
      fenetresOuvertes: s.opportunites.filter((o) => o.fenetre && o.fenetre.debut <= ctx.date && o.fenetre.fin >= ctx.date).map((o) => o.cle),
    })),
  };
}

export function detecterAlertes(
  ctx: Contexte,
  sujets: SujetCalcule[],
  precedent: ResumeCalcul | null,
  agendaPrecedent: Evenement[] | null,
): Alerte[] {
  const alertes: Alerte[] = [];
  const depuis = precedent?.date ?? addDays(ctx.date, -7);
  const dans7 = addDays(ctx.date, 7);

  // Prévision de neige
  const n5 = ctx.prevision?.donnees.neige_5j ?? 0;
  const n16 = ctx.prevision?.donnees.neige_16j ?? 0;
  if (ctx.prevision && n5 >= REGLES.seuilNeige5jCm) {
    alertes.push({ type: "neige", gravite: "action", titre: `${n5} cm de neige annoncés sur 5 jours`, detail: "Seuil du déclencheur atteint : Google Ads et push sur Genève, Vaud et la zone A.", sujetId: "neige" });
  } else if (ctx.prevision && n16 >= 30) {
    alertes.push({ type: "neige", gravite: "info", titre: `${n16} cm de neige annoncés sur 16 jours`, detail: "Préparer les annonces du déclencheur neige.", sujetId: "neige" });
  }

  // Fenêtres qui s'ouvrent
  for (const s of sujets) {
    if (!s.ouvert) continue;
    const ouvrent = s.opportunites.filter((o) => o.fenetre && o.demandeDetectee && o.fenetre.debut > depuis && o.fenetre.debut <= dans7);
    if (ouvrent.length) {
      alertes.push({
        type: "fenetre",
        gravite: "action",
        sujetId: s.def.id,
        titre: `${s.def.nom} : ${ouvrent.length > 1 ? "des fenêtres s'ouvrent" : "une fenêtre s'ouvre"}`,
        detail: ouvrent.map((o) => `${o.libelle} le ${formatDate(o.fenetre!.debut)}`).join(", "),
      });
    }
  }

  // Périodes qui se vident (besoin en hausse)
  if (precedent) {
    for (const s of sujets) {
      const avant = precedent.sujets.find((x) => x.id === s.def.id);
      if (!avant) continue;
      const m1 = avant.besoin.reduce((a, b) => a + b, 0) / Math.max(1, avant.besoin.length);
      const m2 = s.opportunites.reduce((a, o) => a + o.facteurs.besoin.valeur, 0) / Math.max(1, s.opportunites.length);
      if (m2 - m1 >= 0.15) alertes.push({ type: "vide", gravite: "action", sujetId: s.def.id, titre: `${s.def.nom} : la période se vide`, detail: "Le remplissage recule par rapport à l'an dernier depuis le calcul précédent." });
    }
    // Changement de tête de classement
    const tete = [...sujets].sort((a, b) => b.ordre - a.ordre)[0];
    const teteAvant = [...precedent.sujets].sort((a, b) => b.ordre - a.ordre)[0];
    if (tete && teteAvant && tete.def.id !== teteAvant.id) {
      alertes.push({ type: "rang", gravite: "info", sujetId: tete.def.id, titre: `${tete.def.nom} passe en tête`, detail: "C'est désormais le sujet le plus urgent à travailler." });
    }
  }

  // Nouveaux événements datés à l'agenda
  if (agendaPrecedent && ctx.agenda) {
    const connus = new Set(agendaPrecedent.map((e) => e.cle ?? e.nom));
    const noms = agendaPrecedent.map((e) => nomNormalise(e.nom));
    const nouveaux = ctx.agenda.donnees.evenements.filter(
      (e) => !connus.has(e.cle ?? e.nom) && !noms.some((n) => n === nomNormalise(e.nom) || n.includes(nomNormalise(e.nom)) || nomNormalise(e.nom).includes(n)) && e.debut >= ctx.date && (e.type === "ponctuel" || e.type === "temps fort"),
    );
    for (const e of nouveaux.slice(0, 6)) {
      const sujet = sujets.find((s) => s.def.sejour && e.debut >= s.def.sejour.debut && e.debut <= s.def.sejour.fin);
      alertes.push({ type: "evenement", gravite: "info", sujetId: sujet?.def.id, titre: `Nouvel événement : ${e.nom}`, detail: `${formatDate(e.debut, true)}${e.fin !== e.debut ? ` au ${formatDate(e.fin, true)}` : ""}${sujet ? `, pendant « ${sujet.def.nom} »` : ""}.` });
    }
    if (nouveaux.length > 6) alertes.push({ type: "evenement", gravite: "info", titre: `${nouveaux.length - 6} autres événements datés`, detail: "Voir le calendrier." });
  }
  return alertes;
}
