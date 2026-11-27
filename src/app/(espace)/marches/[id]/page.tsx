import { ArrowRight, Globe2, Languages } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { IconeCanal } from "@/components/icones";
import { EnTetePage, Niveau, PuceStatut } from "@/components/ui";
import { formatDate, formatRange } from "@/lib/dates";
import { LANGUES } from "@/lib/engine/calcul";
import { lePays, messageMarche } from "@/lib/engine/leviers";
import { hiverDe, unAnAvant, type IndicateursMarche } from "@/lib/engine/marches";
import type { Contexte } from "@/lib/engine/calcul";
import { etatSaison } from "@/services/etat";

const fmt = new Intl.NumberFormat("fr-FR");
const pct = (x: number) => `${Math.round(x * 100)} %`;
const MOT = { haute: "Haute", moyenne: "Moyenne", basse: "Basse" } as const;

export async function generateMetadata(props: PageProps<"/marches/[id]">) {
  const { id } = await props.params;
  return { title: `Marché ${id.toUpperCase()}` };
}

/** Recommandations par levier, tirées des indicateurs du marché : chaque ligne dit sur quoi elle repose. */
function recommandations(ctx: Contexte, x: IndicateursMarche) {
  const m = x.marche;
  const langueLocale = LANGUES[m.langue_locale ?? m.langue] ?? m.langue_locale ?? m.langue;
  const motsCpc = [...(ctx.analyse?.mots_cles[m.id] ?? [])].filter((k) => k.cpc > 0).sort((a, b) => b.recherches - a.recherches).slice(0, 3);
  const r: { levier: string; canal: "crm" | "seo" | "sea" | "meta"; texte: string; base: string }[] = [];
  if (x.delai)
    r.push({
      levier: "Newsletter et CRM",
      canal: "crm",
      texte: `Envoyer environ ${Math.max(1, Math.round(x.delai.q3 / 7))} semaines avant les séjours visés, puis relancer ${Math.max(1, Math.round(x.delai.med / 7))} semaines avant. La moitié des nuitées se réserve à moins de ${x.delai.med} jours.`,
      base: `Délai médian ${x.delai.med} j, quart le plus anticipé à ${x.delai.q3} j (Asterio, ${x.delai.hivers.join(" et ")}).`,
    });
  const a = x.analyse;
  r.push({
    levier: "Référencement",
    canal: "seo",
    texte: !x.langueSite
      ? `Aucune page en ${langueLocale} : commencer par une page d'accueil et une page séjour traduites, puis les pages pratiques (transfert, ski, restaurants).`
      : a?.position_gsc && a.position_gsc > 10
        ? `La maison sort en page 2 (position moyenne ${String(a.position_gsc).replace(".", ",")}). Renforcer les pages qui répondent aux recherches pratiques du marché.`
        : "Le site est présent. Garder les pages à jour avant chaque pic de recherche.",
    base: a ? `Search Console : ${fmt.format(a.impressions_gsc ?? 0)} impressions, ${fmt.format(a.clics_gsc ?? 0)} clics, site ${a.langue_site ?? "n.d."}.` : "Pas de relevé Search Console pour ce pays.",
  });
  if (motsCpc.length)
    r.push({
      levier: "Google Ads",
      canal: "sea",
      texte: `Campagne de recherche ${m.court ? "à déclencher dans la fenêtre d'achat" : "en continu sur la fenêtre d'achat"} sur ${motsCpc.map((k) => `« ${k.mot_cle} »`).join(", ")}.`,
      base: `Semrush ${m.semrush_db ?? m.id}, nov. 2026 : ${motsCpc.map((k) => `${fmt.format(k.recherches)} recherches, ${k.cpc.toFixed(2).replace(".", ",")} € le clic`).join(" ; ")}.`,
    });
  const ota = x.canaux.find((c) => c.canal === "ota");
  r.push({
    levier: "Meta",
    canal: "meta",
    texte:
      ota && ota.part >= 0.3
        ? `Recibler les visiteurs du site venus de ${m.nom} pour ramener en direct une partie des ventes passées par les plateformes (${pct(ota.part)} des nuitées).`
        : m.court
          ? "Peu utile ici : marché proche qui réserve tard, mieux servi par la newsletter et Google."
          : "Audience de voyageurs du luxe dans ce pays, au début de la fenêtre d'achat, vers la page séjour.",
    base: `Répartition par canal de l'hiver de référence (Asterio).`,
  });
  return r;
}

