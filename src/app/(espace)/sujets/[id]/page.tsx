import { ArrowLeft, ChevronDown, Download } from "lucide-react";
import Image from "next/image";
import { IconeCanal } from "@/components/icones";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Brief } from "@/components/brief";
import { GrilleMarches, TableauMarches } from "@/components/grille-marches";
import { Onglets } from "@/components/onglets";
import { Aide, Champ, Marches, Niveau, Origine, Puce, PuceStatut, Vide } from "@/components/ui";
import { BlocDecision } from "@/components/bloc-decision";
import { DecisionRapide } from "@/components/decision-rapide";
import { OuvrirAncre } from "@/components/ouvrir-ancre";
import { decisionSujet, messageMarche, recommandation } from "@/lib/engine/leviers";
import { CourbeVerdict } from "@/components/verdict";
import { diffDays, formatDate, formatRange, monthName, relatif } from "@/lib/dates";
import { BarresH, Courbes } from "@/components/graphiques";
import { canalLibelle, interetLibelle, nombre, urgenceLibelle, visibiliteExplication, visibiliteLibelle } from "@/lib/format";
import type { LigneSemrush } from "@/lib/types";
import { etatSaison } from "@/services/etat";

const familles: Record<string, string> = { saisonnier: "Saisonnier", evenementiel: "Événementiel", declencheur: "Déclencheur", b2b: "B2B" };

function Tendance({ l }: { l: LigneSemrush }) {
  const v = Object.entries(l.tendance);
  return (
    <span className="inline-flex h-6 items-end gap-[2px]" title={v.map(([k, x]) => `${k} : ${Math.round(x * 100)} %`).join(", ")}>
      {v.map(([k, x]) => (
        <span key={k} className={`w-1.5 rounded-t ${x >= 0.8 ? "bg-brown" : "bg-greige/60"}`} style={{ height: `${Math.max(8, x * 100)}%` }} />
      ))}
    </span>
  );
}

