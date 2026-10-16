import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Chiffre, EnTete, Source } from "@/components/ds";
import { Bandeau, Vide } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { nomSaison, partDirecte, portrait } from "@/lib/engine/portrait";
import type { HistoriqueMaison } from "@/lib/types";
import { lireHistorique } from "@/services/contexte";
import { lireMaisons } from "@/services/reference";

export const metadata = { title: "Les maisons" };

const fmt = new Intl.NumberFormat("fr-FR");
const n = (x: number) => fmt.format(Math.round(x));
const pc = (x: number | null | undefined) => (x === null || x === undefined ? "n.d." : `${Math.round(x * 100)} %`);

/** Mini-courbe des nuitées mensuelles sur deux ans (tendance d'une carte, sans interaction). */
function Tendance({ h }: { h: HistoriqueMaison }) {
  const pts = h.mensuel;
  const max = Math.max(1, ...pts.map((p) => p.nuitees));
  const l = 220;
  const ht = 44;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${((i / Math.max(1, pts.length - 1)) * l).toFixed(1)},${(ht - 3 - (p.nuitees / max) * (ht - 6)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${l} ${ht}`} className="h-11 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d}L${l},${ht}L0,${ht}Z`} fill="var(--maison-accent)" opacity="0.08" />
      <path d={d} fill="none" stroke="var(--maison-accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default async function Maisons() {
  await connection();
  const historique = lireHistorique();
  const { maisons, pilote } = lireMaisons();
  const h = historique?.donnees;

  const total = h?.maisons.reduce((a, m) => a + m.nuitees, 0) ?? 0;
  const canaux = h?.maisons.reduce<Record<string, number>>((acc, m) => {
    for (const [k, v] of Object.entries(m.canaux)) acc[k] = (acc[k] ?? 0) + (v ?? 0);
    return acc;
  }, {});
  const pays = new Map<string, number>();
  for (const m of h?.maisons ?? []) for (const p of m.pays) if (p.pays !== "Autres pays") pays.set(p.pays, (pays.get(p.pays) ?? 0) + p.nuitees);
  const totalPays = (h?.maisons ?? []).reduce((a, m) => a + m.pays.reduce((b, p) => b + p.nuitees, 0), 0);
  const france = (pays.get("France") ?? 0) / Math.max(1, totalPays);
  const top = [...pays.entries()].filter(([p]) => p !== "France").sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div data-maison="groupe">
      <Bandeau
        eyebrow="Maisons & Hôtels Sibuet"
        titre="Les maisons"
        sousTitre="Deux ans de réservations, maison par maison"
        filigrane="Sibuet"
        photo="/hotels/toutes.jpg"
        photo2="/hotels/megeve.jpg"
      >
        <p>
          {h
            ? `Les exports Asterio couvrent les nuits du ${formatDate(h.nuits[0], true)} au ${formatDate(h.nuits[1], true)} pour les ${h.maisons.length} maisons. Voici ce qu'ils disent de chacune, avant même que l'agent ne travaille sur elle.`
            : "Dès que les exports Asterio sont chargés, chaque maison a son portrait : saisons, pays, délais, canaux."}
        </p>
      </Bandeau>

      <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6">
        {!h ? (
          <Vide>
            Aucun historique chargé. Déposez les exports Asterio dans <Link href="/sources" className="underline">Sources</Link>.
          </Vide>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-line pb-10 lg:grid-cols-4">
              <Chiffre grand libelle="Nuitées en deux ans" valeur={n(total)} note={`${h.maisons.length} maisons, toutes saisons`} />
              <Chiffre grand libelle="Vendues en direct" valeur={pc(canaux ? partDirecte(canaux) : 0)} note="téléphone, e-mail et site, part des nuitées" />
              <Chiffre grand libelle="Clientèle française" valeur={pc(france)} note="part des nuitées dont le pays est connu" />
              <Chiffre
                grand
                libelle="Premiers pays étrangers"
                valeur={<span className="text-[1.35rem] leading-tight">{top.map(([p]) => p).join(", ")}</span>}
                note={top.map(([p, v]) => `${p} ${pc(v / totalPays)}`).join(" · ")}
              />
            </section>

            <section className="mt-12">
              <EnTete surtitre="Portraits" titre="Chaque maison, sa clientèle">
                Pour chaque maison, la dernière saison complète comparée à la précédente sur les mêmes dates, et les traits de sa clientèle. Ouvrez une maison pour le détail.
              </EnTete>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {h.maisons.map((hm) => {
                  const m = maisons.find((x) => x.id === hm.id)!;
                  const p = portrait(hm);
                  const s = p.saison;
                  return (
                    <Link
                      key={hm.id}
                      href={`/maisons/${hm.id}`}
                      data-maison={hm.id}
                      className="group flex flex-col overflow-hidden border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(47,47,43,0.5)]"
                    >
                      <div className="relative h-44 overflow-hidden">
                        <Image src={m.image} alt="" fill sizes="(min-width: 1280px) 420px, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-maison" />
                        {hm.id === pilote && <span className="absolute left-3 top-3 bg-maison px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white">Agent actif</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-taupe">{m.lieu ?? m.destination}</p>
                        <h3 className="titre-maison mt-1 text-[1.6rem] leading-tight">{m.nom}</h3>
                        {s && (
                          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                            <div>
                              <p className="truncate text-[0.62rem] uppercase tracking-wide text-taupe" title={nomSaison(s)}>{nomSaison(s)}</p>
                              <p className="mt-1 text-lg font-semibold leading-none">{n(s.nuitees)}</p>
                              {p.evolution !== null && (
                                <p className={`mt-1 text-xs font-semibold ${p.evolution >= 0 ? "text-sage" : "text-brick"}`}>
                                  {p.evolution >= 0 ? "▲" : "▼"} {Math.abs(Math.round(p.evolution * 100))} %
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[0.62rem] uppercase tracking-wide text-taupe">Occupation</p>
                              <p className="mt-1 text-lg font-semibold leading-none">{pc(s.occupation)}</p>
                            </div>
                            <div>
                              <p className="text-[0.62rem] uppercase tracking-wide text-taupe">Direct</p>
                              <p className="mt-1 text-lg font-semibold leading-none">{pc(s.direct)}</p>
                            </div>
                          </div>
                        )}
                        <div className="mt-4">
                          <Tendance h={hm} />
                        </div>
                        <span className="lien-charme mt-auto pt-4 text-maison">Voir le portrait</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="mt-14">
              <EnTete surtitre="Comparer" titre="Les maisons côte à côte">
                Dernière saison complète de chaque maison. L&apos;évolution compare la même fenêtre de dates un an plus tôt ; l&apos;occupation rapporte les nuitées aux
                chambres publiées, sur les nuits où la maison était ouverte.
              </EnTete>
              <div className="carte overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[0.64rem] uppercase tracking-[0.12em] text-taupe">
                      <th className="px-5 py-3 font-semibold">Maison</th>
                      <th className="px-3 py-3 font-semibold">Saison</th>
                      <th className="px-3 py-3 text-right font-semibold">Nuitées</th>
                      <th className="px-3 py-3 text-right font-semibold">Évolution</th>
                      <th className="px-3 py-3 text-right font-semibold">Occupation</th>
                      <th className="px-3 py-3 text-right font-semibold">Direct</th>
                      <th className="px-3 py-3 text-right font-semibold">dont site</th>
                      <th className="px-3 py-3 text-right font-semibold">Délai médian</th>
                      <th className="px-5 py-3 text-right font-semibold">Avec enfants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.maisons.map((hm) => {
                      const m = maisons.find((x) => x.id === hm.id)!;
                      const p = portrait(hm);
                      const s = p.saison;
                      const tot = s ? Object.values(s.canaux).reduce((a, b) => a + (b ?? 0), 0) : 0;
                      return (
                        <tr key={hm.id} data-maison={hm.id} className="border-b border-line/70 last:border-0 hover:bg-maison-fond/60">
                          <td className="px-5 py-3">
                            <Link href={`/maisons/${hm.id}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
                              <span className="h-2.5 w-2.5 rounded-full bg-maison" />
                              {m.nom}
                            </Link>
                          </td>
                          <td className="px-3 py-3 text-ink-soft">{s ? nomSaison(s) : "n.d."}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{s ? n(s.nuitees) : "n.d."}</td>
                          <td className={`px-3 py-3 text-right tabular-nums font-semibold ${p.evolution === null ? "text-ink-soft" : p.evolution >= 0 ? "text-sage" : "text-brick"}`}>
                            {p.evolution === null ? "n.d." : `${p.evolution >= 0 ? "+" : "−"}${Math.abs(Math.round(p.evolution * 100))} %`}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{pc(s?.occupation)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{pc(s?.direct)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{s && tot ? pc((s.canaux.site ?? 0) / tot) : "n.d."}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{s?.delai ? `${s.delai.med} j` : "n.d."}</td>
                          <td className="px-5 py-3 text-right tabular-nums">{pc(s?.familles)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Source>
                {historique!.origine}, relevé du {formatDate(historique!.collecte_le, true)}. Chambres publiées sur les sites des maisons ; les chalets n&apos;ont pas de
                capacité fixe, leur occupation n&apos;est pas calculée.
              </Source>
            </section>

            <section className="mt-14 grid gap-5 lg:grid-cols-2">
              <div className="carte p-6">
                <p className="eyebrow text-[0.64rem] text-taupe">Pour aller plus loin</p>
                <h3 className="titre-maison mt-1 text-2xl">Le même export, jusqu&apos;à la fin de la saison</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  L&apos;export s&apos;arrête aux nuits du {formatDate(h.nuits[1], true)}. Le même extrait, avec les nuits jusqu&apos;à fin avril 2027, donne aussitôt les
                  réservations déjà prises pour l&apos;hiver qui vient : l&apos;agent les compare à l&apos;an dernier à la même date et sait quelles semaines remplir.
                </p>
              </div>
              <div className="carte p-6">
                <p className="eyebrow text-[0.64rem] text-taupe">Qualité des données</p>
                <h3 className="titre-maison mt-1 text-2xl">Ce qu&apos;il faut savoir</h3>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
                  <li>Aucun nom, aucun e-mail : l&apos;export ne contient que des dates, des pays, des canaux et des nombres de chambres.</li>
                  <li>
                    Pays non renseigné :{" "}
                    {h.maisons
                      .filter((m) => m.paysInconnu > 0.05)
                      .map((m) => `${maisons.find((x) => x.id === m.id)!.nom} ${pc(m.paysInconnu)}`)
                      .join(", ") || "rare"}
                    .
                  </li>
                  <li>Annulations écartées : seules les nuitées occupées comptent.</li>
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
