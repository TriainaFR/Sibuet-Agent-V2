import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Brief } from "@/components/brief";
import { GrilleMarches, TableauMarches } from "@/components/grille-marches";
import { Onglets } from "@/components/onglets";
import { Champ, Marches, Niveau, Origine, Puce, PuceStatut, Vide } from "@/components/ui";
import { Validation } from "@/components/validation";
import { formatDate, formatRange, monthName } from "@/lib/dates";
import { canalLibelle, interetLibelle, nombre, urgenceLibelle, visibiliteLibelle } from "@/lib/format";
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
  const { sujets, ctx, decisions, interet } = etatSaison();
  const s = sujets.find((x) => x.def.id === id);
  if (!s) notFound();
  const d = s.def;
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
    ctx.asterio && `Réservations : ${ctx.asterio.origine}`,
    "Vacances scolaires : sites officiels par marché, vérifiés sauf Belgique et Pays-Bas",
    "Délais de réservation : hypothèses tant qu'Asterio n'est pas branché, sauf saisie dans Vos données",
  ].filter(Boolean) as string[];

  const essentiel = (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="carte p-4">
          <p className="eyebrow text-[0.6rem] text-taupe">Urgence</p>
          <div className="mt-2">
            <Niveau libelle={urgenceLibelle(s.urgence)} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">{s.fenetre ? `Les clients réservent du ${formatRange(s.fenetre.debut, s.fenetre.fin)}` : "Sur prévision de neige"}</p>
        </div>
        <div className="carte p-4">
          <p className="eyebrow text-[0.6rem] text-taupe">Intérêt</p>
          <div className="mt-2">
            <Niveau libelle={interetLibelle(interet(s))} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">Demande mesurée sur Google, par pays</p>
        </div>
        <div className="carte p-4">
          <p className="eyebrow text-[0.6rem] text-taupe">Sur Google, la maison est</p>
          <div className="mt-2">
            <Niveau libelle={visibiliteLibelle(s.ecart)} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">Sur les requêtes d&apos;achat du sujet</p>
        </div>
        <div className="carte p-4">
          <p className="eyebrow text-[0.6rem] text-taupe">Première action</p>
          <p className="mt-1.5 font-display text-2xl">{s.premiereAction ? (s.premiereAction <= ctx.date ? "Maintenant" : formatDate(s.premiereAction, true)) : "Aucune"}</p>
          <p className="text-sm text-ink-soft">Voir l&apos;onglet Actions</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="carte p-5">
          <p className="eyebrow text-taupe">Pourquoi ce sujet</p>
          <p className="mt-2 leading-relaxed">{s.pourquoi}</p>
        </div>
        <div className="carte p-5">
          <p className="eyebrow text-taupe">Pourquoi maintenant</p>
          <p className="mt-2 leading-relaxed">{s.maintenant || "Rien de pressant à cette date."}</p>
        </div>
        <div className="carte p-5">
          <p className="eyebrow text-taupe">Ce qui change dans le plan</p>
          <p className="mt-2 leading-relaxed">{s.changement}</p>
        </div>
      </div>
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
          <p className="mt-3 font-display text-lg italic leading-snug text-brown">{d.angle}</p>
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
        <h3 className="font-display text-xl">Pays par pays</h3>
        <TableauMarches sujet={s} marches={ctx.marches} interet={interetLibelle} />
      </div>
    </div>
  );

  const actions = (
    <div className="space-y-5">
      {s.activations.length === 0 && <Vide>Aucune activation proposée à cette date : aucune fenêtre ouverte ou à venir avec une demande mesurée.</Vide>}
      {s.activations.map((a) => {
        const dec = decisions[a.cle];
        return (
          <article key={a.cle} className="carte overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b border-line bg-cream/50 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-[0.6rem] text-taupe">
                  {a.type} · {a.vagues.length} vague{a.vagues.length > 1 ? "s" : ""}
                </p>
                <h3 className="font-display text-2xl leading-tight">{canalLibelle[a.canal]}</h3>
              </div>
              <PuceStatut code={a.statut.code} libelle={a.statut.libelle} />
              <Validation cle={a.cle} decision={dec} />
            </header>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <Champ label="Objectif">{a.objectif}</Champ>
              <Champ label="Marché et segment">{a.cible}</Champ>
              <Champ label="Message clé">{a.message}</Champ>
              <Champ label="Sémantique cible">
                {a.semantique.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {a.semantique.map((q) => (
                      <span key={q} className="rounded bg-sand px-2 py-0.5 text-xs">
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
            <div className="border-t border-line px-5 py-4">
              <p className="eyebrow text-[0.6rem] text-taupe">Timing, en vagues</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <tbody>
                    {a.vagues.map((v) => (
                      <tr key={v.numero} className="border-b border-line/60 last:border-0">
                        <td className="w-20 py-2 font-semibold">Vague {v.numero}</td>
                        <td className="w-48 py-2">{v.debut === v.fin ? formatDate(v.debut, true) : `${formatDate(v.debut)} au ${formatDate(v.fin, true)}`}</td>
                        <td className="py-2">
                          <Marches ids={v.marches} marches={ctx.marches} max={5} />
                          <span className="block text-xs text-ink-soft">{v.note}</span>
                        </td>
                        <td className="py-2 text-right">
                          <PuceStatut code={v.statut.code} libelle={v.statut.libelle} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                <strong className="text-ink">Justification.</strong> {a.justification}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                <strong className="text-ink">Ce qui change par rapport au plan.</strong> {a.changement}
              </p>
            </div>
            <div className="border-t border-line px-5 py-4">
              <Brief sujetId={d.id} activationCle={a.cle} actif={dec?.etat === "validee"} />
            </div>
          </article>
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
                      {p.decision.startsWith("mettre") ? <Puce ton="ocre">mettre à jour</Puce> : p.decision === "creer" ? <Puce ton="vert">créer</Puce> : <Puce>conserver</Puce>}
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
              ["Marge", o.facteurs.marge],
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

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <Link href="/sujets" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Tous les sujets
      </Link>
      <header className="mt-4">
        <p className="eyebrow text-taupe">
          {familles[d.famille]} · Lodge Park · hiver 2026-2027
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{d.nom}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">{d.theme}</p>
        <p className="mt-3 text-sm">
          {d.sejour && <>Séjour du {formatRange(d.sejour.debut, d.sejour.fin)}. </>}
          {d.fenetre_fixe && <>Fenêtre de décision du {formatRange(d.fenetre_fixe.debut, d.fenetre_fixe.fin)}. </>}
          {d.requetes.length} requêtes suivies, pic de recherche en{" "}
          {[...new Set(lignesSemrush.filter((x) => x.l && x.q.usage === "achat").slice(0, 3).flatMap(({ l }) => Object.entries(l!.tendance).filter(([, v]) => v >= 0.8).map(([k]) => Number(k.slice(5, 7)))))]
            .sort((a, b) => ((a + 3) % 12) - ((b + 3) % 12))
            .map(monthName)
            .join(", ") || "n.d."}
          .
        </p>
      </header>
      {!s.ouvert && <p className="mt-5 rounded-lg border border-line bg-sand px-4 py-3 text-sm">La maison est fermée sur cette période d&apos;après vos dates : aucune action n&apos;est proposée.</p>}
      {s.ouvert && s.remplissage === "plein" && (
        <p className="mt-5 rounded-lg border border-line bg-sand px-4 py-3 text-sm">Vous indiquez que ce sujet est déjà bien vendu : les actions payantes sont suspendues, on garde les newsletters prévues.</p>
      )}
      {s.ouvert && s.remplissage === "bas" && (
        <p className="mt-5 rounded-lg border border-brick/30 bg-brick/5 px-4 py-3 text-sm">Vous indiquez un remplissage bas : sujet prioritaire, les actions sont à lancer en premier.</p>
      )}
      <div className="mt-6">
        <Suspense>
          <Onglets
            onglets={[
              { id: "essentiel", label: "L'essentiel", contenu: essentiel },
              { id: "pays", label: "Par pays", contenu: parPays },
              { id: "actions", label: `Actions (${s.activations.length})`, contenu: actions },
              { id: "google", label: "Sur Google", contenu: surGoogle },
              { id: "plus", label: "Pour aller plus loin", contenu: plusLoin },
            ]}
          />
        </Suspense>
      </div>
    </div>
  );
}