export default async function FicheMarche(props: PageProps<"/marches/[id]">) {
  await connection();
  const { id } = await props.params;
  const { ctx, indicateurs, sujets, actions, decisions } = etatSaison();
  const x = indicateurs.find((i) => i.marche.id === id);
  if (!x) notFound();
  const m = x.marche;
  const h = hiverDe(ctx);
  const an = Number(h.debut.slice(0, 4));
  const a = x.analyse;
  const vac = ctx.vacances.find((v) => v.id === m.id);
  const lignes = sujets
    .filter((s) => s.ouvert)
    .flatMap((s) => s.opportunites.filter((o) => o.marche === m.id && !o.close && o.fenetre).map((o) => ({ s, o })))
    .sort((p, q) => q.o.ordre - p.o.ordre);
  const sesActions = actions.filter((ac) => ac.marches.includes(m.id) && ac.statut.code !== "ferme").slice(0, 8);
  const reco = recommandations(ctx, x);
  const exemple = lignes[0] ? messageMarche(lignes[0].s, m) : null;
  const evo = x.nuiteesN !== null && x.nuiteesN1 ? x.nuiteesN / x.nuiteesN1 - 1 : null;
  const panier = [...(ctx.analyse?.mots_cles[m.id] ?? [])].sort((p, q) => q.recherches - p.recherches).slice(0, 8);
  const maxPanier = Math.max(1, ...panier.map((k) => k.recherches));

  return (
    <>
      <EnTetePage
        fil={[{ href: "/marches", label: "Marchés" }, { label: m.region ?? "Marché" }]}
        titre={
          <span className="inline-flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: m.couleur }} />
            {m.nom}
          </span>
        }
        meta={m.court ? "Marché proche : il réserve tard" : "Marché lointain : il réserve tôt"}
      >
        <p>
          {x.nuiteesN1 ? (
            <>
              {fmt.format(x.nuiteesN1)} nuitées l&apos;hiver {an - 1}-{an}
              {x.nuiteesN !== null && evo !== null && (
                <>
                  , {fmt.format(x.nuiteesN)} l&apos;hiver {an}-{an + 1} ({evo >= 0 ? "+" : "−"}
                  {Math.abs(Math.round(evo * 100))} %)
                </>
              )}
              . {x.moisFort ? `Mois fort : ${x.moisFort}.` : ""} {x.canaux[0] ? `Vend surtout en ${x.canaux[0].nom}.` : ""}
            </>
          ) : (
            `Aucune nuitée de ${lePays(m)} dans Asterio sur l'hiver de référence.`
          )}
        </p>
      </EnTetePage>
    <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">

      {/* Chiffres clés */}
      <section className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titre="Réservé à date" valeur={`${x.aDate}`} unite="nuitées" detail={`contre ${x.aDateN1} au ${formatDate(unAnAvant(ctx.date), true)}`} ton={x.aDate >= x.aDateN1 ? "sage" : "brick"} source="Asterio" />
        <Kpi
          titre="Délai d'achat médian"
          valeur={x.delai ? `${x.delai.med}` : "n.d."}
          unite={x.delai ? "jours" : ""}
          detail={x.delai ? `la moitié entre ${x.delai.q1} et ${x.delai.q3} j${x.delai.medAvecGroupes !== null && x.delai.medAvecGroupes !== x.delai.med ? `, ${x.delai.medAvecGroupes} j avec les groupes` : ""}` : "moins de 15 nuitées individuelles"}
          source={x.delai ? `Asterio, ${x.delai.hivers.join(" et ")}, hors groupes` : "Asterio"}
        />
        <Kpi titre="Part des groupes" valeur={pct(x.partGroupe)} detail="des nuitées de l'hiver, mises à part dans les délais" source="Asterio, segment Groupe Events" />
        <Kpi titre="Demande" valeur={MOT[x.demandeMot]} detail="ventes, débuts de réservation et recherches combinés" source="Asterio, GA4, Semrush" niveau />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-8">
          {/* Canaux */}
          <section>
            <h2 className="text-base font-semibold">Par où ce marché réserve</h2>
            <ul className="mt-4 space-y-2.5">
              {x.canaux.map((c) => (
                <li key={c.canal} className="grid grid-cols-[10rem_1fr_5rem] items-center gap-3 text-sm">
                  <span className="first-letter:uppercase">{c.nom}</span>
                  <span className="h-3 overflow-hidden rounded-r bg-sand">
                    <span className="block h-full rounded-r" style={{ width: pct(c.part), background: m.couleur }} />
                  </span>
                  <span className="text-right tabular-nums">
                    {fmt.format(c.nuitees)} <span className="text-ink-soft">· {pct(c.part)}</span>
                  </span>
                </li>
              ))}
              {!x.canaux.length && <li className="text-sm text-ink-soft">Pas de vente sur l&apos;hiver de référence.</li>}
            </ul>
            <p className="mt-3 text-xs text-taupe">Source : Asterio, nuitées de décembre à mars, hiver {ctx.saison.rejeu && x.nuiteesN !== null ? `${an}-${an + 1}` : `${an - 1}-${an}`}.</p>
          </section>

          {/* Recommandations */}
          <section>
            <h2 className="text-base font-semibold">Ce qu&apos;on recommande, levier par levier</h2>
            <div className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
              {reco.map((r) => (
                <div key={r.levier} className="bg-white p-5">
                  <p className="flex items-center gap-2.5 text-sm font-semibold">
                    <IconeCanal canal={r.canal} taille="h-8 w-8" /> {r.levier}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">{r.texte}</p>
                  <p className="mt-2 text-xs text-ink-soft">Sur quoi ça repose : {r.base}</p>
                </div>
              ))}
            </div>
            {exemple && (
              <div className="mt-4 rounded-xl border border-line bg-cream/60 p-4">
                <p className="text-xs font-medium text-taupe">Message clé pour {m.nom}, {exemple.langue}</p>
                <p className="mt-2 text-[0.9375rem] font-semibold">« {exemple.accroche} »</p>
              </div>
            )}
          </section>

          {/* Sujets et actions */}
          <section>
            <h2 className="text-base font-semibold">Les sujets qui visent {m.nom}</h2>
            {lignes.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Aucune fenêtre d&apos;achat ouverte ou à venir pour ce marché.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-white">
                {lignes.slice(0, 8).map(({ s, o }) => (
                  <li key={o.cle}>
                    <Link href={`/sujets/${s.def.id}?onglet=pays`} className="group flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3.5 hover:bg-cream/60">
                      <span className="min-w-[10rem] flex-1 font-semibold">{s.def.nom}</span>
                      <span className="text-sm text-ink-soft">
                        Achat {formatRange(o.fenetre!.debut, o.fenetre!.fin)}
                        {o.vacances ? ` · ${o.vacances}` : ""}
                      </span>
                      <span className="text-sm">{o.verdict}</span>
                      <ArrowRight className="h-4 w-4 text-greige transition group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {sesActions.length > 0 && (
              <>
                <h3 className="mt-6 text-xs font-medium text-taupe">Actions en cours pour ce marché</h3>
                <ul className="mt-2 space-y-2">
                  {sesActions.map((ac, i) => (
                    <li key={`${ac.activationCle}-${ac.date}-${i}`}>
                      <Link href={`/sujets/${ac.sujetId}?onglet=actions#${encodeURIComponent(ac.activationCle)}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-ink/30">
                        <IconeCanal canal={ac.canal} taille="h-7 w-7" />
                        <span className="flex-1">
                          <span className="font-semibold">{ac.titre}</span> <span className="text-ink-soft">· {ac.sujetNom}, {formatDate(ac.date)}</span>
                        </span>
                        {decisions[ac.activationCle]?.etat === "validee" ? <span className="text-xs font-semibold text-sage">Validée</span> : <PuceStatut code={ac.statut.code} libelle={ac.statut.libelle} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5">
            <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
              <Globe2 className="h-4 w-4 text-taupe" /> Sur le site et sur Google
            </p>
            {a ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Donnee l="Visites (GA4)" v={a.sessions_ga4 !== null ? fmt.format(a.sessions_ga4) : "n.d."} />
                <Donnee l="Engagement" v={a.engagement_ga4 !== null ? pct(a.engagement_ga4) : "n.d."} />
                <Donnee l="Débuts de réservation" v={a.debuts_reservation !== null ? fmt.format(a.debuts_reservation) : "n.d."} />
                <Donnee l="Position Google" v={a.position_gsc !== null ? String(a.position_gsc).replace(".", ",") : "n.d."} />
                <Donnee l="Impressions" v={a.impressions_gsc !== null ? fmt.format(a.impressions_gsc) : "n.d."} />
                <Donnee l="Clics" v={a.clics_gsc !== null ? fmt.format(a.clics_gsc) : "n.d."} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">Pas de relevé GA4 ni Search Console pour ce pays.</p>
            )}
            {a?.lecture && <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed">{a.lecture}</p>}
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Languages className="h-4 w-4 text-taupe" />
              {x.langueSite ? `Le site parle ${LANGUES[m.langue] ?? m.langue}.` : <span className="font-semibold text-brick">Aucune page en {LANGUES[m.langue_locale ?? ""] ?? m.langue_locale} : ce marché lit le site en anglais.</span>}
            </p>
            <p className="mt-3 text-xs text-taupe">
              Source : GA4 du 1er nov. 2025 au 31 oct. 2026, Search Console, analyse du 26 nov. 2026. Relevés postérieurs à la date rejouée : ils décrivent le marché, ils ne servent pas à
              juger la saison.
            </p>
          </section>

          {panier.length > 0 && (
            <section className="rounded-xl border border-line bg-white p-5">
              <p className="text-[0.9375rem] font-semibold">Ce que ce marché cherche</p>
              <ul className="mt-4 space-y-2">
                {panier.map((k) => (
                  <li key={k.mot_cle} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="truncate">{k.mot_cle}</span>
                      <span className="shrink-0 tabular-nums text-ink-soft">{fmt.format(k.recherches)}</span>
                    </div>
                    <span className="mt-1 block h-1 rounded-r bg-sand">
                      <span className="block h-full rounded-r" style={{ width: `${(k.recherches / maxPanier) * 100}%`, background: m.couleur }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-taupe">Source : Semrush, base {m.semrush_db ?? m.id}, recherches mensuelles, nov. 2026.</p>
            </section>
          )}

          <section className="rounded-xl border border-line bg-white p-5">
            <p className="text-[0.9375rem] font-semibold">Vacances scolaires</p>
            {vac?.periodes.length ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {vac.periodes.map((p) => (
                  <li key={p.nom + p.debut} className="flex justify-between gap-3">
                    <span>{p.nom}</span>
                    <span className="text-ink-soft">{formatRange(p.debut, p.fin)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">Pas de vacances d&apos;hiver qui orientent les séjours de ce marché.</p>
            )}
            {vac && (
              <p className="mt-3 text-xs text-taupe">
                Source : {vac.source}
                {vac.ecart_controle ? ` (${vac.ecart_controle})` : ""}.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
    </>
  );
}

function Kpi({ titre, valeur, unite, detail, source, ton, niveau }: { titre: string; valeur: string; unite?: string; detail: string; source: string; ton?: "sage" | "brick"; niveau?: boolean }) {
  return (
    <div className="bg-white p-5">
      <p className="text-xs font-medium text-taupe">{titre}</p>
      <div className="mt-2 flex items-baseline gap-2">
        {niveau ? <Niveau libelle={valeur} /> : <span className={`text-[1.625rem] font-semibold leading-none tracking-tight tabular-nums ${ton === "sage" ? "text-sage" : ton === "brick" ? "text-brick" : ""}`}>{valeur}</span>}
        {unite && <span className="text-sm text-ink-soft">{unite}</span>}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{detail}</p>
      <p className="mt-2 text-[0.68rem] text-taupe">Source : {source}</p>
    </div>
  );
}

function Donnee({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-taupe">{l}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
