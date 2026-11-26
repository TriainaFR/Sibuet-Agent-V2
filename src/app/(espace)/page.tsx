import { AlertTriangle, ArrowRight, CalendarPlus, FileDown, Mail, Snowflake, Sparkles, TrendingDown, Trophy } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { DecisionRapide } from "@/components/decision-rapide";
import { IconeCanal } from "@/components/icones";
import { ListeActions } from "@/components/liste-actions";
import { Niveau } from "@/components/ui";
import { addDays, formatDate, jourSemaine } from "@/lib/dates";
import { unAnAvant } from "@/lib/engine/marches";
import { canalLibelle, urgenceLibelle } from "@/lib/format";
import type { Alerte } from "@/lib/types";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Cette semaine" };

const iconeAlerte: Record<Alerte["type"], typeof Sparkles> = { evenement: CalendarPlus, fenetre: Sparkles, vide: TrendingDown, neige: Snowflake, plan: Mail, rang: Trophy };
const fmt = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? `${a >= b ? "+" : "−"}${Math.abs(Math.round((a / b - 1) * 100))} %` : "nouveau");

export default async function CetteSemaine() {
  await connection();
  const { ctx, sujets, actions, alertes, bilan, decisions, horizon, priorites, avance, indicateurs, marche } = etatSaison();
  const rejeu = ctx.saison.rejeu;
  const m = marche ? ctx.marches.find((x) => x.id === marche) : null;
  const visibles = actions.filter((a) => a.statut.code !== "ferme" && (!marche || a.marches.includes(marche)));
  const images = Object.fromEntries(sujets.map((s) => [s.def.id, s.def.image ?? ""]));
  const parMarche = [...indicateurs].filter((x) => x.nuiteesN1 > 0).sort((a, b) => b.nuiteesN1 - a.nuiteesN1);
  const gains = (avance?.moteurs ?? []).slice(0, 5);
  const recul = avance?.principal && avance.principal.aDate < avance.principal.aDateN1 ? avance.principal : null;
  const echelle = Math.max(1, ...gains.map((g) => g.gain), recul ? recul.aDateN1 - recul.aDate : 0);

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-10 sm:px-6">
      {/* En-tête de page : une ligne de titre, pas de bandeau photo, pour que la première action soit visible tout de suite */}
      <section className="grid items-end gap-6 border-b border-line py-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow text-taupe">
            {jourSemaine(ctx.date)} {formatDate(ctx.date, true)}
            {m ? ` · ${m.nom}` : ""}
          </p>
          <h1 className="mt-2 font-display text-[2.6rem] leading-[1.05] sm:text-5xl">Cette semaine au Lodge Park</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            {visibles.length} action{visibles.length > 1 ? "s" : ""} possibles d&apos;ici le {formatDate(horizon, true)}
            {m ? ` pour ${m.nom}` : ""}. Les trois premières sont à décider maintenant : chacune vise un marché, au moment où ses clients réservent.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/plan-semaine" className="bouton-clair">
              <FileDown className="h-3.5 w-3.5" /> Plan de la semaine (PDF)
            </Link>
            <Link href="/marches" className="lien-charme self-center text-maison">
              Les 14 marchés
            </Link>
          </div>
        </div>
        {rejeu && bilan && (
          <div className="border border-line bg-white p-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-taupe">Hiver {ctx.saison.nom.replace("Hiver ", "")}, réservé à date</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-[2.6rem] font-semibold leading-none">{fmt.format(bilan.aDate)}</span>
              <span className={`text-sm font-semibold ${bilan.aDate >= bilan.aDateN1 ? "text-sage" : "text-brick"}`}>
                {bilan.aDate >= bilan.aDateN1 ? "▲" : "▼"} {pct(bilan.aDate, bilan.aDateN1).replace(/^[+−]/, "")}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              nuitées de décembre à mars, contre {fmt.format(bilan.aDateN1)} au {formatDate(unAnAvant(ctx.date), true)}. L&apos;hiver précédent avait fini à {fmt.format(bilan.finalN1)}.
            </p>
            <p className="mt-2 text-[0.7rem] text-taupe">Source : Asterio, réservations enregistrées à chaque date (export du 14 oct. 2026).</p>
          </div>
        )}
      </section>

      {/* Avance fragile */}
      {avance?.phrase && !m && (
        <section className="mt-8 grid gap-6 border-l-4 border-brick bg-white p-6 shadow-[0_12px_32px_-24px_rgba(164,85,58,0.6)] lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-brick">
              <AlertTriangle className="h-4 w-4" /> Avance fragile
            </p>
            <p className="mt-3 font-display text-[1.6rem] leading-snug">{avance.phrase}</p>
            <p className="mt-3 text-sm text-ink-soft">
              Une avance qui tient à quelques marchés lointains peut disparaître en quelques semaines : les priorités ci-dessous visent d&apos;abord les marchés qui
              décrochent.
            </p>
          </div>
          <div aria-label="Écart à date par pays, en nuitées">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-taupe">Écart à date avec l&apos;an dernier, en nuitées</p>
            <ul className="mt-3 space-y-2">
              {gains.map((g) => (
                <li key={g.pays} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="truncate">{g.pays}</span>
                  <span className="relative h-2.5">
                    <span className="absolute left-1/2 top-0 h-2.5 rounded-r-[4px] bg-sage" style={{ width: `${(g.gain / echelle) * 50}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-sage">+{g.gain}</span>
                </li>
              ))}
              {recul && (
                <li className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm font-semibold">
                  <span className="truncate">{recul.pays}</span>
                  <span className="relative h-2.5">
                    <span className="absolute top-0 h-2.5 rounded-l-[4px] bg-brick" style={{ right: "50%", width: `${((recul.aDateN1 - recul.aDate) / echelle) * 50}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-brick">−{recul.aDateN1 - recul.aDate}</span>
                </li>
              )}
            </ul>
            <p className="mt-3 text-[0.7rem] text-taupe">Source : Asterio, nuitées de décembre à mars réservées au {formatDate(ctx.date, true)} et au même jour un an plus tôt.</p>
          </div>
        </section>
      )}

      {/* Trois priorités */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-taupe">À décider maintenant</p>
            <h2 className="mt-1 font-display text-4xl">{priorites.length ? `Les ${priorites.length === 1 ? "" : priorites.length === 2 ? "deux " : "trois "}priorités` : "Rien d'urgent"}</h2>
          </div>
          {m && (
            <Link href="/" className="text-sm text-ink-soft underline-offset-4 hover:underline">
              Filtré sur {m.nom}
            </Link>
          )}
        </div>
        {priorites.length === 0 ? (
          <p className="mt-5 border border-dashed border-line bg-white/60 px-5 py-8 text-center text-ink-soft">Aucune action à lancer cette semaine{m ? ` pour ${m.nom}` : ""}.</p>
        ) : (
          <ol className="mt-6 grid gap-5 lg:grid-cols-3">
            {priorites.map((p, i) => {
              const dec = decisions[p.action.activationCle];
              return (
                <li key={p.action.activationCle + p.marche.id} className="flex flex-col border border-line bg-white">
                  <div className="h-1" style={{ background: p.marche.couleur }} />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-taupe">
                        <IconeCanal canal={p.action.canal} taille="h-8 w-8" />
                        {canalLibelle[p.action.canal]}
                      </span>
                      <span className="font-display text-3xl text-greige">{i + 1}</span>
                    </div>
                    <Link href={`/marches/${p.marche.id}`} className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-sand px-3 py-1 text-sm font-semibold hover:bg-line">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.marche.couleur }} />
                      {p.marche.nom}
                    </Link>
                    <h3 className="mt-3 font-display text-[1.45rem] leading-snug">{p.titre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.raison}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
                      <div>
                        <dt className="text-taupe">Quand</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{p.action.date <= ctx.date ? "Cette semaine" : `À partir du ${formatDate(p.action.date)}`}</dd>
                      </div>
                      <div>
                        <dt className="text-taupe">Urgence</dt>
                        <dd className="mt-0.5">
                          <Niveau libelle={urgenceLibelle(p.opportunite.urgence)} compact />
                        </dd>
                      </div>
                    </dl>
                    {p.autresMarches.length > 0 && <p className="mt-3 text-xs text-ink-soft">Le même envoi touche aussi : {p.autresMarches.join(", ")}.</p>}
                    <div className="mt-auto pt-5">
                      <DecisionRapide cle={p.action.activationCle} decision={dec} compact />
                      <Link
                        href={`/sujets/${p.sujet.def.id}?onglet=actions#${encodeURIComponent(p.action.activationCle)}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-maison underline-offset-4 hover:underline"
                      >
                        Voir la recommandation et le brief <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Par marché, à date */}
      {!m && (
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-taupe">Par marché</p>
              <h2 className="mt-1 font-display text-4xl">Où en est chaque marché</h2>
              <p className="mt-1 text-sm text-ink-soft">Nuitées de l&apos;hiver déjà réservées, au même jour qu&apos;un an plus tôt. Classés par poids l&apos;hiver précédent.</p>
            </div>
            <Link href="/marches" className="lien-charme text-maison">
              Toutes les fiches marché
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto border border-line bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[0.64rem] uppercase tracking-[0.12em] text-taupe">
                  <th className="px-5 py-3 font-semibold">Marché</th>
                  <th className="px-3 py-3 text-right font-semibold">Réservé à date</th>
                  <th className="px-3 py-3 text-right font-semibold">Un an plus tôt</th>
                  <th className="px-3 py-3 text-right font-semibold">Écart</th>
                  <th className="px-3 py-3 text-right font-semibold">Hiver précédent</th>
                  <th className="px-3 py-3 font-semibold">Réserve</th>
                  <th className="px-5 py-3 font-semibold">Mois fort</th>
                </tr>
              </thead>
              <tbody>
                {parMarche.map((x) => {
                  const e = x.aDate - x.aDateN1;
                  return (
                    <tr key={x.marche.id} className="border-b border-line/70 last:border-0 hover:bg-cream/60">
                      <td className="px-5 py-2.5">
                        <Link href={`/marches/${x.marche.id}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: x.marche.couleur }} />
                          {x.marche.nom}
                        </Link>
                        {!x.langueSite && <span className="ml-2 rounded-full bg-ochre/12 px-2 py-0.5 text-[0.62rem] font-semibold text-[#86672f]">langue manquante</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{x.aDate}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{x.aDateN1}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${e > 0 ? "text-sage" : e < 0 ? "text-brick" : "text-ink-soft"}`}>{e > 0 ? `+${e}` : e < 0 ? `−${-e}` : "="}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt.format(x.nuiteesN1)}</td>
                      <td className="px-3 py-2.5 text-ink-soft">{x.delai ? `${x.delai.med} j avant` : "n.d."}</td>
                      <td className="px-5 py-2.5 text-ink-soft">{x.moisFort ?? "n.d."}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[0.7rem] text-taupe">
            Source : Asterio, nuitées de décembre à mars, hors lignes sans chambre occupée ; délai médian pondéré par les nuitées, hors groupes, hivers 2024-2025 et 2025-2026.
          </p>
        </section>
      )}

      {/* Toutes les actions, et ce qui a changé */}
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_340px]" id="actions">
        <section className="min-w-0">
          <p className="eyebrow text-taupe">Jusqu&apos;au {formatDate(horizon, true)}</p>
          <h2 className="mt-1 font-display text-4xl">Toutes les actions, semaine par semaine</h2>
          <p className="mt-2 text-sm text-ink-soft">Les priorités ci-dessus en font partie. Cliquez une action pour ouvrir sa fiche.</p>
          <div className="mt-6">
            <ListeActions actions={visibles} images={images} marches={ctx.marches} decisions={decisions} date={ctx.date} />
          </div>
        </section>
        <aside className="space-y-6">
          <section className="carte p-6">
            <p className="eyebrow text-taupe">Depuis la semaine dernière</p>
            <h2 className="mt-1 font-display text-2xl">Ce qui a changé</h2>
            <ol className="relative mt-5 space-y-5 border-l border-line pl-5">
              {alertes.length === 0 && <li className="text-sm text-ink-soft">Rien de nouveau cette semaine.</li>}
              {alertes.slice(0, 6).map((a, i) => {
                const I = iconeAlerte[a.type];
                return (
                  <li key={i} className="relative text-sm">
                    <span
                      className={`absolute -left-[31px] top-0 inline-flex h-5 w-5 items-center justify-center rounded-full ${a.gravite === "action" ? "bg-cognac text-white" : "border border-line bg-white text-taupe"}`}
                    >
                      <I className="h-3 w-3" strokeWidth={2} />
                    </span>
                    {a.sujetId ? (
                      <Link href={`/sujets/${a.sujetId}`} className="font-semibold leading-snug hover:text-cognac">
                        {a.titre}
                      </Link>
                    ) : (
                      <span className="font-semibold leading-snug">{a.titre}</span>
                    )}
                    <span className="mt-0.5 block text-ink-soft">{a.detail}</span>
                  </li>
                );
              })}
            </ol>
          </section>
          {rejeu && (
            <section className="carte p-6">
              <p className="eyebrow text-taupe">Démonstration</p>
              <h2 className="mt-1 font-display text-2xl">Ce qui est réel, ce qui ne l&apos;est pas</h2>
              <ul className="mt-4 space-y-2.5 text-sm leading-snug">
                {[
                  { ok: true, t: "Ventes Asterio du Lodge Park, réservations connues à cette date et un an plus tôt" },
                  { ok: true, t: "Délais de réservation mesurés par marché, hors groupes" },
                  { ok: true, t: "Plan d'envois 2025-2026 de Sibuet et vacances de chaque marché" },
                  { ok: false, t: "Délais, GA4 et Semrush couvrent aussi la saison rejouée : un léger regard en arrière" },
                  { ok: false, t: "Agenda de Megève : dates de la saison suivante ramenées d'un an" },
                  { ok: false, t: "Aucune action n'a été envoyée : la démonstration montre ce que l'agent aurait proposé" },
                ].map((x) => (
                  <li key={x.t} className="flex gap-2.5">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${x.ok ? "bg-sage" : "bg-ochre"}`} />
                    <span className={x.ok ? "" : "text-ink-soft"}>{x.t}</span>
                  </li>
                ))}
              </ul>
              <Link href="/mesure#verdict" className="lien-charme mt-5 text-maison">
                Ce qui s&apos;est passé ensuite
              </Link>
            </section>
          )}
          <section className="carte p-6">
            <p className="eyebrow text-taupe">Fenêtres de la quinzaine</p>
            <ul className="mt-3 space-y-2 text-sm">
              {sujets
                .filter((s) => s.ouvert)
                .flatMap((s) => s.opportunites.filter((o) => o.fenetre && o.fenetre.debut > ctx.date && o.fenetre.debut <= addDays(ctx.date, 14)).map((o) => ({ s, o })))
                .sort((a, b) => a.o.fenetre!.debut.localeCompare(b.o.fenetre!.debut))
                .slice(0, 6)
                .map(({ s, o }) => (
                  <li key={o.cle} className="flex items-baseline justify-between gap-3">
                    <Link href={`/sujets/${s.def.id}`} className="hover:underline">
                      {o.libelle} · {s.def.nom.split(",")[0]}
                    </Link>
                    <span className="whitespace-nowrap text-xs text-ink-soft">{formatDate(o.fenetre!.debut)}</span>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
