import Link from "next/link";
import { connection } from "next/server";
import { BoutonAppliquer, BoutonExemple, FormResultat } from "@/components/mesure-ui";
import { EnTete, Source } from "@/components/ds";
import { Bandeau, Puce, Vide } from "@/components/ui";
import { CourbeVerdict, TableauVerdict } from "@/components/verdict";
import { formatDate } from "@/lib/dates";
import { canalLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";
import { aMesurer, casDe, lectureCas, propositions } from "@/services/mesure";
import { lireResultats } from "@/services/reference";

export default async function Mesure() {
  await connection();
  const { sujets, ctx, decisions, parametres, verdict: calculerVerdict } = etatSaison();
  const verdict = ctx.saison.rejeu ? calculerVerdict() : [];
  const resultats = lireResultats();
  const validees = new Set(Object.entries(decisions).filter(([, d]) => d.etat === "validee").map(([k]) => k));
  const liste = aMesurer(sujets, ctx.date, validees);
  const { propositions: props, attentes } = propositions(ctx, resultats, sujets);

  return (
    <>
      <Bandeau eyebrow="Mesure et apprentissage" titre="Ce que les actions ont donné" sousTitre="Après chaque période de séjour" filigrane="Mesure" photo="/lodge/lp-10.jpg" photo2="/lodge/lp-11.jpg">
        <p>
          Après chaque période de séjour : le résultat de chaque action sur son indicateur, et sur la mesure commune, le remplissage de la semaine visée par rapport
        à l&apos;an dernier. Les recalibrages proposés ne s&apos;appliquent qu&apos;après validation.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      {ctx.saison.rejeu && (
        <section className="mb-10 grid gap-5 rounded-xl border border-line bg-white p-6 sm:grid-cols-[auto_1fr]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7a3f24] text-[0.9375rem] font-semibold text-white">i</span>
          <div>
            <p className="text-base font-semibold">Dans cette démonstration, aucune action n&apos;a été lancée</p>
            <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-ink-soft">
              La démo se place au {formatDate(ctx.date, true)}, avec les vraies ventes du Lodge Park. Ce que l&apos;agent propose n&apos;a jamais été envoyé : la suite de l&apos;hiver
              montre donc ce qui s&apos;est passé <strong className="text-ink">sans</strong> ses actions. On ne peut pas en tirer le gain d&apos;une action. On peut vérifier
              que l&apos;agent avait vu juste : l&apos;hiver a fini à 2 059 nuitées contre 2 430, alors que l&apos;agent signalait le 16 octobre une avance fragile, portée par
              quelques marchés lointains, avec la France déjà en recul.
            </p>
            <p className="mt-2 text-sm text-ink-soft">En exploitation réelle, chaque action validée est mesurée après sa période de séjour, sur son indicateur et sur le remplissage de la semaine visée.</p>
          </div>
        </section>
      )}
      {verdict.length > 0 && (
        <section id="verdict" className="mb-14 scroll-mt-32">
          <EnTete surtitre={`${ctx.saison.nom}, démo au ${formatDate(ctx.date, true)}`} titre="Ce qui s'est passé ensuite">
            La saison est terminée : on sait ce que chaque période a donné. À gauche, ce que l&apos;agent voyait à la date de la démo ; à droite, le résultat final,
            chaque fois comparé à l&apos;hiver précédent. C&apos;est la boucle de mesure, sur des données réelles.
          </EnTete>
          <TableauVerdict verdict={verdict} date={ctx.date} />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {verdict.slice(0, 2).map((v) => (
              <div key={v.id} className="carte p-5 sm:p-6">
                <p className="text-xs font-medium text-taupe">Nuitées réservées, cumulées</p>
                <h3 className="mt-1 text-[0.9375rem] font-semibold">{v.nom}</h3>
                <div className="mt-3">
                  <CourbeVerdict v={v} date={ctx.date} />
                </div>
              </div>
            ))}
          </div>
          <Source>Asterio, réservations enregistrées à chaque date, nuits des périodes des sujets.</Source>
        </section>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Actions à mesurer</h2>
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
                  <Link href={`/sujets/${sujet.def.id}?onglet=actions`} className="text-[0.9375rem] font-semibold hover:text-brown">
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
            <h2 className="text-[0.9375rem] font-semibold">Recalibrages proposés</h2>
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
            <h2 className="text-[0.9375rem] font-semibold">En attente de données</h2>
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
    </>
  );
}
