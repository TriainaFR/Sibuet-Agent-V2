import { ArrowLeft, ArrowRight, BedDouble, CalendarClock, Globe2, Hourglass, Store, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Chiffre, EnTete, Source } from "@/components/ds";
import { BarresH, Chaleur, Courbes, Delais, Empile, TableauChiffres } from "@/components/graphiques";
import { Bandeau } from "@/components/ui";
import { CANAUX, COULEUR_N1 } from "@/lib/da";
import { formatDate } from "@/lib/dates";
import { MOIS_COURTS, laSaison, nomSaison, portrait, type Constat } from "@/lib/engine/portrait";
import { lireHistorique } from "@/services/contexte";
import { lireMaisons } from "@/services/reference";

const fmt = new Intl.NumberFormat("fr-FR");
const n = (x: number) => fmt.format(Math.round(x));
const pc = (x: number | null | undefined) => (x === null || x === undefined ? "n.d." : `${Math.round(x * 100)} %`);

export async function generateMetadata({ params }: PageProps<"/maisons/[id]">) {
  const { id } = await params;
  return { title: lireMaisons().maisons.find((m) => m.id === id)?.nom ?? "Maison" };
}

const ICONES: Record<Constat["theme"], typeof Globe2> = { saison: BedDouble, pays: Globe2, delai: Hourglass, canal: Store, famille: Users, rythme: CalendarClock };

