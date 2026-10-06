import { Bandeau } from "@/components/ui";
import { connection } from "next/server";
import { FormulaireDonnees } from "@/components/formulaire-donnees";
import { construireContexte } from "@/services/contexte";
import { lireSaisie } from "@/services/reference";

export default async function VosDonnees() {
  await connection();
  const ctx = construireContexte();
  const flux: Record<string, { med: number; mode: string }> = {};
  for (const [m, d] of Object.entries(ctx.asterio?.donnees.delais ?? {})) if (d) flux[m] = { med: d.med, mode: ctx.asterio!.mode === "fictif" ? "fictif" : "Asterio" };
  return (
    <>
      <Bandeau eyebrow="Lodge Park, hiver 2026-2027" titre="Vos données" sousTitre="Ce que vous savez et pas nous" filigrane="Vos données" photo="/lodge/lp-12.jpg" photo2="/lodge/bar-1.jpg">
        <p>
          Ce que nous n&apos;avons pas encore et que vous connaissez. Chaque saisie recalcule la page. Le jour où un flux existe, il remplace la saisie sans rien
        changer d&apos;autre. Ce qui est marqué « estimation » est notre hypothèse, ce qui est marqué « saisi » vient de vous.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      <div className="mt-7">
        <FormulaireDonnees
          saisie={lireSaisie()}
          marches={ctx.marches}
          sujets={ctx.sujets.filter((s) => s.sejour && s.famille !== "declencheur").map((s) => ({ id: s.id, nom: s.nom }))}
          flux={flux}
        />
      </div>
    </div>
    </>
  );
}
