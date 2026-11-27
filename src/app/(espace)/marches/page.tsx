import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EnTetePage, Niveau } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { hiverDe, unAnAvant } from "@/lib/engine/marches";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Marchés" };

const fmt = new Intl.NumberFormat("fr-FR");
const evo = (a: number, b: number) => (b ? Math.round((a / b - 1) * 100) : null);
const MOT = { haute: "Haute", moyenne: "Moyenne", basse: "Basse" } as const;

export default async function Marches() {
  await connection();
  const { ctx, indicateurs } = etatSaison();
  const h = hiverDe(ctx);
  const an = Number(h.debut.slice(0, 4));
  const liste = [...indicateurs].sort((a, b) => b.nuiteesN1 - a.nuiteesN1);
  const totalN1 = liste.reduce((t, x) => t + x.nuiteesN1, 0);
  const max = Math.max(1, ...liste.map((x) => Math.max(x.nuiteesN1, x.nuiteesN ?? 0)));
  const rejeu = ctx.saison.rejeu;

  return (
    <>
      <EnTetePage fil={[{ label: "Stratégie" }]} titre="Marchés" meta={`${liste.length} marchés tirés des ventes du ${ctx.maison.nom}, groupes à part`}>
        Chaque marché a son calendrier d&apos;achat, son canal et son mois fort. Cliquez sur un marché pour ouvrir sa fiche.
      </EnTetePage>
    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">

      <div className="panneau overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/50 text-left text-xs font-medium text-taupe">
              <th className="px-4 py-2 font-medium">Marché</th>
              <th className="px-4 py-2 font-medium">
                Hiver {an - 1}-{an} {rejeu && <>→ {an}-{an + 1}</>}
              </th>
              <th className="px-4 py-2 font-medium text-right">Réservé à date</th>
              <th className="px-4 py-2 font-medium text-right">Délai médian</th>
              <th className="px-4 py-2 font-medium">Mois fort</th>
              <th className="px-4 py-2 font-medium">Canal dominant</th>
              <th className="px-4 py-2 font-medium">Demande</th>
              <th className="px-4 py-2 font-medium">Site</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {liste.map((x) => {
              const e = x.nuiteesN !== null ? evo(x.nuiteesN, x.nuiteesN1) : null;
              const ed = evo(x.aDate, x.aDateN1);
              return (
                <tr key={x.marche.id} className="group border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/marches/${x.marche.id}`} className="flex items-center gap-2.5 font-semibold">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.marche.couleur }} />
                      {x.marche.nom}
                    </Link>
                    <p className="ml-5 text-xs text-ink-soft">{totalN1 ? `${Math.round((x.nuiteesN1 / totalN1) * 100)} % de l'hiver` : ""}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-36 space-y-1">
                        <span className="block h-1.5 rounded-r bg-greige" style={{ width: `${(x.nuiteesN1 / max) * 100}%` }} />
                        {x.nuiteesN !== null && <span className="block h-1.5 rounded-r" style={{ width: `${(x.nuiteesN / max) * 100}%`, background: x.marche.couleur }} />}
                      </div>
                      <span className="tabular-nums">
                        {fmt.format(x.nuiteesN1)}
                        {x.nuiteesN !== null && <> → {fmt.format(x.nuiteesN)}</>}
                      </span>
                      {e !== null && <span className={`text-xs font-semibold ${e >= 0 ? "text-sage" : "text-brick"}`}>{e >= 0 ? `+${e}` : `−${Math.abs(e)}`} %</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {x.aDate} <span className="text-ink-soft">/ {x.aDateN1}</span>
                    {ed !== null && x.aDateN1 >= 5 && <span className={`ml-1.5 text-xs font-semibold ${ed >= 0 ? "text-sage" : "text-brick"}`}>{ed >= 0 ? "▲" : "▼"}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{x.delai ? `${x.delai.med} j` : <span className="text-ink-soft">n.d.</span>}</td>
                  <td className="px-4 py-2.5">{x.moisFort ?? "n.d."}</td>
                  <td className="px-4 py-2.5">
                    {x.canaux[0] ? (
                      <>
                        {x.canaux[0].nom} <span className="text-ink-soft">{Math.round(x.canaux[0].part * 100)} %</span>
                      </>
                    ) : (
                      "n.d."
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Niveau libelle={MOT[x.demandeMot]} compact />
                  </td>
                  <td className="px-4 py-2.5">
                    {x.langueSite ? <span className="text-ink-soft">dans sa langue</span> : <span className="font-semibold text-brick">pas de page</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    <ArrowRight className="h-4 w-4 text-greige transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-xs text-taupe">
        <p>
          Source : Asterio, nuitées de décembre à mars (export du 14 oct. 2026). Réservé à date : au {formatDate(ctx.date, true)} contre le {formatDate(unAnAvant(ctx.date), true)}.
        </p>
        <p>Délai médian : écart entre la date de réservation et la nuit, pondéré par les nuitées, hors groupes, sur les deux derniers hivers.</p>
        <p>Demande : ventes de l&apos;hiver précédent, débuts de réservation GA4 et recherches du panier de mots-clés (Semrush, nov. 2026), jamais une seule requête.</p>
      </div>
    </div>
    </>
  );
}
