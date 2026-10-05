import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Niveau, Puce } from "@/components/ui";
import { formatDate, formatRange } from "@/lib/dates";
import { interetLibelle, urgenceLibelle, visibiliteLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

const familles: Record<string, string> = { saisonnier: "Saisonnier", evenementiel: "Événementiel", declencheur: "Déclencheur", b2b: "B2B" };

export default async function Sujets() {
  await connection();
  const { sujets, interet, ctx } = etatSaison();
  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <p className="eyebrow text-taupe">Lodge Park, hiver 2026-2027</p>
      <h1 className="mt-2 font-display text-4xl">Les sujets</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Classés par urgence puis par intérêt. Un sujet très intéressant mais lointain passe après un sujet moyen qu&apos;il faut lancer cette semaine.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sujets.map((s) => {
          const nbActions = s.activations.reduce((t, a) => t + a.vagues.length, 0);
          return (
            <Link key={s.def.id} href={`/sujets/${s.def.id}`} className={`carte group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-greige hover:shadow-sm ${s.ouvert ? "" : "opacity-60"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow text-[0.6rem] text-taupe">{familles[s.def.famille]}</span>
                {!s.ouvert ? <Puce>Maison fermée</Puce> : s.remplissage === "plein" ? <Puce>Déjà bien vendu</Puce> : s.remplissage === "bas" ? <Puce ton="brique">Remplissage bas</Puce> : null}
              </div>
              <h2 className="mt-2 font-display text-[1.45rem] leading-snug group-hover:text-brown">{s.def.nom}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {s.def.sejour ? `Séjour du ${formatRange(s.def.sejour.debut, s.def.sejour.fin)}` : s.def.fenetre_fixe ? `Fenêtre de décision du ${formatRange(s.def.fenetre_fixe.debut, s.def.fenetre_fixe.fin)}` : ""}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{s.def.theme}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-xs">
                <div>
                  <dt className="text-taupe">Urgence</dt>
                  <dd className="mt-1">
                    <Niveau libelle={urgenceLibelle(s.urgence)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-taupe">Intérêt</dt>
                  <dd className="mt-1">
                    <Niveau libelle={interetLibelle(interet(s))} />
                  </dd>
                </div>
                <div>
                  <dt className="text-taupe">Sur Google</dt>
                  <dd className="mt-1">
                    <Niveau libelle={visibiliteLibelle(s.ecart)} />
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                <span className="text-ink-soft">
                  {s.premiereAction ? (s.premiereAction <= ctx.date ? "Première action : maintenant" : `Première action le ${formatDate(s.premiereAction)}`) : "Aucune action proposée"}
                  {nbActions ? ` · ${nbActions} action${nbActions > 1 ? "s" : ""}` : ""}
                </span>
                <ArrowRight className="h-4 w-4 text-taupe transition group-hover:translate-x-0.5 group-hover:text-brown" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
