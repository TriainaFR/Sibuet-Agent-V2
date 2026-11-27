import { connection } from "next/server";
import { SimulateurCanaux } from "@/components/simulateur-canaux";
import { EnTetePage } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { canauxDeLaMaison } from "@/lib/engine/marches";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Canaux" };

const fmt = new Intl.NumberFormat("fr-FR");
const COULEUR: Record<string, string> = { direct: "#7a3f24", ota: "#a4553a", agences: "#8b7d5e", site: "#5f7a63", groupes: "#b39a6b", autre: "#c9bfae" };
const LECTURE: Record<string, (n1: string, n: string) => string> = {
  site: (a, b) => `Le moteur de réservation du site passe de ${a} à ${b} nuitées : la vente directe en ligne décolle.`,
  ota: (a, b) => `Les plateformes reculent de ${a} à ${b} nuitées : moins de commission, mais aussi moins de clients apportés.`,
  direct: (a, b) => `Le direct (téléphone, e-mail, réception) baisse de ${a} à ${b} nuitées : c'est la plus grosse perte en volume.`,
  agences: (a, b) => `Les agences progressent de ${a} à ${b} nuitées.`,
};

export default async function Canaux() {
  await connection();
  const { ctx, parametres } = etatSaison();
  const v = canauxDeLaMaison(ctx);
  const total = (k: "n1" | "n") => v.canaux.reduce((t, c) => t + (c[k] ?? 0), 0);
  const max = Math.max(1, ...v.canaux.flatMap((c) => [c.n1, c.n ?? 0]));
  const ota = v.canaux.find((c) => c.canal === "ota");

  return (
    <>
      <EnTetePage fil={[{ label: "Stratégie" }]} titre="Canaux de vente" meta={`${ctx.maison.nom} · ${v.hiverN1.nom} et ${v.hiver.nom}`}>
        Les mêmes nuitées, vues par canal de vente. Une nuitée vendue en direct ne coûte pas de commission.
      </EnTetePage>
    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panneau p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Nuitées de décembre à mars</h2>
            <p className="text-sm text-ink-soft">
              <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-greige align-middle" /> {v.hiverN1.nom}
              {v.couvert && (
                <>
                  <span className="mx-1 ml-4 inline-block h-2 w-4 rounded-sm bg-ink align-middle" /> {v.hiver.nom}
                </>
              )}
            </p>
          </div>
          <ul className="mt-6 space-y-5">
            {v.canaux.map((c) => {
              const e = c.n !== null && c.n1 ? Math.round((c.n / c.n1 - 1) * 100) : null;
              return (
                <li key={c.canal}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold first-letter:uppercase">{c.nom}</span>
                    <span className="tabular-nums">
                      {fmt.format(c.n1)}
                      {c.n !== null && <> → <strong>{fmt.format(c.n)}</strong></>}
                      {e !== null && <span className={`ml-2 text-xs font-semibold ${e >= 0 ? "text-sage" : "text-brick"}`}>{e >= 0 ? `+${e}` : `−${Math.abs(e)}`} %</span>}
                      {c.n1 === 0 && c.n ? <span className="ml-2 text-xs text-ink-soft">nouveau</span> : null}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <span className="block h-2 rounded-r bg-greige/70" style={{ width: `${(c.n1 / max) * 100}%` }} />
                    {c.n !== null && <span className="block h-2 rounded-r" style={{ width: `${(c.n / max) * 100}%`, background: COULEUR[c.canal] ?? "#2f2f2b" }} />}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 border-t border-line pt-4 text-sm">
            Total : {fmt.format(total("n1"))}
            {v.couvert && <> → {fmt.format(total("n"))} nuitées</>}.
          </p>
          <p className="mt-2 text-xs text-taupe">Source : Asterio, nuitées par canal de vente, groupes comptés dans leur canal sauf la ligne « groupe » (export du 14 oct. 2026).</p>
        </div>
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Ce que ça dit</h2>
          {v.canaux
            .filter((c) => LECTURE[c.canal] && c.n !== null)
            .map((c) => (
              <p key={c.canal} className="flex gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm leading-relaxed">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: COULEUR[c.canal] }} />
                {LECTURE[c.canal](fmt.format(c.n1), fmt.format(c.n!))}
              </p>
            ))}
          {ctx.saison.rejeu && (
            <p className="text-xs text-ink-soft">
              L&apos;hiver {v.hiver.nom.replace("hiver ", "")} est affiché en entier parce que la démonstration est rejouée : au {formatDate(ctx.date, true)}, on n&apos;en connaissait que le
              réservé à date.
            </p>
          )}
        </div>
      </section>

      {ota && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Le coût des plateformes</h2>
          <p className="mt-2 max-w-3xl text-ink-soft">Réglez le taux de commission et le prix moyen : le coût et le gain d&apos;un passage en direct se recalculent.</p>
          <div className="mt-5">
            <SimulateurCanaux
              nuiteesOta={ota.n ?? ota.n1}
              nuiteesOtaN1={ota.n1}
              commission={parametres.commissionOta ?? 18}
              prix={parametres.prixMoyenNuitee ?? 600}
              prixSaisi={parametres.prixMoyenNuitee !== undefined}
              saison={ota.n !== null ? v.hiver.nom : v.hiverN1.nom}
            />
          </div>
          <p className="mt-2 text-xs text-taupe">Commission par défaut : 18 %, taux courant des plateformes en hôtellerie de luxe, à remplacer par le taux du contrat.</p>
        </section>
      )}
    </div>
    </>
  );
}
