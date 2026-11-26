import Link from "next/link";
import { connection } from "next/server";
import { connecteurs } from "@/connecteurs";
import { FluxDonnees, type EtatSource } from "@/components/flux-donnees";
import { Bandeau } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { SOURCES_FLUX } from "@/lib/flux";
import { construireContexte } from "@/services/contexte";
import { lireDepots, lireParametres } from "@/services/reference";
import { depot } from "@/stockage/depot";

export default async function Sources() {
  await connection();
  const d = depot();
  const { donneesFictives } = lireParametres();

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
      <Bandeau eyebrow="Coulisses" titre="Sources et routine" sousTitre="D'où vient chaque proposition" filigrane="Sources" photo="/lodge/lp-3.jpg" photo2="/lodge/lp-18.jpg">
        <p>
          Chaque semaine, l&apos;agent lit ce que vous savez, ce que Google voit et ce qui se passe à Megève, puis le transforme en actions datées que vous
          validez. Voici d&apos;où vient chaque information, et ce qu&apos;il en fait.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <FluxDonnees etats={etats} />

      <section className="mt-10">
        <h2 className="font-display text-2xl">Ce que chaque source apporte</h2>
        <ul className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {connecteurs
            .filter((c) => c.statut !== "à brancher")
            .map((c) => {
              const dernier = d.lireReleve(c.id);
              const visible = dernier && (dernier.mode !== "fictif" || donneesFictives);
              return (
                <li key={c.id} className="bg-white p-5">
                  <p className="font-semibold">{c.nom}</p>
                  <p className="mt-1 text-sm text-ink-soft">{c.apporte}</p>
                  <p className="mt-2 text-xs text-taupe">{visible ? `Dernier relevé le ${formatDate(dernier.collecte_le, true)}, ${c.cadence.toLowerCase()}` : c.cadence}</p>
                </li>
              );
            })}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          Le détail des connecteurs, la routine et les réglages du calcul sont dans les{" "}
          <Link href="/admin" className="font-semibold text-maison underline-offset-4 hover:underline">
            coulisses techniques
          </Link>
          .
        </p>
      </section>
    </div>
    </>
  );
}
