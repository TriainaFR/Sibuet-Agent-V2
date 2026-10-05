import Link from "next/link";
import { connection } from "next/server";
import { BoutonAppliquer, BoutonExemple, FormResultat } from "@/components/mesure-ui";
import { Puce, Vide } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { canalLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";
import { aMesurer, casDe, lectureCas, propositions } from "@/services/mesure";
import { lireResultats } from "@/services/reference";

export default async function Mesure() {
  await connection();
  const { sujets, ctx, decisions, parametres } = etatSaison();
  const resultats = lireResultats();
  const validees = new Set(Object.entries(decisions).filter(([, d]) => d.etat === "validee").map(([k]) => k));
  const liste = aMesurer(sujets, ctx.date, validees);
  const { propositions: props, attentes } = propositions(ctx, resultats, sujets);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <p className="eyebrow text-taupe">Mesure et apprentissage</p>
      <h1 className="mt-2 font-display text-4xl">Ce que les actions ont donné</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Après chaque période de séjour : le résultat de chaque action sur son indicateur, et sur la mesure commune, le remplissage de la semaine visée par rapport
        à l&apos;an dernier. Les recalibrages proposés ne s&apos;appliquent qu&apos;après validation.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Actions à mesurer</h2>
            {parametres.donneesFictives && <BoutonExemple cles={liste.map((x) => x.activation.cle)} />}
          </div>
          {liste.length === 0 && (
            <Vide>
              Aucune action validée ni terminée pour l&apos;instant. Validez des actions dans les fiches (onglet Actions) : elles apparaîtront ici pour être
              mesurées après leur période.
            </Vide>
          )}
          {liste.map(({ sujet, activation, terminee }) => {
            const r = resultats.find((x) => x.activationCle === activation.cle);
            const cas = r ? casDe(r) : null;
            return (
              <article key={activation.cle} className="carte p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/sujets/${sujet.def.id}?onglet=actions`} className="font-display text-xl hover:text-brown">
                    {sujet.def.nom}
                  </Link>
                  <span className="text-ink-soft">·</span>
                  <span className="font-semibold">{canalLibelle[activation.canal]}</span>
                  {decisions[activation.cle]?.etat === "validee" && <Puce ton="vert">Validée</Puce>}
                  {!terminee && <Puce>En cours jusqu&apos;au {formatDate(activation.vagues.at(-1)!.fin)}</Puce>}
                  {cas && <Puce ton={cas.startsWith("Faite, fenêtre remplie") ? "vert" : cas.includes("vide") ? "brique" : "ocre"}>{cas}</Puce>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  Indicateur : {activation.kpi} Ligne de base : {activation.ligneBase}
                </p>
                {cas && <p className="mt-2 text-sm">{lectureCas[cas]}</p>}
                {r?.commentaire && <p className="mt-1 text-sm italic text-ink-soft">{r.commentaire}</p>}
                <div className="mt-4">
                  <FormResultat cle={activation.cle} kpi={activation.kpi} existant={r} date={ctx.date} />
                </div>
              </article>
            );
          })}
        </section>

        <aside className="space-y-5">
          <section className="carte p-5">
            <h2 className="font-display text-xl">Recalibrages proposés</h2>
            {props.length === 0 && <p className="mt-2 text-sm text-ink-soft">Aucun recalibrage proposé pour l&apos;instant.</p>}
            <ul className="mt-3 space-y-4">
              {props.map((p) => (
                <li key={p.cle} className="text-sm">
                  <p className="font-semibold">{p.libelle}</p>
                  <p className="text-ink-soft">
                    {p.ancienne} → <strong className="text-ink">{p.nouvelle}</strong>
                  </p>
                  <p className="text-xs text-taupe">{p.preuve}</p>
                  {p.applicable && p.valeur && (
                    <div className="mt-1.5">
                      <BoutonAppliquer marche={p.cle.split(".")[1]} valeur={p.valeur} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className="carte p-5">
            <h2 className="font-display text-xl">En attente de données</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              {attentes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            {!parametres.donneesFictives && (
              <p className="mt-3 text-xs text-ink-soft">
                Pour voir la boucle complète en démonstration, activez les données fictives dans{" "}
                <Link href="/sources" className="text-brown underline">
                  Sources
                </Link>
                .
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
