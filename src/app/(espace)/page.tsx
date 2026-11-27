import { AlertTriangle, ArrowRight, ArrowUpRight, CalendarPlus, FileDown, Mail, Snowflake, Sparkles, TrendingDown, Trophy } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { DecisionRapide } from "@/components/decision-rapide";
import { IconeCanal } from "@/components/icones";
import { ListeActions } from "@/components/liste-actions";
import { CourbeSaison, FrisesFenetres, type LigneFenetre } from "@/components/tableau-bord";
import { EnTetePage, Niveau } from "@/components/ui";
import { formatDate, jourSemaine } from "@/lib/dates";
import { courbeCumulee, unAnAvant } from "@/lib/engine/marches";
import { canalLibelle, urgenceLibelle } from "@/lib/format";
import type { Alerte } from "@/lib/types";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Cette semaine" };

const iconeAlerte: Record<Alerte["type"], typeof Sparkles> = { evenement: CalendarPlus, fenetre: Sparkles, vide: TrendingDown, neige: Snowflake, plan: Mail, rang: Trophy };
const fmt = new Intl.NumberFormat("fr-FR");
const pct = (a: number, b: number) => (b ? Math.round((a / b - 1) * 100) : null);

function Panneau({ titre, action, children, className = "" }: { titre?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panneau flex flex-col ${className}`}>
      {titre && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[0.8125rem] font-semibold text-ink">{titre}</h2>
          {action}
        </div>
      )}
      <div className="flex-1">{children}</div>
    </section>
  );
}

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
  const courbe = courbeCumulee(ctx);
  const evo = bilan ? pct(bilan.aDate, bilan.aDateN1) : null;
  const decidees = priorites.filter((p) => decisions[p.action.activationCle]?.etat && decisions[p.action.activationCle]?.etat !== "brouillon").length;

  // Fenêtres d'achat ouvertes ou à venir dans les 14 semaines, par marché (signature de l'écran)
  const fin14 = new Date(`${ctx.date}T00:00:00Z`);
  fin14.setUTCDate(fin14.getUTCDate() + 98);
  const limite = fin14.toISOString().slice(0, 10);
  const parM = new Map<string, LigneFenetre>();
  for (const s of sujets.filter((x) => x.ouvert))
    for (const o of s.opportunites)
      if (o.fenetre && !o.close && o.demandeDetectee && o.fenetre.fin >= ctx.date && o.fenetre.debut <= limite) {
        const mm = ctx.marches.find((x) => x.id === o.marche);
        if (!mm || (marche && mm.id !== marche)) continue;
        const l = parM.get(mm.id) ?? { marche: { id: mm.id, nom: mm.nom, couleur: mm.couleur }, fenetres: [] };
        l.fenetres.push({ debut: o.fenetre.debut, fin: o.fenetre.fin, sujet: s.def.nom, sujetId: s.def.id });
        parM.set(mm.id, l);
      }
  const poids = new Map(parMarche.map((x) => [x.marche.id, x.nuiteesN1]));
  const frises = [...parM.values()].sort((a, b) => (poids.get(b.marche.id) ?? 0) - (poids.get(a.marche.id) ?? 0)).slice(0, 9);

  return (
    <>
      <EnTetePage
        titre="Cette semaine"
        meta={`${jourSemaine(ctx.date)} ${formatDate(ctx.date, true)} · ${ctx.maison.nom}${m ? ` · filtré sur ${m.nom}` : ""}`}
        actions={
          <>
            <Link href="/marches" className="bouton-clair">
              Comparer les marchés
            </Link>
            <Link href="/plan-semaine" className="bouton">
              <FileDown className="h-3.5 w-3.5" /> Plan de la semaine
            </Link>
          </>
        }
      >
        {visibles.length} actions possibles d&apos;ici le {formatDate(horizon, true)}. Les trois premières sont à décider maintenant : chacune vise un marché, au moment où ses clients réservent.
      </EnTetePage>

      <div className="mx-auto max-w-[1320px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {/* La saison à date et l'avance fragile */}
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          {rejeu && bilan && (
            <Panneau
              titre={`Hiver ${ctx.saison.nom.replace("Hiver ", "")}, nuitées réservées`}
              action={<span className="text-xs text-taupe">Asterio, export du 14 oct. 2026</span>}
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-2 px-4 pt-4">
                <div>
                  <p className="text-xs text-taupe">Au {formatDate(ctx.date, true)}</p>
                  <p className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">{fmt.format(bilan.aDate)}</span>
                    {evo !== null && (
                      <span className={`pastille ${evo >= 0 ? "bg-sage/12 text-[#3d6639]" : "bg-brick/10 text-brick"}`}>
                        {evo >= 0 ? "+" : "−"}
                        {Math.abs(evo)} %
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-taupe">Au {formatDate(unAnAvant(ctx.date), true)}</p>
                  <p className="mt-0.5 text-xl font-semibold leading-none text-ink-soft tabular-nums">{fmt.format(bilan.aDateN1)}</p>
                </div>
                <div>
                  <p className="text-xs text-taupe">Hiver précédent, final</p>
                  <p className="mt-0.5 text-xl font-semibold leading-none text-ink-soft tabular-nums">{fmt.format(bilan.finalN1)}</p>
                </div>
                <div className="ml-auto flex items-center gap-4 pb-0.5 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-nav" /> Cet hiver
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0 w-4 border-t-[1.5px] border-dashed border-[#b9b3aa]" /> Hiver précédent
                  </span>
                </div>
              </div>
              <div className="px-2 pb-2 pt-1">
                <CourbeSaison c={courbe} date={ctx.date} aDate={bilan.aDate} aDateN1={bilan.aDateN1} />
              </div>
            </Panneau>
          )}

          {avance?.phrase && !m ? (
            <Panneau
              titre={
                <span className="inline-flex items-center gap-2 text-brick">
                  <AlertTriangle className="h-4 w-4" /> Avance fragile
                </span>
              }
              className="bg-[#fffaf8]"
            >
              <div className="p-4">
                <p className="text-[0.9375rem] font-medium leading-snug text-ink">{avance.phrase}</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                  Une avance qui tient à quelques marchés lointains peut disparaître en quelques semaines. Les priorités visent d&apos;abord les marchés qui décrochent.
                </p>
                <p className="mt-4 text-xs font-medium text-taupe">Écart à date avec l&apos;an dernier, en nuitées</p>
                <ul className="mt-2 space-y-1.5">
                  {gains.map((g) => (
                    <li key={g.pays} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-[0.8125rem]">
                      <span className="truncate text-ink-soft">{g.pays}</span>
                      <span className="relative h-2">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                        <span className="absolute left-1/2 top-0 h-2 rounded-r bg-sage/80" style={{ width: `${(g.gain / echelle) * 50}%` }} />
                      </span>
                      <span className="text-right font-medium text-[#3d6639] tabular-nums">+{g.gain}</span>
                    </li>
                  ))}
                  {recul && (
                    <li className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-[0.8125rem] font-semibold">
                      <span className="truncate">{recul.pays}</span>
                      <span className="relative h-2">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
                        <span className="absolute top-0 h-2 rounded-l bg-brick" style={{ right: "50%", width: `${((recul.aDateN1 - recul.aDate) / echelle) * 50}%` }} />
                      </span>
                      <span className="text-right text-brick tabular-nums">−{recul.aDateN1 - recul.aDate}</span>
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-xs text-taupe">Source : Asterio, nuitées de décembre à mars réservées au {formatDate(ctx.date, true)} et un an plus tôt.</p>
              </div>
            </Panneau>
          ) : null}
        </div>

        {/* Les trois priorités */}
        <section aria-labelledby="priorites" className="pt-2">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="priorites" className="text-base font-semibold tracking-tight">
              À décider cette semaine
            </h2>
            <p className="text-[0.8125rem] text-taupe">
              {decidees} sur {priorites.length} décidée{decidees > 1 ? "s" : ""}
            </p>
          </div>
          {priorites.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-ink-soft">Aucune action à lancer cette semaine{m ? ` pour ${m.nom}` : ""}.</p>
          ) : (
            <ol className="grid gap-4 lg:grid-cols-3">
              {priorites.map((p, i) => {
                const dec = decisions[p.action.activationCle];
                return (
                  <li key={p.action.activationCle + p.marche.id} className="panneau flex flex-col transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(28,28,26,0.12)]">
                    <div className="flex items-center gap-2.5 px-4 pt-4">
                      <IconeCanal canal={p.action.canal} taille="h-7 w-7" />
                      <span className="flex-1 truncate text-[0.8125rem] text-ink-soft">{canalLibelle[p.action.canal]}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cream text-xs font-semibold text-ink-soft">{i + 1}</span>
                    </div>
                    <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                      <Link href={`/marches/${p.marche.id}`} className="inline-flex items-center gap-1.5 self-start rounded-md border border-line px-2 py-0.5 text-xs font-medium hover:bg-cream">
                        <span className="h-2 w-2 rounded-full" style={{ background: p.marche.couleur }} />
                        {p.marche.nom}
                      </Link>
                      <h3 className="mt-2.5 text-[0.9375rem] font-semibold leading-snug tracking-tight">{p.titre}</h3>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-soft">{p.raison}</p>
                      <dl className="mt-3 flex items-end gap-6 text-xs">
                        <div>
                          <dt className="text-taupe">Quand</dt>
                          <dd className="mt-0.5 font-medium">{p.action.date <= ctx.date ? "Cette semaine" : `Dès le ${formatDate(p.action.date)}`}</dd>
                        </div>
                        <div>
                          <dt className="text-taupe">Urgence</dt>
                          <dd className="mt-0.5">
                            <Niveau libelle={urgenceLibelle(p.opportunite.urgence)} compact />
                          </dd>
                        </div>
                        <Link
                          href={`/sujets/${p.sujet.def.id}?onglet=actions#${encodeURIComponent(p.action.activationCle)}`}
                          className="ml-auto inline-flex items-center gap-1 font-medium text-nav hover:underline"
                        >
                          Recommandation et brief <ArrowRight className="h-3 w-3" />
                        </Link>
                      </dl>
                      {p.autresMarches.length > 0 && <p className="mt-2 text-xs text-taupe">Touche aussi : {p.autresMarches.join(", ")}.</p>}
                    </div>
                    <div className="border-t border-line px-4 py-3">
                      <DecisionRapide cle={p.action.activationCle} decision={dec} compact />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Marchés et fenêtres */}
        <div className="grid gap-4 pt-2 lg:grid-cols-[1.25fr_1fr]">
          {!m && (
            <Panneau
              titre="Marchés à date"
              action={
                <Link href="/marches" className="inline-flex items-center gap-1 text-xs font-medium text-nav hover:underline">
                  Tous les marchés <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-taupe">
                      <th className="px-4 py-2 font-medium">Marché</th>
                      <th className="px-3 py-2 text-right font-medium">À date</th>
                      <th className="px-3 py-2 text-right font-medium">Un an avant</th>
                      <th className="px-3 py-2 text-right font-medium">Écart</th>
                      <th className="px-3 py-2 text-right font-medium">Hiver préc.</th>
                      <th className="px-4 py-2 text-right font-medium">Délai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parMarche.slice(0, 10).map((x) => {
                      const e = x.aDate - x.aDateN1;
                      return (
                        <tr key={x.marche.id} className="border-b border-line/70 last:border-0 hover:bg-cream/70">
                          <td className="px-4 py-2">
                            <Link href={`/marches/${x.marche.id}`} className="inline-flex items-center gap-2 font-medium hover:underline">
                              <span className="h-2 w-2 rounded-full" style={{ background: x.marche.couleur }} />
                              {x.marche.nom}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">{x.aDate}</td>
                          <td className="px-3 py-2 text-right text-ink-soft tabular-nums">{x.aDateN1}</td>
                          <td className={`px-3 py-2 text-right font-medium tabular-nums ${e > 0 ? "text-[#3d6639]" : e < 0 ? "text-brick" : "text-taupe"}`}>{e > 0 ? `+${e}` : e < 0 ? `−${-e}` : "0"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt.format(x.nuiteesN1)}</td>
                          <td className="px-4 py-2 text-right text-ink-soft tabular-nums">{x.delai ? `${x.delai.med} j` : "n.d."}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-line px-4 py-2.5 text-xs text-taupe">Source : Asterio, nuitées de décembre à mars. Délai médian pondéré par les nuitées, hors groupes, deux derniers hivers.</p>
            </Panneau>
          )}
          <Panneau titre="Fenêtres d'achat, 14 prochaines semaines" action={<span className="text-xs text-taupe">par marché</span>}>
            <div className="p-4">
              {frises.length ? <FrisesFenetres lignes={frises} date={ctx.date} /> : <p className="text-sm text-ink-soft">Aucune fenêtre d&apos;achat ouverte ou à venir.</p>}
              <p className="mt-3 text-xs text-taupe">Une barre par sujet : la période où les clients de ce marché réservent. Trait cognac : aujourd&apos;hui.</p>
            </div>
          </Panneau>
        </div>

        {/* Toutes les actions et ce qui a changé */}
        <div className="grid gap-4 pt-2 lg:grid-cols-[1fr_340px]" id="actions">
          <Panneau titre={`Toutes les actions jusqu'au ${formatDate(horizon, true)}`}>
            <div className="p-4">
              <ListeActions actions={visibles} images={images} marches={ctx.marches} decisions={decisions} date={ctx.date} />
            </div>
          </Panneau>
          <div className="space-y-4">
            <Panneau titre="Depuis la semaine dernière">
              <ol className="divide-y divide-line">
                {alertes.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">Rien de nouveau cette semaine.</li>}
                {alertes.slice(0, 6).map((a, i) => {
                  const I = iconeAlerte[a.type];
                  return (
                    <li key={i} className="flex gap-3 px-4 py-3 text-[0.8125rem]">
                      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${a.gravite === "action" ? "bg-cognac/12 text-[#8a4b2a]" : "bg-cream text-taupe"}`}>
                        <I className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0">
                        {a.sujetId ? (
                          <Link href={`/sujets/${a.sujetId}`} className="font-medium leading-snug hover:underline">
                            {a.titre}
                          </Link>
                        ) : (
                          <span className="font-medium leading-snug">{a.titre}</span>
                        )}
                        <span className="mt-0.5 block leading-snug text-ink-soft">{a.detail}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panneau>
            {rejeu && (
              <Panneau titre="Ce qui est réel dans la démonstration">
                <ul className="space-y-2 p-4 text-[0.8125rem] leading-snug">
                  {[
                    { ok: true, t: "Ventes Asterio du Lodge Park, connues à cette date et un an plus tôt" },
                    { ok: true, t: "Délais de réservation mesurés par marché, hors groupes" },
                    { ok: true, t: "Plan d'envois 2025-2026 de Sibuet et vacances de chaque marché" },
                    { ok: false, t: "Délais, GA4 et Semrush couvrent aussi la saison rejouée : un léger regard en arrière" },
                    { ok: false, t: "Agenda de Megève : dates de la saison suivante ramenées d'un an" },
                    { ok: false, t: "Aucune action n'a été envoyée" },
                  ].map((x) => (
                    <li key={x.t} className="flex gap-2.5">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${x.ok ? "bg-sage" : "bg-ochre"}`} />
                      <span className={x.ok ? "" : "text-ink-soft"}>{x.t}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-line px-4 py-2.5">
                  <Link href="/mesure#verdict" className="inline-flex items-center gap-1 text-xs font-medium text-nav hover:underline">
                    Ce qui s&apos;est passé ensuite <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Panneau>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
