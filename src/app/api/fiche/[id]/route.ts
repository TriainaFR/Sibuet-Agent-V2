import { calculerSaison } from "@/lib/engine/calcul";
import { ficheTexte } from "@/services/briefs";
import { construireContexte } from "@/services/contexte";

// Export de la fiche de thème au gabarit P3, en texte (généré depuis la base, jamais saisi à la main).
export async function GET(_req: Request, { params }: RouteContext<"/api/fiche/[id]">) {
  const { id } = await params;
  const ctx = construireContexte();
  const s = calculerSaison(ctx).find((x) => x.def.id === id);
  if (!s) return new Response("Sujet introuvable", { status: 404 });
  return new Response(ficheTexte(ctx, s), {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `attachment; filename="fiche_${id}_${ctx.date}.txt"` },
  });
}
