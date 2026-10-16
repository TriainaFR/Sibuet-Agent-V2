import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Bandeau, Niveau, Puce } from "@/components/ui";
import { formatDate, formatRange, relatif } from "@/lib/dates";
import { interetLibelle, urgenceLibelle, visibiliteLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

const familles: Record<string, string> = { saisonnier: "Saisonnier", evenementiel: "Événementiel", declencheur: "Déclencheur", b2b: "Séminaires et B2B" };

export default async function Sujets() {
  await connection();
  const { sujets, interet, ctx } = etatSaison();
  const [premier, ...autres] = sujets;
  return (
    <>
      <Bandeau eyebrow={`Lodge Park, ${ctx.saison.nom.toLowerCase()}${ctx.saison.rejeu ? `, rejoué au ${formatDate(ctx.date, true)}` : ""}`} titre="Les sujets de la saison" sousTitre={`${sujets.length} sujets, classés par urgence puis intérêt`} filigrane="Sujets">
        <p>Un sujet très intéressant mais lointain passe après un sujet moyen qu&apos;il faut lancer cette semaine.</p>
      </Bandeau>

      <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6">
        {premier && (
          <Link href={`/sujets/${premier.def.id}`} className="group grid overflow-hidden border border-line bg-white md:grid-cols-[1.3fr_1fr]">
            <div className="relative min-h-[300px] overflow-hidden">
              <Image src={premier.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover transition duration-700 group-hover:scale-[1.03]" sizes="(min-width: 768px) 60vw, 100vw" priority />
              <span className="absolute left-4 top-4">
                <Puce ton="nuit">À travailler en premier</Puce>
              </span>
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10">
              <p className="eyebrow text-taupe">{familles[premier.def.famille]}</p>
              <h2 className="titre-capitales mt-3 text-3xl leading-tight sm:text-[2.2rem]">{premier.def.nom}</h2>
              <p className="mt-1 text-sm text-ink-soft">{premier.def.sejour && `Séjour du ${formatRange(premier.def.sejour.debut, premier.def.sejour.fin)}`}</p>
              <p className="mt-4 leading-relaxed text-ink-soft">{premier.def.theme}</p>
              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-xs">
                <Indicateurs s={premier} interet={interetLibelle(interet(premier))} />
              </dl>
              <span className="lien-charme mt-6 text-ink">Ouvrir la fiche</span>
            </div>
          </Link>
        )}

        <div className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {autres.map((s, i) => {
            const nb = s.activations.reduce((t, a) => t + a.vagues.length, 0);
            return (
              <Link key={s.def.id} href={`/sujets/${s.def.id}`} className={`apparition group flex flex-col ${s.ouvert ? "" : "opacity-60"}`} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={s.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover transition duration-700 group-hover:scale-[1.04]" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
                  <div className="absolute left-3 top-3 flex gap-2">
                    {!s.ouvert ? <Puce>Maison fermée</Puce> : s.remplissage === "plein" ? <Puce>Déjà bien vendu</Puce> : s.remplissage === "bas" ? <Puce ton="brique">Remplissage bas</Puce> : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col border-x border-b border-line bg-white p-6">
                  <p className="eyebrow text-[0.62rem] text-taupe">
                    {familles[s.def.famille]}
                    {s.def.sejour ? ` · ${formatRange(s.def.sejour.debut, s.def.sejour.fin)}` : ""}
                  </p>
                  <h2 className="titre-capitales mt-2 text-[1.45rem] leading-snug group-hover:text-cognac">{s.def.nom}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{s.def.theme}</p>
                  <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs">
                    <Indicateurs s={s} interet={interetLibelle(interet(s))} />
                  </dl>
                  <div className="mt-auto flex items-center justify-between pt-5 text-sm text-ink-soft">
                    <span>
                      {s.premiereAction ? (s.premiereAction <= ctx.date ? "Première action : maintenant" : `Première action ${relatif(s.premiereAction, ctx.date)}`) : "Aucune action à cette date"}
                      {nb ? ` · ${nb} action${nb > 1 ? "s" : ""}` : ""}
                    </span>
                    <span className="lien-charme text-ink" aria-hidden>
                      {""}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="mt-10 text-center text-xs text-ink-soft">Données au {formatDate(ctx.date, true)}. Les sujets se révisent chaque saison dans le fichier de référence.</p>
      </div>
    </>
  );
}

function Indicateurs({ s, interet }: { s: { urgence: number; ecart: number | null }; interet: string }) {
  return (
    <>
      <div>
        <dt className="eyebrow text-[0.58rem] text-taupe">Urgence</dt>
        <dd className="mt-1.5">
          <Niveau libelle={urgenceLibelle(s.urgence)} compact />
        </dd>
      </div>
      <div>
        <dt className="eyebrow text-[0.58rem] text-taupe">Intérêt</dt>
        <dd className="mt-1.5">
          <Niveau libelle={interet} compact />
        </dd>
      </div>
      <div>
        <dt className="eyebrow text-[0.58rem] text-taupe">Sur Google</dt>
        <dd className="mt-1.5">
          <Niveau libelle={visibiliteLibelle(s.ecart)} compact />
        </dd>
      </div>
    </>
  );
}