export default async function PortraitMaison({ params }: PageProps<"/maisons/[id]">) {
  await connection();
  const { id } = await params;
  const { maisons, pilote } = lireMaisons();
  const m = maisons.find((x) => x.id === id);
  if (!m) notFound();
  const historique = lireHistorique();
  const h = historique?.donnees.maisons.find((x) => x.id === id);
  const p = h ? portrait(h) : null;
  const s = p?.saison ?? null;
  const prec = s?.precedente ? h!.saisons.find((x) => x.id === s.precedente!.id) : null;
  const autre = (photo: string) => (photo.endsWith(".jpg") ? photo.replace(/(-2)?\.jpg$/, "-2.jpg") : photo);
  const photo2 = m.id === "lodge-park" ? "/lodge/lp-12.jpg" : ["fermes-de-marie", "bastide-de-marie"].includes(m.id) ? autre(m.image) : m.destination === "Megève" ? "/hotels/megeve.jpg" : m.id === "gyp-sea" ? "/hotels/gyp-sea-hotel.jpg" : m.id === "villa-marie" ? "/hotels/saint-tropez.jpg" : "/hotels/menerbes.jpg";

  // Séries du rythme de remplissage : les deux dernières saisons complètes du même type
  const typeRef = s?.nom.replace(/ \d{4}(-\d{4})?$/, "");
  const saisonsRythme = h ? h.saisons.filter((x) => x.complete && x.nuitees > 50 && x.nom.startsWith(typeRef ?? "")).slice(-2) : [];
  const lignesMois = h ? h.calendrierAchat.map((l, i) => ({ i, t: l.reduce((a, b) => a + b, 0) })).filter((x) => x.t > 0).map((x) => x.i) : [];
  // Lignes du calendrier d'achat dans l'ordre de la saison (de l'automne au printemps pour l'hiver)
  const debutSaison = s ? Number(s.debut.slice(5, 7)) - 1 : 0;
  const ordreMois = [...lignesMois].sort((a, b) => ((a - debutSaison + 12) % 12) - ((b - debutSaison + 12) % 12));
  const paysAvecDelai = h ? h.pays.filter((x) => x.delai && x.delai.n >= 10 && x.pays !== "Autres pays").slice(0, 8) : [];
  const totalPays = h ? h.pays.reduce((a, x) => a + x.nuitees, 0) : 0;

  return (
    <div data-maison={m.id}>
      <Bandeau eyebrow={m.lieu ?? m.destination} titre={m.nom} sousTitre={m.tagline} filigrane={m.nom.split(" ").slice(-1)[0]} photo={m.image} photo2={photo2}>
        <p>
          {h
            ? `Portrait de la clientèle, tiré de ${n(h.nuitees)} nuitées occupées entre le ${formatDate(h.nuits[0], true)} et le ${formatDate(h.nuits[1], true)}.`
            : "Aucun historique Asterio pour cette maison."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/maisons" className="inline-flex items-center gap-2 border border-white/60 px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Toutes les maisons
          </Link>
          {m.id === pilote && (
            <Link href="/" className="inline-flex items-center gap-2 bg-white px-3.5 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-maison-encre transition hover:bg-maison-fond">
              Les actions de la semaine <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </Bandeau>

      {h && p && (
        <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6">
          {/* Chiffres clés */}
          {s && (
            <p className="mb-6 text-sm text-ink-soft">
              Chiffres {s.complete ? "de" : "provisoires de"} {laSaison(nomSaison(s))}
              {prec && s.precedente?.memeFenetre ? `, comparés à ${laSaison(prec.nom)} sur les mêmes dates` : ""}.
            </p>
          )}
          <section className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line pb-10 lg:grid-cols-4">
            <Chiffre
              grand
              libelle={s ? nomSaison(s) : "Nuitées"}
              valeur={s ? n(s.nuitees) : n(h.nuitees)}
              ecart={p.evolution !== null ? { texte: `${Math.abs(Math.round(p.evolution * 100))} %`, sens: p.evolution > 0.005 ? "hausse" : p.evolution < -0.005 ? "baisse" : "stable" } : undefined}
              note={s?.precedente?.memeFenetre ? `contre ${n(s.precedente.memeFenetre)} sur les mêmes dates un an plus tôt` : "nuitées occupées"}
            />
            <Chiffre
              grand
              libelle="Taux d'occupation"
              valeur={pc(s?.occupation)}
              note={prec?.occupation !== null && prec?.occupation !== undefined ? `${pc(prec.occupation)} la saison précédente` : m.chambres ? `${m.chambres} chambres, nuits ouvertes` : "capacité non publiée"}
            />
            <Chiffre grand libelle="Vendu en direct" valeur={pc(s?.direct)} note={s ? `dont ${pc((s.canaux.site ?? 0) / Math.max(1, s.nuitees))} par le site` : undefined} />
            <Chiffre grand libelle="Délai médian" valeur={s?.delai ? `${s.delai.med} j` : "n.d."} note={s?.delai ? `la moitié réserve entre ${s.delai.q1} et ${s.delai.q3} jours avant` : undefined} />
          </section>

          {/* Constats */}
          <section className="mt-12">
            <EnTete surtitre="Ce que disent les réservations" titre="Six constats">
              Rédigés à partir de l&apos;historique, sans interprétation : à l&apos;équipe d&apos;en tirer les décisions, à l&apos;agent de les traduire en dates.
            </EnTete>
            <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {p.constats.map((c) => {
                const I = ICONES[c.theme];
                return (
                  <article key={c.theme} className="flex flex-col bg-white p-6">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-maison-fond text-maison">
                        <I className="h-4 w-4" strokeWidth={1.6} />
                      </span>
                      <span className="text-2xl font-semibold text-ink">{c.chiffre}</span>
                    </div>
                    <h3 className="titre-maison mt-4 text-xl leading-snug">{c.titre}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.texte}</p>
                  </article>
                );
              })}
            </div>
            <Source>{p.source}</Source>
          </section>

          {/* Saison après saison */}
          <section className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Saison après saison" titre="Les nuitées, mois par mois">
                Deux années d&apos;octobre à septembre, l&apos;une sur l&apos;autre. Un mois incomplet dans l&apos;export n&apos;est pas tracé.
              </EnTete>
              <Courbes
                ariaLabel={`Nuitées mensuelles de ${m.nom} sur deux années`}
                series={p.annees.map((a, i) => ({
                  id: a.id,
                  nom: a.nom,
                  couleur: i === p.annees.length - 1 ? "var(--maison-accent)" : COULEUR_N1,
                  aire: i === p.annees.length - 1,
                  points: a.mois.map((x) => ({ x: x.x, y: x.nuitees })),
                }))}
                ticksX={Array.from({ length: 12 }, (_, i) => ({ x: i, libelle: MOIS_COURTS[(9 + i) % 12] }))}
                libellesX={p.annees[0].mois.map((x, i) => ({ x: i, libelle: x.mois.split(" ")[0] }))}
              />
              <TableauChiffres
                colonnes={["Mois", ...p.annees.map((a) => a.nom)]}
                lignes={Array.from({ length: 12 }, (_, i) => [MOIS_COURTS[(9 + i) % 12], ...p.annees.map((a) => a.mois[i].nuitees ?? "n.d.")])}
              />
            </div>
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Par saison" titre="Le bilan" />
              <ul className="divide-y divide-line">
                {[...h.saisons].reverse().map((x) => (
                  <li key={x.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">
                        {x.nom}
                        {!x.complete && <span className="ml-2 text-[0.62rem] font-semibold uppercase tracking-wide text-taupe">partielle</span>}
                      </span>
                      <span className="tabular-nums">{n(x.nuitees)} nuitées</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Occupation {pc(x.occupation)} · direct {pc(x.direct)} · délai médian {x.delai ? `${x.delai.med} j` : "n.d."} · avec enfants {pc(x.familles)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Pays */}
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Clientèle" titre="D'où viennent les clients">
                Part des nuitées par pays, sur deux ans. Survolez un pays pour sa part de vente directe et de familles.
              </EnTete>
              <BarresH
                unite="pourcent"
                items={h.pays.map((x) => ({
                  id: x.pays,
                  libelle: x.pays,
                  valeur: x.nuitees / Math.max(1, totalPays),
                  attenue: x.pays === "Autres pays",
                  note: `${n(x.nuitees)} nuitées · direct ${pc(x.direct)} · avec enfants ${pc(x.familles)}`,
                }))}
              />
              <TableauChiffres
                colonnes={["Pays", "Nuitées", "Part", "Direct", "Avec enfants", "Délai médian"]}
                lignes={h.pays.map((x) => [x.pays, x.nuitees, pc(x.nuitees / Math.max(1, totalPays)), pc(x.direct), pc(x.familles), x.delai ? `${x.delai.med} j` : "n.d."])}
              />
              {h.paysInconnu > 0.05 && <p className="mt-2 text-xs text-ink-soft">Pays non renseigné pour {pc(h.paysInconnu)} des nuitées, non compté ici.</p>}
            </div>
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Anticipation" titre="Combien de temps avant ils réservent">
                Pour chaque pays, la moitié centrale des séjours (du premier au troisième quartile) et la médiane. C&apos;est ce délai qui fixe la date d&apos;un envoi.
              </EnTete>
              {paysAvecDelai.length ? (
                <Delais lignes={paysAvecDelai.map((x) => ({ id: x.pays, libelle: x.pays, q1: x.delai!.q1, med: x.delai!.med, q3: x.delai!.q3, n: x.delai!.n }))} />
              ) : (
                <p className="text-sm text-ink-soft">Trop peu de séjours par pays pour mesurer un délai.</p>
              )}
              <TableauChiffres
                colonnes={["Pays", "1er quartile", "Médiane", "3e quartile", "Séjours"]}
                lignes={paysAvecDelai.map((x) => [x.pays, `${x.delai!.q1} j`, `${x.delai!.med} j`, `${x.delai!.q3} j`, x.delai!.n])}
              />
            </div>
          </section>

          {/* Calendrier d'achat */}
          <section className="mt-6 carte p-5 sm:p-7">
            <EnTete surtitre="Calendrier d'achat" titre="Quand se réserve chaque mois de séjour">
              Chaque ligne est un mois de séjour, chaque colonne le mois où la réservation a été prise. Plus la case est foncée, plus ce mois de réservation pèse :
              c&apos;est là qu&apos;une campagne doit être en ligne.
            </EnTete>
            <Chaleur matrice={h.calendrierAchat} lignes={ordreMois} />
          </section>

          {/* Canaux et rythme */}
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Distribution" titre="Par quel canal">
                Part des nuitées par canal, saison par saison. Direct et site web sont la vente directe.
              </EnTete>
              <Empile
                categories={CANAUX.map((c) => ({ id: c.id, nom: c.nom, couleur: c.couleur }))}
                lignes={h.saisons.filter((x) => x.nuitees > 50).map((x) => ({ id: x.id, libelle: x.nom, valeurs: x.canaux as Record<string, number> }))}
              />
              <TableauChiffres
                colonnes={["Saison", ...CANAUX.map((c) => c.nom)]}
                lignes={h.saisons.filter((x) => x.nuitees > 50).map((x) => [x.nom, ...CANAUX.map((c) => x.canaux[c.id] ?? 0)])}
              />
            </div>
            <div className="carte p-5 sm:p-7">
              <EnTete surtitre="Rythme" titre="Comment la saison se remplit">
                Part des nuitées déjà réservées, de un an avant la nuit jusqu&apos;au jour même.
              </EnTete>
              {saisonsRythme.length ? (
                <Courbes
                  ariaLabel={`Rythme de remplissage de ${m.nom}`}
                  yMax={1}
                  unite="pourcent"
                  series={saisonsRythme.map((x, i) => ({
                    id: x.id,
                    nom: x.nom,
                    couleur: i === saisonsRythme.length - 1 ? "var(--maison-accent)" : COULEUR_N1,
                    aire: i === saisonsRythme.length - 1,
                    points: [...x.rythme].reverse().map((r) => ({ x: -r.j, y: r.part })),
                  }))}
                  ticksX={[-364, -280, -182, -98, -56, -14, 0].map((j) => ({ x: j, libelle: j === 0 ? "nuit" : `J${j}` }))}
                  libellesX={(saisonsRythme.at(-1)?.rythme ?? []).map((r) => ({ x: -r.j, libelle: r.j === 0 ? "Le jour même" : `${r.j} jours avant la nuit` }))}
                />
              ) : (
                <p className="text-sm text-ink-soft">Pas encore de saison complète.</p>
              )}
            </div>
          </section>

          <section className="mt-12 border-t border-line pt-10">
            {m.id === pilote ? (
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="max-w-2xl">
                  <p className="eyebrow text-[0.64rem] text-taupe">L&apos;agent sur cette maison</p>
                  <h2 className="titre-maison mt-1 text-[1.9rem] leading-tight">Ces délais fixent déjà les dates de l&apos;hiver 2026-2027</h2>
                  <p className="mt-2 text-ink-soft">
                    Chaque fenêtre d&apos;achat de l&apos;agent est maintenant calculée sur les délais réels de la même période les deux hivers précédents, pays par pays.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/calendrier" className="bouton-clair">Le calendrier</Link>
                  <Link href="/" className="bouton">Les actions <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl">
                <p className="eyebrow text-[0.64rem] text-taupe">L&apos;agent sur cette maison</p>
                <h2 className="titre-maison mt-1 text-[1.9rem] leading-tight">Le portrait est prêt, l&apos;agent peut suivre</h2>
                <p className="mt-2 text-ink-soft">
                  Pour que l&apos;agent propose des actions datées à {m.nom}, il lui faut ses sujets de saison, son point météo et son agenda local. Les délais et le
                  rythme ci-dessus sont déjà mesurés.
                </p>
              </div>
            )}
            <Source>
              {historique!.origine}, relevé du {formatDate(historique!.collecte_le, true)}.
            </Source>
          </section>
        </div>
      )}
    </div>
  );
}
