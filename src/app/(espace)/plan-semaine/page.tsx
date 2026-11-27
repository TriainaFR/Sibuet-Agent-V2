import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Imprimer } from "@/components/imprimer";
import { addDays, formatDate, jourSemaine } from "@/lib/dates";
import { recommandation } from "@/lib/engine/leviers";
import { unAnAvant } from "@/lib/engine/marches";
import { canalLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Plan de la semaine" };

const fmt = new Intl.NumberFormat("fr-FR");
const ETAT: Record<string, string> = { validee: "Validée", reportee: "Reportée", rejetee: "Rejetée", brouillon: "À décider" };

export default async function PlanSemaine() {
  await connection();
  const { ctx, priorites, avance, bilan, actions, decisions, horizon } = etatSaison();
  const semaine = actions.filter((a) => a.statut.code !== "ferme" && a.date <= addDays(ctx.date, 14) && !priorites.some((p) => p.action.activationCle === a.activationCle)).slice(0, 10);

  return (
    <div className="mx-auto max-w-[900px] px-4 pb-14 pt-6 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Cette semaine
        </Link>
        <Imprimer />
      </div>

      <article className="rounded-xl border border-line bg-white p-8 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
          <div>
            <p className="text-xs font-medium text-taupe">{ctx.maison.nom} · plan de la semaine</p>
            <h1 className="mt-2 text-lg font-semibold leading-tight">
              Semaine du {jourSemaine(ctx.date)} {formatDate(ctx.date, true)}
            </h1>
          </div>
          {ctx.saison.rejeu && <p className="bg-[#7a3f24] px-3 py-1.5 text-xs font-semibold text-white">Démonstration rejouée, données réelles, rien n&apos;a été envoyé</p>}
        </header>

        {bilan && (
          <section className="carte-plan mt-6 grid gap-4 sm:grid-cols-3">
            <Chiffre l="Réservé à date" v={fmt.format(bilan.aDate)} d={`nuitées de décembre à mars au ${formatDate(ctx.date, true)}`} />
            <Chiffre l="Un an plus tôt" v={fmt.format(bilan.aDateN1)} d={`au ${formatDate(unAnAvant(ctx.date), true)}`} />
            <Chiffre l="Hiver précédent, final" v={fmt.format(bilan.finalN1)} d="nuitées de décembre à mars" />
          </section>
        )}
        {avance?.phrase && <p className="carte-plan mt-5 rounded-lg bg-brick/8 px-4 py-3 text-sm leading-relaxed">{avance.phrase}</p>}
        <p className="mt-2 text-xs text-taupe">Source : Asterio, réservations enregistrées à chaque date (export du 14 oct. 2026).</p>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Les trois priorités</h2>
          <ol className="mt-4 space-y-5">
            {priorites.map((p, i) => {
              const a = p.sujet.activations.find((x) => x.cle === p.action.activationCle);
              const reco = a ? recommandation(ctx, p.sujet, a).find((r) => r.levier.includes(p.marche.nom)) ?? recommandation(ctx, p.sujet, a)[0] : null;
              const dec = decisions[p.action.activationCle]?.etat ?? "brouillon";
              return (
                <li key={p.action.activationCle + p.marche.id} className="carte-plan rounded-xl border border-line p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-xs font-medium text-taupe">
                      {i + 1}. {canalLibelle[p.action.canal]} · {p.marche.nom} · {p.sujet.def.nom}
                    </p>
                    <span className="text-xs font-semibold">{ETAT[dec]}</span>
                  </div>
                  <p className="mt-1.5 text-[0.9375rem] font-semibold leading-snug">{p.titre}</p>
                  <p className="mt-1.5 text-sm text-ink-soft">{p.raison}</p>
                  {reco && (
                    <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
                      {reco.lignes.slice(0, 6).map((l) => (
                        <div key={l.libelle} className="contents">
                          <dt className="text-xs font-medium text-taupe">{l.libelle}</dt>
                          <dd>{l.valeur}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {semaine.length > 0 && (
          <section className="carte-plan mt-8">
            <h2 className="text-base font-semibold">Ensuite, d&apos;ici le {formatDate(addDays(ctx.date, 14), true)}</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {semaine.map((a, i) => (
                  <tr key={`${a.activationCle}-${a.date}-${i}`} className="border-b border-line last:border-0">
                    <td className="w-24 py-2 align-top text-ink-soft">{formatDate(a.date)}</td>
                    <td className="py-2">
                      {a.titre} <span className="text-ink-soft">· {a.sujetNom}</span>
                    </td>
                    <td className="w-24 py-2 text-right text-xs">{ETAT[decisions[a.activationCle]?.etat ?? "brouillon"]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <footer className="mt-10 border-t border-line pt-3 text-xs text-taupe">
          Agent Sibuet, calcul du {formatDate(ctx.date, true)}, horizon au {formatDate(horizon, true)}. Le système propose, l&apos;équipe valide.
        </footer>
      </article>
    </div>
  );
}

function Chiffre({ l, v, d }: { l: string; v: string; d: string }) {
  return (
    <div className="border border-line p-4">
      <p className="text-xs font-medium text-taupe">{l}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{v}</p>
      <p className="mt-1 text-xs text-ink-soft">{d}</p>
    </div>
  );
}
