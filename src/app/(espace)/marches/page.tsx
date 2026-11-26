import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Niveau } from "@/components/ui";
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
    <div className="mx-auto max-w-[1320px] px-4 pb-12 sm:px-6">
      <section className="border-b border-line py-8">
        <p className="eyebrow text-taupe">Stratégie · {ctx.maison.nom}</p>
        <h1 className="mt-2 font-display text-[2.6rem] leading-[1.05] sm:text-5xl">Les marchés, comparés</h1>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Chaque marché a son calendrier d&apos;achat, son canal et son mois fort. Ils sont tirés des ventes réelles du Lodge Park, groupes à part. Cliquez sur un marché
          pour ouvrir sa fiche.
        </p>
      </section>

      <div className="mt-8 overflow-x-auto border border-line bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-line bg-cream/60 text-left text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-taupe">
              <th className="px-4 py-3">Marché</th>
              <th className="px-4 py-3">
                Hiver {an - 1}-{an} {rejeu && <>→ {an}-{an + 1}</>}
              </th>
              <th className="px-4 py-3 text-right">Réservé à date</th>
              <th className="px-4 py-3 text-right">Délai médian</th>
              <th className="px-4 py-3">Mois fort</th>
              <th className="px-4 py-3">Canal dominant</th>
              <th className="px-4 py-3">Demande</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {liste.map((x) => {
              const e = x.nuiteesN !== null ? evo(x.nuiteesN, x.nuiteesN1) : null;
              const ed = evo(x.aDate, x.aDateN1);
              return (
                <tr key={x.marche.id} className="group border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <Link href={`/marches/${x.marche.id}`} className="flex items-center gap-2.5 font-semibold">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.marche.couleur }} />
                      {x.marche.nom}
                    </Link>
                    <p className="ml-5 text-xs text-ink-soft">{totalN1 ? `${Math.round((x.nuiteesN1 / totalN1) * 100)} % de l'hiver` : ""}</p>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-right tabular-nums">
                    {x.aDate} <span className="text-ink-soft">/ {x.aDateN1}</span>
                    {ed !== null && x.aDateN1 >= 5 && <span className={`ml-1.5 text-xs font-semibold ${ed >= 0 ? "text-sage" : "text-brick"}`}>{ed >= 0 ? "▲" : "▼"}</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{x.delai ? `${x.delai.med} j` : <span className="text-ink-soft">n.d.</span>}</td>
                  <td className="px-4 py-3">{x.moisFort ?? "n.d."}</td>
                  <td className="px-4 py-3">
                    {x.canaux[0] ? (
                      <>
                        {x.canaux[0].nom} <span className="text-ink-soft">{Math.round(x.canaux[0].part * 100)} %</span>
                      </>
                    ) : (
                      "n.d."
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Niveau libelle={MOT[x.demandeMot]} compact />
                  </td>
                  <td className="px-4 py-3">
                    {x.langueSite ? <span className="text-ink-soft">dans sa langue</span> : <span className="font-semibold text-brick">pas de page</span>}
                  </td>
                  <td className="px-2 py-3">
                    <ArrowRight className="h-4 w-4 text-greige transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-1 text-[0.72rem] text-taupe">
        <p>
          Source : Asterio, nuitées de décembre à mars (export du 14 oct. 2026). Réservé à date : au {formatDate(ctx.date, true)} contre le {formatDate(unAnAvant(ctx.date), true)}.
        </p>
        <p>Délai médian : écart entre la date de réservation et la nuit, pondéré par les nuitées, hors groupes, sur les deux derniers hivers.</p>
        <p>Demande : ventes de l&apos;hiver précédent, débuts de réservation GA4 et recherches du panier de mots-clés (Semrush, nov. 2026), jamais une seule requête.</p>
      </div>
    </div>
  );
}
