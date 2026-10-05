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
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <p className="eyebrow text-taupe">Lodge Park, hiver 2026-2027</p>
      <h1 className="mt-2 font-display text-4xl">Vos données</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Ce que nous n&apos;avons pas encore et que vous connaissez. Chaque saisie recalcule la page. Le jour où un flux existe, il remplace la saisie sans rien
        changer d&apos;autre. Ce qui est marqué « estimation » est notre hypothèse, ce qui est marqué « saisi » vient de vous.
      </p>
      <div className="mt-7">
        <FormulaireDonnees
          saisie={lireSaisie()}
          marches={ctx.marches}
          sujets={ctx.sujets.filter((s) => s.sejour && s.famille !== "declencheur").map((s) => ({ id: s.id, nom: s.nom }))}
          flux={flux}
        />
      </div>
    </div>
  );
}
