import { Bandeau } from "@/components/ui";
import { connection } from "next/server";
import { ChargementReservations } from "@/components/chargement-reservations";
import { FormulaireDonnees } from "@/components/formulaire-donnees";
import { construireContexte } from "@/services/contexte";
import { lireSaisie } from "@/services/reference";

export default async function VosDonnees() {
  await connection();
  const ctx = construireContexte();
  const flux: Record<string, { med: number; mode: string }> = {};
  const a = ctx.asterio;
  const charge = a?.origine.startsWith("Fichier") ? a : null;
  const libelleFlux = a?.mode === "fictif" ? "fictif" : charge ? "réservations" : "Asterio";
  for (const [m, d] of Object.entries(a?.donnees.delais ?? {})) if (d) flux[m] = { med: d.med, mode: libelleFlux };
  // Remplissage mesuré par sujet (nuitées-chambres à date contre l'an dernier à la même date), chaque réservation comptée une fois
  const fluxRemplissage: Record<string, string> = {};
  for (const s of ctx.sujets) {
    const lignes = a?.donnees.otb.filter((o) => o.sujet === s.id) ?? [];
    const r = a?.donnees.resume?.remplissage?.find((x) => x.sujet === s.id) ?? { otb: lignes.reduce((t, o) => t + o.otb, 0), otb_n1: lignes.reduce((t, o) => t + o.otb_n1, 0) };
    if (r.otb_n1 > 0) fluxRemplissage[s.id] = `${r.otb} nuitées réservées contre ${r.otb_n1} l'an dernier à date (${r.otb >= r.otb_n1 ? "+" : ""}${Math.round((r.otb / r.otb_n1 - 1) * 100)} %)`;
  }
  return (
    <>
      <Bandeau eyebrow="Lodge Park, hiver 2026-2027" titre="Vos données" sousTitre="Ce que vous savez et pas nous" filigrane="Vos données" photo="/lodge/lp-12.jpg" photo2="/lodge/bar-1.jpg">
        <p>
          Ce que nous n&apos;avons pas encore et que vous connaissez. Chaque saisie recalcule la page. Le jour où un flux existe, il remplace la saisie sans rien
        changer d&apos;autre. Ce qui est marqué « estimation » est notre hypothèse, ce qui est marqué « saisi » vient de vous.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <ChargementReservations resume={charge?.donnees.resume ?? null} chargeLe={charge?.collecte_le ?? null} marches={ctx.marches} delais={charge?.donnees.delais ?? {}} />
      <div className="mt-7">
        <FormulaireDonnees
          saisie={lireSaisie()}
          marches={ctx.marches}
          sujets={ctx.sujets.filter((s) => s.sejour && s.famille !== "declencheur").map((s) => ({ id: s.id, nom: s.nom }))}
          flux={flux}
          fluxRemplissage={fluxRemplissage}
        />
      </div>
    </div>
    </>
  );
}
