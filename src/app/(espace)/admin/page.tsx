import { connection } from "next/server";
import { connecteurs } from "@/connecteurs";
import type { EtatSource } from "@/components/flux-donnees";
import { BoutonRoutine, InterrupteurFictif } from "@/components/pilotage";
import { Bandeau, Puce, type Ton } from "@/components/ui";
import { REGLES } from "@/lib/engine/regles";
import { formatDate } from "@/lib/dates";
import { SOURCES_FLUX } from "@/lib/flux";
import { construireContexte } from "@/services/contexte";
import { lireCalculs, lireDepots, lireJournal, lireParametres } from "@/services/reference";
import { depot } from "@/stockage/depot";

const tonStatut: Record<string, Ton> = { branché: "vert", import: "ocre", "à brancher": "gris" };

export const metadata = { title: "Coulisses techniques" };

export default async function Admin() {
  await connection();
  const d = depot();
  const { donneesFictives } = lireParametres();
  const calculs = [...lireCalculs()].reverse();
  const journal = lireJournal()[0];

  // État réel de chaque source du schéma : dernier relevé, fichier de réservations chargé, dernier export déposé.
  const ctx = construireContexte();
  const depots = lireDepots();
  const etats: Record<string, EtatSource> = {};
  for (const s of SOURCES_FLUX) {
    const releves = (s.connecteurs ?? []).map((c) => d.lireReleve(c)).filter((r) => r && (r.mode !== "fictif" || donneesFictives));
    const dernier = releves.sort((a, b) => b!.collecte_le.localeCompare(a!.collecte_le))[0];
    etats[s.id] = {
      etat: s.etat,
      releve: dernier ? `Dernier relevé le ${formatDate(dernier.collecte_le, true)}${dernier.mode === "fictif" ? " (fictif)" : ""} : ${dernier.resume}.` : undefined,
      depot: depots.find((x) => x.source === s.id),
    };
  }
  const resa = ctx.asterio;
  if (resa && resa.mode !== "fictif") {
    etats.reservations = { ...etats.reservations, etat: "branche", releve: `${resa.origine}, le ${formatDate(resa.collecte_le, true)}.` };
    etats.meteo_depart = { ...etats.meteo_depart, etat: "pret" };
  }

  return (
    <>
      <Bandeau eyebrow="Pour l'équipe technique" titre="Coulisses techniques" sousTitre="Connecteurs, routine, paramètres" filigrane="Admin" photo="/lodge/lp-3.jpg" photo2="/lodge/lp-18.jpg">
        <p>
          Chaque semaine, l&apos;agent lit ce que vous savez, ce que Google voit et ce qui se passe à Megève, puis le transforme en actions datées que vous
          validez. Voici d&apos;où vient chaque information, et ce qu&apos;il en fait.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">

      <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="carte overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <p className="eyebrow text-[0.62rem] text-taupe">Pour l&apos;équipe technique</p>
            <h2 className="font-display text-2xl">Les connecteurs</h2>
          </div>
          <ul className="divide-y divide-line">
            {connecteurs.map((c) => {
              const releves = d.listerReleves(c.id);
              const dernier = d.lireReleve(c.id);
              const visible = dernier && (dernier.mode !== "fictif" || donneesFictives);
              return (
                <li key={c.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1.1fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{c.nom}</h3>
                      <Puce ton={tonStatut[c.statut]}>{c.statut}</Puce>
                      {visible && dernier.mode === "fictif" && <Puce ton="brique">fictif</Puce>}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{c.apporte}</p>
                    <p className="mt-1 text-xs text-taupe">
                      {c.categorie} · {c.cadence}
                    </p>
                  </div>
                  <div className="text-sm">
                    {visible ? (
                      <p>
                        <span className="font-semibold">Dernier relevé : {formatDate(dernier.collecte_le, true)}</span>
                        <span className="block text-ink-soft">{dernier.resume}</span>
                        <span className="block text-xs text-taupe">
                          {releves.length} relevé{releves.length > 1 ? "s" : ""} conservé{releves.length > 1 ? "s" : ""} · {dernier.origine}
                        </span>
                      </p>
                    ) : (
                      <p className="text-ink-soft">Aucun relevé.</p>
                    )}
                    <p className="mt-2 text-xs text-ink-soft">
                      <span className="font-semibold text-ink">Pour brancher : </span>
                      {c.pourBrancher}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-5">
          <section className="carte p-5">
            <h2 className="font-display text-xl">Routine du lundi</h2>
            <p className="mt-1 text-sm text-ink-soft">
              En production : <code className="rounded bg-sand px-1">npm run routine</code> chaque lundi à 6 h sur le serveur. Ici, une version rapide (agenda des
              prochaines semaines).
            </p>
            <div className="mt-4">
              <BoutonRoutine />
            </div>
            {journal && (
              <p className="mt-3 text-xs text-ink-soft">
                Dernière exécution le {formatDate(journal.horodatage.slice(0, 10), true)} à {journal.horodatage.slice(11, 16)} (UTC), {journal.lignes.length} lignes de journal.
              </p>
            )}
          </section>

          <section className="carte p-5">
            <h2 className="font-display text-xl">Mode démonstration</h2>
            <div className="mt-3">
              <InterrupteurFictif actif={donneesFictives} />
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Les données fictives sont signalées partout. Elles ne servent qu&apos;à montrer le fonctionnement : besoin de remplissage, lignes de base,
              mesure.
            </p>
            {!d.persistant && <p className="mt-2 text-xs text-brick">Hébergement en lecture seule : les modifications sont gardées en mémoire, sans être conservées.</p>}
          </section>

          <section className="carte p-5">
            <h2 className="font-display text-xl">Historique des calculs</h2>
            <ul className="mt-2 divide-y divide-line/60 text-sm">
              {calculs.map((c) => (
                <li key={c.numero} className="py-2">
                  <span className="font-semibold">
                    N° {c.numero}, {formatDate(c.date, true)}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {c.alertes.length} alerte{c.alertes.length > 1 ? "s" : ""} · sources : {Object.entries(c.sources).map(([k, v]) => `${k} ${v}`).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="carte p-5">
            <h2 className="font-display text-xl">Paramètres du calcul</h2>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-soft">
              <li>Fenêtre d&apos;achat : début du séjour moins {REGLES.q3SurMediane} fois le délai médian, jusqu&apos;au début moins {REGLES.q1SurMediane} fois.</li>
              <li>Score : demande × reste à gagner sur Google × besoin de remplissage. Facteur absent : {REGLES.facteurAbsent}, déclaré manquant.</li>
              <li>Urgence : maximale quand la fenêtre est ouverte, nulle quand elle est passée, décroissante sur {REGLES.urgenceHorizonSemaines} semaines avant.</li>
              <li>
                Vagues : dates au premier tiers de la fenêtre, marchés à moins de {REGLES.ecartVagueJours} jours regroupés, {REGLES.maxActivations} canaux au plus.
              </li>
              <li>Référencement : en ligne {REGLES.seoAvantPicJours / 7} semaines avant le pic de recherche.</li>
              <li>Déclencheur neige : {REGLES.seuilNeige5jCm} cm prévus sur 5 jours.</li>
              <li>Réglables dans src/lib/engine/regles.ts.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
    </>
  );
}
