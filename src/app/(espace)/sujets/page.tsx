import { ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { EnTetePage, Niveau, Puce } from "@/components/ui";
import { formatDate, formatRange, relatif } from "@/lib/dates";
import { interetLibelle, urgenceLibelle, visibiliteLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

export const metadata = { title: "Sujets" };

const familles: Record<string, string> = { saisonnier: "Saisonnier", evenementiel: "Événementiel", declencheur: "Déclencheur", b2b: "Séminaires et B2B" };

export default async function Sujets(props: PageProps<"/sujets">) {
  await connection();
  const { fermes } = await props.searchParams;
  const { sujets: tous, interet, ctx } = etatSaison();
  const nbFermes = tous.filter((s) => !s.ouvert).length;
  const sujets = fermes ? tous : tous.filter((s) => s.ouvert);

  return (
    <>
      <EnTetePage
        fil={[{ label: "Stratégie" }]}
        titre="Sujets de la saison"
        meta={`${sujets.length} sujets, classés par urgence puis intérêt · données au ${formatDate(ctx.date, true)}`}
        actions={
          nbFermes > 0 ? (
            <Link href={fermes ? "/sujets" : "/sujets?fermes=1"} className="bouton-clair">
              {fermes ? "Masquer" : "Afficher"} les {nbFermes} sujets hors ouverture
            </Link>
          ) : null
        }
      >
        Un sujet très intéressant mais lointain passe après un sujet moyen qu&apos;il faut lancer cette semaine.
      </EnTetePage>

      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="panneau overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_130px_170px_20px] gap-4 border-b border-line bg-cream/50 px-4 py-2 text-xs font-medium text-taupe lg:grid">
            <span>Sujet</span>
            <span>Urgence</span>
            <span>Intérêt</span>
            <span>Reste sur Google</span>
            <span>Première action</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {sujets.map((s, i) => {
              const nb = s.activations.reduce((t, a) => t + a.vagues.length, 0);
              const etat = !s.ouvert ? <Puce>Maison fermée</Puce> : s.remplissage === "plein" ? <Puce>Déjà bien vendu</Puce> : s.remplissage === "bas" ? <Puce ton="brique">Remplissage bas</Puce> : i === 0 ? <Puce ton="nuit">En premier</Puce> : null;
              return (
                <li key={s.def.id} className={s.ouvert ? "" : "opacity-60"}>
                  <Link
                    href={`/sujets/${s.def.id}`}
                    className="group grid grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-cream/60 lg:grid-cols-[48px_minmax(0,1fr)_110px_110px_130px_170px_20px]"
                  >
                    <span className="relative h-12 w-12 overflow-hidden rounded-lg border border-line">
                      <Image src={s.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover" sizes="48px" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink group-hover:text-nav">{s.def.nom}</span>
                        {etat}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-taupe">
                        {familles[s.def.famille]}
                        {s.def.sejour ? ` · séjour du ${formatRange(s.def.sejour.debut, s.def.sejour.fin)}` : ""}
                        {nb ? ` · ${nb} action${nb > 1 ? "s" : ""}` : ""}
                      </span>
                    </span>
                    <span className="hidden lg:block">
                      <Niveau libelle={urgenceLibelle(s.urgence)} compact />
                    </span>
                    <span className="hidden lg:block">
                      <Niveau libelle={interetLibelle(interet(s))} compact />
                    </span>
                    <span className="hidden lg:block">
                      <Niveau libelle={visibiliteLibelle(s.ecart)} compact />
                    </span>
                    <span className="hidden text-[0.8125rem] lg:block">
                      {s.premiereAction ? (s.premiereAction <= ctx.date ? <span className="font-medium text-ink">Maintenant</span> : <span className="text-ink-soft">{relatif(s.premiereAction, ctx.date)}</span>) : <span className="text-taupe">Aucune</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 text-greige transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-3 text-xs text-taupe">Les sujets se révisent chaque saison dans le fichier de référence. Plus de points veut toujours dire plus prioritaire.</p>
      </div>
    </>
  );
}