export default async function FicheSujet({ params }: PageProps<"/sujets/[id]">) {
  await connection();
  const { id } = await params;
  const { sujets, ctx, decisions, interet, verdict: calculerVerdict } = etatSaison();
  const s = sujets.find((x) => x.def.id === id);
  if (!s) notFound();
  const d = s.def;
  const decision = decisionSujet(ctx, s);
  const gsc = ctx.gsc?.donnees;
  const pages = gsc?.pages_par_sujet[d.id] ?? [];
  const lignesSemrush = d.requetes
    .map((q) => ({ q, l: ctx.semrush?.donnees.lignes.find((x) => x.requete === q.requete && x.base === q.base) }))
    .sort((a, b) => (b.l?.volume ?? 0) - (a.l?.volume ?? 0));
  const requetesGsc = [...new Set(d.requetes.map((q) => q.requete))].map((q) => ({ q, g: gsc?.requetes[q], usage: d.requetes.find((x) => x.requete === q)!.usage }));
  const sources = [
    ctx.semrush && `Semrush : ${ctx.semrush.origine}, relevé du ${formatDate(ctx.semrush.collecte_le, true)}`,
    ctx.gsc && `Search Console : ${ctx.gsc.origine}, période du ${formatRange(gsc!.periode[0], gsc!.periode[1])}`,
    ctx.agenda && `Agenda de la station : relevé du ${formatDate(ctx.agenda.collecte_le, true)}`,
    ctx.neige && `Neige historique : ${ctx.neige.origine}`,
    ctx.prevision && `Prévision neige : relevé du ${formatDate(ctx.prevision.collecte_le, true)}`,
    ctx.envois && `Newsletters : ${ctx.envois.donnees.statut}`,
    ctx.historique && `Réservations : ${ctx.historique.origine}, relevé du ${formatDate(ctx.historique.collecte_le, true)}`,
    !ctx.historique && ctx.asterio && `Réservations : ${ctx.asterio.origine}`,
    "Vacances scolaires : sites officiels par marché, vérifiés sauf Belgique et Pays-Bas",
    ctx.historique
      ? "Délais de réservation : mesurés sur la même période des deux saisons précédentes, pays par pays ; hypothèse de départ là où les séjours manquent"
      : "Délais de réservation : hypothèses tant qu'Asterio n'est pas branché, sauf saisie dans Vos données",
  ].filter(Boolean) as string[];

  const essentiel = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 border border-line bg-white lg:grid-cols-4">
        {[
          { label: "Urgence", contenu: <Niveau libelle={urgenceLibelle(s.urgence)} />, texte: s.fenetre ? `Les clients réservent du ${formatRange(s.fenetre.debut, s.fenetre.fin)}` : "Sur prévision de neige" },
          { label: "Intérêt", contenu: <Niveau libelle={interetLibelle(interet(s))} />, texte: "Ventes, visites du site et recherches, par marché" },
          { label: "Reste à gagner sur Google", contenu: <Niveau libelle={visibiliteLibelle(s.ecart)} />, texte: `Pour le marché en tête : ${visibiliteExplication(s.ecart)}` },
          {
            label: "Première action",
            contenu: <span className="font-display text-2xl leading-none">{s.premiereAction ? (s.premiereAction <= ctx.date ? "Maintenant" : formatDate(s.premiereAction, true)) : "Aucune"}</span>,
            texte: s.premiereAction && s.premiereAction > ctx.date ? relatif(s.premiereAction, ctx.date) : "Voir l'onglet Actions",
          },
        ].map((x, i) => (
          <div key={x.label} className={`p-5 ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
            <p className="eyebrow text-[0.6rem] text-taupe">{x.label}</p>
            <div className="mt-2.5">{x.contenu}</div>
            <p className="mt-2 text-sm text-ink-soft">{x.texte}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-px overflow-hidden border border-line bg-line lg:grid-cols-3">
        {[
          ["01", "Pourquoi ce sujet", s.pourquoi],
          ["02", "Pourquoi maintenant", s.maintenant || "Rien de pressant à cette date."],
          ["03", "Ce qui change dans le plan", s.changement],
        ].map(([n, t, x]) => (
          <div key={n} className="bg-white p-6">
            <p className="font-display text-4xl text-greige">{n}</p>
            <p className="titre-capitales mt-2 text-lg">{t}</p>
            <p className="mt-2 leading-relaxed text-ink-soft">{x}</p>
          </div>
        ))}
      </div>
      {(() => {
        const v = ctx.saison.rejeu ? calculerVerdict().find((x) => x.id === d.id) : null;
        if (!v) return null;
        const e = v.finalN1 ? v.final / v.finalN1 - 1 : null;
        return (
          <div className="grid gap-4 border-l-2 border-cognac bg-white p-5 sm:p-6 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="eyebrow text-cognac">Et ensuite ? Connu depuis, la saison est passée</p>
              <h3 className="titre-maison mt-1 text-2xl leading-tight">
                {nombre(v.final)} nuitées au final, {e === null ? "" : `${e >= 0 ? "+" : "−"}${Math.abs(Math.round(e * 100))} % sur l'an dernier`}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Au {formatDate(ctx.date, true)}, l&apos;agent voyait {nombre(v.aDate)} nuitées réservées, contre {nombre(v.aDateN1)} un an plus tôt. La période a fini à{" "}
                {nombre(v.final)} nuitées, contre {nombre(v.finalN1)} l&apos;hiver précédent.
              </p>
              <Link href="/mesure#verdict" className="lien-charme mt-4 text-maison">
                Tous les sujets
              </Link>
            </div>
            <CourbeVerdict v={v} date={ctx.date} hauteur={200} />
          </div>
        );
      })()}
      {s.reference && s.reference.final >= 30 && (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="carte p-5 sm:p-6">
            <p className="eyebrow text-taupe">Le rythme de l&apos;an dernier</p>
            <h3 className="titre-maison mt-1 text-2xl leading-tight">
              Au {formatDate(s.reference.aLaDate, true)}, {Math.round((s.reference.part ?? 0) * 100)} % de la période était vendue
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Même période un an plus tôt, du {formatRange(s.reference.periode.debut, s.reference.periode.fin)} : part des {nombre(s.reference.final)} nuitées finales déjà réservées, semaine après semaine.
            </p>
            <div className="mt-4">
              <Courbes
                ariaLabel={`Remplissage de la même période l'an dernier pour ${d.nom}`}
                hauteur={210}
                unite="pourcent"
                yMax={1}
                series={[
                  {
                    id: "n1",
                    nom: "L'an dernier",
                    couleur: "var(--maison-accent)",
                    aire: true,
                    points: s.reference.courbe.map((c) => ({ x: Math.round(diffDays(c.date, s.reference!.periode.debut) / 7), y: c.part })),
                  },
                ]}
                ticksX={s.reference.courbe
                  .filter((_, i, t) => i % 4 === 0 || (i === t.length - 1 && i % 4 >= 2))
                  .map((c) => ({ x: Math.round(diffDays(c.date, s.reference!.periode.debut) / 7), libelle: formatDate(c.date) }))}
                libellesX={s.reference.courbe.map((c) => ({ x: Math.round(diffDays(c.date, s.reference!.periode.debut) / 7), libelle: `Au ${formatDate(c.date, true)}` }))}
                repere={{ x: Math.round(diffDays(s.reference.aLaDate, s.reference.periode.debut) / 7), libelle: "aujourd'hui, un an plus tôt" }}
              />
            </div>
          </div>
          <div className="carte p-5 sm:p-6">
            <p className="eyebrow text-taupe">Vendu à la même date, par pays</p>
            <p className="mt-1 mb-4 text-sm text-ink-soft">Part des nuitées finales de chaque pays déjà réservée au {formatDate(s.reference.aLaDate, true)}.</p>
            <BarresH
              unite="pourcent"
              max={1}
              items={s.reference.parPays
                .filter((x) => x.final >= 10)
                .map((x) => ({ id: x.pays || "inconnu", libelle: x.pays || "Pays inconnu", valeur: x.part ?? 0, note: `${nombre(x.final)} nuitées au final` }))}
            />
            {!ctx.saison.rejeu && (
              <p className="mt-4 text-xs text-ink-soft">
                Le remplissage à date de cette saison viendra du même export Asterio étendu aux nuits de l&apos;hiver : l&apos;agent comparera alors les deux courbes.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="carte p-5">
          <p className="eyebrow text-taupe">Événements rattachés</p>
          {s.evenementsLies.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Aucun événement rattaché à ce sujet.{d.evenements_candidats?.length ? ` Candidat à décider : ${d.evenements_candidats.join(", ")}.` : ""}</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {s.evenementsLies.map((e) => (
                <li key={e.nom + e.debut} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{e.nom}</span>
                  <span className="text-ink-soft">{formatRange(e.debut, e.fin)}</span>
                  {!e.confirme && <Puce ton="ocre">date à confirmer</Puce>}
                  {e.type === "décor" && <Puce>décor</Puce>}
                </li>
              ))}
            </ul>
          )}
          {s.autresEvenements.length > 0 && (
            <>
              <p className="eyebrow mt-4 text-[0.6rem] text-taupe">Autres rendez-vous de la période, utiles au contenu</p>
              <p className="mt-1 text-sm text-ink-soft">{s.autresEvenements.map((e) => `${e.nom} (${formatDate(e.debut)})`).join(" · ")}</p>
            </>
          )}
        </div>
        <div className="carte p-5">
          <p className="eyebrow text-taupe">Cible et angle</p>
          <p className="mt-2 text-sm leading-relaxed">{d.cibles}</p>
          <p className="mt-3 border-l-2 border-cognac pl-4 font-display text-xl italic leading-snug text-ink">« {d.angle} »</p>
          <p className="mt-3 text-xs text-ink-soft">Vocabulaire interdit : {[...new Set(s.activations.flatMap((a) => a.interdits))].join(", ") || "écrin, cocon, havre de paix, luxe ultime"}.</p>
        </div>
      </div>
    </div>
  );

  const parPays = (
    <div className="space-y-6">
      <div className="carte overflow-x-auto p-5">
        <div className="min-w-[860px]">
          <GrilleMarches sujet={s} marches={ctx.marches} neige={ctx.neige?.donnees.semaines ?? null} date={ctx.date} />
        </div>
      </div>
      <div className="carte p-5">
        <h3 className="font-display text-xl">Marché par marché</h3>
        <TableauMarches sujet={s} marches={ctx.marches} interet={interetLibelle} />
      </div>
      <div>
        <h3 className="font-display text-xl">Le message clé, décliné par marché</h3>
        <p className="mt-1 text-sm text-ink-soft">Même sujet, même angle. L&apos;accroche change selon ce qui parle à chaque clientèle, dans la langue réellement disponible sur le site.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(d.marches ?? [...new Set(s.opportunites.filter((o) => !o.close).map((o) => o.marche))])
            .map((id) => ctx.marches.find((m) => m.id === id))
            .filter((m): m is NonNullable<typeof m> => Boolean(m))
            .map((m) => {
              const msg = messageMarche(s, m);
              return (
                <Link key={m.id} href={`/marches/${m.id}`} className="group relative block border border-line bg-white p-4 pl-5 transition hover:border-ink/30">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: m.couleur }} />
                  <p className="flex items-center justify-between text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-taupe">
                    {m.nom} <span className="normal-case tracking-normal">{msg.langue}</span>
                  </p>
                  <p className="mt-2 font-display text-lg leading-snug">« {msg.accroche} »</p>
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );

  const actions = (
    <div className="space-y-5">
      {s.activations.length === 0 && <Vide>Aucune activation proposée à cette date : aucune fenêtre ouverte ou à venir avec une demande mesurée.</Vide>}
      <Aide>
        Chaque levier est une proposition. Dépliez-la pour lire, marché par marché, ce qu&apos;il faut faire, dans quelle langue, quand et avec quel objectif. Validez,
        reportez ou rejetez sur place : rien ne part sans validation.
      </Aide>
      {s.activations.map((a, index) => {
        const dec = decisions[a.cle];
        const premiere = a.vagues[0];
        const derniere = a.vagues.at(-1)!;
        return (
          <details key={a.cle} id={a.cle} open={index === 0} className="group/act scroll-mt-40 border border-line bg-white open:shadow-sm">
            <summary className="flex cursor-pointer flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-cream/60">
              <IconeCanal canal={a.canal} taille="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="titre-capitales text-xl leading-tight">{canalLibelle[a.canal]}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {a.vagues.length > 1 ? `${a.vagues.length} envois, ` : ""}
                  {premiere.debut === derniere.fin ? formatDate(premiere.debut, true) : `du ${formatDate(premiere.debut)} au ${formatDate(derniere.fin, true)}`}
                  {dec?.etat === "validee" ? " · validée" : dec?.etat === "reportee" ? " · reportée" : dec?.etat === "rejetee" ? " · rejetée" : " · à décider"}
                </p>
              </div>
              <PuceStatut code={a.statut.code} libelle={a.statut.libelle} />
              <ChevronDown className="h-4 w-4 text-taupe transition group-open/act:rotate-180" />
            </summary>
            <div className="border-t border-line">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-cream/60 px-5 py-3">
                <p className="text-sm text-ink-soft">Rien ne part sans validation.</p>
                <DecisionRapide cle={a.cle} decision={dec} compact />
              </div>
              {(() => {
                const recos = recommandation(ctx, s, a);
                if (!recos.length) return null;
                return (
                  <div className="grid gap-px border-b border-line bg-line md:grid-cols-2">
                    {recos.map((r) => (
                      <div key={r.levier} className="bg-white p-5">
                        <p className="flex items-center justify-between gap-2 font-display text-lg">
                          {r.levier}
                          {r.estime && <span className="rounded-full bg-ochre/12 px-2 py-0.5 font-sans text-[0.62rem] font-semibold uppercase tracking-wide text-[#86672f]">objectif estimé</span>}
                        </p>
                        <dl className="mt-3 space-y-2 text-sm">
                          {r.lignes.map((l) => (
                            <div key={l.libelle} className="grid grid-cols-[8.5rem_1fr] gap-3">
                              <dt className="text-xs font-semibold uppercase tracking-wide text-taupe">{l.libelle}</dt>
                              <dd className="leading-snug">{l.valeur}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <Champ label="Objectif">{a.objectif}</Champ>
                <Champ label="Marché et segment">{a.cible}</Champ>
                <Champ label="Message clé">
                  <span className="font-display text-lg italic">« {a.message} »</span>
                </Champ>
                <Champ label="Sémantique cible">
                  {a.semantique.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {a.semantique.map((q) => (
                        <span key={q} className="border border-line bg-cream px-2 py-0.5 text-xs">
                          {q}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-ink-soft">Sans objet.</span>
                  )}
                </Champ>
                <Champ label="Assets">{a.assets}</Champ>
                <Champ label="Déclencheur">{a.declencheur}</Champ>
                <Champ label="Budget ou effort">{a.effort}</Champ>
                <Champ label="Indicateur et ligne de base">
                  {a.kpi}
                  <span className="mt-1 block text-sm text-ink-soft">{a.ligneBase}</span>
                </Champ>
              </div>
              <div className="border-t border-line px-5 py-5">
                <p className="eyebrow text-[0.62rem] text-taupe">{a.vagues.length > 1 ? "Les envois, par groupe de marchés" : "Quand"}</p>
                <ol className="mt-3 space-y-3">
                  {a.vagues.map((v) => (
                    <li key={v.numero} className="grid items-start gap-3 sm:grid-cols-[110px_190px_1fr_auto]">
                      <span className="titre-capitales text-base">{a.vagues.length > 1 ? `Envoi ${v.numero}` : "Date"}</span>
                      <span className="text-sm">{v.debut === v.fin ? formatDate(v.debut, true) : `${formatDate(v.debut)} au ${formatDate(v.fin, true)}`}</span>
                      <span>
                        <Marches ids={v.marches} marches={ctx.marches} max={5} />
                        <span className="block text-xs text-ink-soft">{v.note}</span>
                      </span>
                      <PuceStatut code={v.statut.code} libelle={v.statut.libelle} />
                    </li>
                  ))}
                </ol>
                <div className="mt-5 grid gap-4 text-sm text-ink-soft lg:grid-cols-2">
                  <p>
                    <span className="eyebrow block text-[0.6rem] text-taupe">Pourquoi ces dates</span>
                    {a.justification}
                  </p>
                  <p>
                    <span className="eyebrow block text-[0.6rem] text-taupe">Ce qui change par rapport au plan</span>
                    {a.changement}
                  </p>
                </div>
              </div>
              <div className="border-t border-line px-5 py-4">
                <Brief sujetId={d.id} activationCle={a.cle} actif={dec?.etat === "validee"} />
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );

  const surGoogle = (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="carte p-5">
        <h3 className="font-display text-xl">Ce que les gens cherchent</h3>
        <p className="text-xs text-ink-soft">{ctx.semrush ? `Semrush, volume mensuel moyen et tendance sur 12 mois (${ctx.semrush.origine}).` : "Semrush non chargé."}</p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {lignesSemrush.map(({ q, l }) => (
              <tr key={q.requete + q.base} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-2">
                  {q.requete}
                  <span className="ml-1.5 rounded bg-sand px-1.5 text-[0.65rem] uppercase text-ink-soft">{q.base}</span>
                </td>
                <td className="py-2 text-xs text-ink-soft">{q.usage === "achat" ? "achat" : q.usage === "sejour" ? "séjour" : "veille"}</td>
                <td className="py-2 text-right tabular-nums">{l ? nombre(l.volume) : "n.d."}</td>
                <td className="py-2 pl-3 text-right">{l && <Tendance l={l} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">Seules les requêtes d&apos;achat comptent dans l&apos;intérêt. Les requêtes de séjour nourrissent le contenu. Barres foncées : mois de pic.</p>
      </div>
      <div className="space-y-5">
        <div className="carte p-5">
          <h3 className="font-display text-xl">Ce que la maison capte</h3>
          <p className="text-xs text-ink-soft">{gsc ? `Search Console ${gsc.site}, 12 mois du ${formatRange(gsc.periode[0], gsc.periode[1])}, tous pays.` : "Search Console non chargée."}</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[0.62rem] uppercase tracking-wider text-taupe">
                <th className="pb-1 font-semibold">Requête</th>
                <th className="pb-1 text-right font-semibold">Impressions</th>
                <th className="pb-1 text-right font-semibold">Clics</th>
                <th className="pb-1 pl-3 font-semibold">Place</th>
              </tr>
            </thead>
            <tbody>
              {requetesGsc.map(({ q, g }) => (
                <tr key={q} className="border-t border-line/60">
                  <td className="py-2">{q}</td>
                  <td className="py-2 text-right tabular-nums">{g ? nombre(g.impressions) : "n.s."}</td>
                  <td className="py-2 text-right tabular-nums">{g ? nombre(g.clics) : ""}</td>
                  <td className="py-2 pl-3">
                    {!g ? (
                      <span className="text-xs text-ink-soft">non suivie</span>
                    ) : !g.impressions ? (
                      <Puce ton="brique">Jamais vue</Puce>
                    ) : (
                      <Niveau libelle={visibiliteLibelle(Math.max(0.2, Math.min(1, ((g.position ?? 30) - 1) / 29)))} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="carte p-5">
          <h3 className="font-display text-xl">Pages qui captent ces requêtes</h3>
          {pages.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Inventaire à faire (crawl de la Content Factory).</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {pages.map((p) => (
                  <tr key={p.page} className="border-t border-line/60 first:border-0">
                    <td className="max-w-[260px] truncate py-2" title={p.page}>
                      {p.page}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-soft">
                      {nombre(p.impressions)} impr. · {nombre(p.clics)} clics
                    </td>
                    <td className="py-2 pl-3 text-right">
                      {p.decision.startsWith("mettre") ? <Puce ton="ocre">mettre à jour</Puce> : p.decision === "creer" ? <Puce ton="vert">créer une page dédiée à côté</Puce> : <Puce>conserver</Puce>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-sm">{s.activations.find((a) => a.canal === "seo")?.assets}</p>
        </div>
      </div>
    </div>
  );

  const plusLoin = (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <div className="carte p-5">
        <h3 className="font-display text-xl">Ce qui manque pour trancher</h3>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed">
          {s.manque.map((m) => (
            <li key={m} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-taupe" />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-5">
        <div className="carte p-5">
          <h3 className="font-display text-xl">Sur quoi repose le classement</h3>
          <p className="mt-1 text-xs text-ink-soft">Pour la ligne de marché la plus urgente. Un facteur non mesuré compte pour moitié et est déclaré manquant.</p>
          {(() => {
            const o = s.opportunites.find((x) => x.demandeDetectee && !x.close) ?? s.opportunites[0];
            if (!o) return null;
            const f = [
              ["Demande", o.facteurs.demande],
              ["Reste à gagner sur Google", o.facteurs.visibilite],
              ["Besoin de remplissage", o.facteurs.besoin],
            ] as const;
            return (
              <ul className="mt-3 space-y-3 text-sm">
                <li className="font-semibold">{o.libelle}</li>
                {f.map(([nom, x]) => (
                  <li key={nom}>
                    <span className="flex items-center gap-2 font-semibold">
                      {nom} <Origine origine={x.manquant ? null : x.origine} />
                    </span>
                    <span className="text-ink-soft">{x.detail}</span>
                    <span className="block text-xs text-taupe">{x.source}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
        <div className="carte p-5">
          <h3 className="font-display text-xl">Sources, datées</h3>
          <ul className="mt-2 space-y-1 text-xs text-ink-soft">
            {sources.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <a href={`/api/fiche/${d.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brown hover:underline">
            <Download className="h-3.5 w-3.5" /> Exporter la fiche (texte)
          </a>
        </div>
      </div>
    </div>
  );

  const picsAchat = [...new Set(lignesSemrush.filter((x) => x.l && x.q.usage === "achat").slice(0, 3).flatMap(({ l }) => Object.entries(l!.tendance).filter(([, v]) => v >= 0.8).map(([k]) => Number(k.slice(5, 7)))))]
    .sort((a, b) => ((a + 3) % 12) - ((b + 3) % 12))
    .map(monthName);

  return (
    <>
      <header className="relative isolate overflow-hidden bg-ink text-white">
        <Image src={d.image ?? "/hotels/lodge-park.jpg"} alt="" fill priority className="-z-10 object-cover opacity-75" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
        <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-6 sm:px-6">
          <Link href="/sujets" className="eyebrow inline-flex items-center gap-2 text-white/85 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Tous les sujets
          </Link>
          <div className="apparition mt-10 max-w-3xl sm:mt-14">
            <p className="eyebrow text-white/85">
              {familles[d.famille]} · Lodge Park · {ctx.saison.nom.toLowerCase()}
              {ctx.saison.rejeu ? `, rejoué au ${formatDate(ctx.date, true)}` : ""}
            </p>
            <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] sm:text-6xl">{d.nom}</h1>
            <p className="mt-4 text-lg leading-relaxed text-white/90">{d.theme}</p>
            <p className="eyebrow mt-5 text-white/80">
              {d.sejour ? `Séjour du ${formatRange(d.sejour.debut, d.sejour.fin)}` : d.fenetre_fixe ? `Décision du ${formatRange(d.fenetre_fixe.debut, d.fenetre_fixe.fin)}` : ""}
              {picsAchat.length ? ` · Recherches au plus haut en ${picsAchat.join(", ")}` : ""}
            </p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      {!s.ouvert && <p className="mt-5 border border-line bg-sand px-4 py-3 text-sm">La maison est fermée sur cette période d&apos;après vos dates : aucune action n&apos;est proposée.</p>}
      {s.ouvert && s.remplissage === "plein" && (
        <p className="mt-5 border border-line bg-sand px-4 py-3 text-sm">Vous indiquez que ce sujet est déjà bien vendu : les actions payantes sont suspendues, on garde les newsletters prévues.</p>
      )}
      {s.ouvert && s.remplissage === "bas" && (
        <p className="mt-5 border border-brick/30 bg-brick/5 px-4 py-3 text-sm">Vous indiquez un remplissage bas : sujet prioritaire, les actions sont à lancer en premier.</p>
      )}
      <OuvrirAncre />
      <BlocDecision decision={decision} />
      <div className="mt-8">
        <Suspense>
          <Onglets
            onglets={[
              {
                id: "essentiel",
                label: "L'essentiel",
                contenu: (
                  <div className="space-y-6">
                    {essentiel}
                    <details className="group border border-line bg-white">
                      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-display text-xl">
                        Sur Google, marché par marché <ChevronDown className="h-4 w-4 text-taupe transition group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-line p-5">{surGoogle}</div>
                    </details>
                    <details className="group border border-line bg-white">
                      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-display text-xl">
                        Pour aller plus loin : ce qui manque, les sources <ChevronDown className="h-4 w-4 text-taupe transition group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-line p-5">{plusLoin}</div>
                    </details>
                  </div>
                ),
              },
              { id: "pays", label: "Par marché", contenu: parPays },
              { id: "actions", label: `Actions par levier (${s.activations.length})`, contenu: actions },
            ]}
          />
        </Suspense>
      </div>
      </div>
    </>
  );
}
