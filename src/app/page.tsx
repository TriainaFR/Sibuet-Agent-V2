import { CalendarPlus, CloudSnow, Lock, Mail, Snowflake, Sparkles, TrendingDown, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ListeActions } from "@/components/liste-actions";
import { Bandeau, Niveau } from "@/components/ui";
import { formatDate, jourSemaine, relatif } from "@/lib/dates";
import { urgenceLibelle } from "@/lib/format";
import type { Alerte } from "@/lib/types";
import { etatSaison } from "@/services/etat";

const iconeAlerte: Record<Alerte["type"], typeof Sparkles> = {
  evenement: CalendarPlus,
  fenetre: Sparkles,
  vide: TrendingDown,
  neige: Snowflake,
  plan: Mail,
  rang: Trophy,
};

export default async function AFaire() {
  await connection();
  const { ctx, sujets, actions, kpis, dernierCalcul, decisions, horizon } = etatSaison();
  const prev = ctx.prevision;
  const alertes = dernierCalcul?.alertes ?? [];
  const images = Object.fromEntries(sujets.map((s) => [s.def.id, s.def.image ?? ""]));
  const tete = kpis.tete;
  const saisie = ctx.saisie;
  const manquants = [
    { ok: Boolean(saisie.ouverture && saisie.fermeture), label: "Dates d'ouverture et de fermeture" },
    { ok: Object.values(saisie.delais).some((v) => Number(v) > 0) || Boolean(ctx.asterio), label: "Délais de réservation par pays" },
    { ok: Object.values(saisie.rempl).some((v) => v !== "inconnu") || Boolean(ctx.asterio), label: "Remplissage par sujet" },
    { ok: Number(saisie.commission) > 0 && Number(saisie.panier) > 0, label: "Commission et panier moyen" },
    { ok: saisie.acces_google_ads && saisie.acces_meta, label: "Accès Google Ads et Meta" },
  ];
  const faits = manquants.filter((m) => m.ok).length;

  return (
    <>
      <Bandeau
        eyebrow={`${jourSemaine(ctx.date)} ${formatDate(ctx.date, true)}`}
        titre="Votre semaine au Lodge Park"
        sousTitre="À faire dans les six semaines"
        photo="/lodge/lp-4.jpg"
        photo2="/lodge/bar-1.jpg"
      >
        <p>
          {kpis.aLancer} action{kpis.aLancer > 1 ? "s" : ""} à lancer d&apos;ici le {formatDate(horizon, true)}, chacune datée au moment où les clients réservent,
          pas au moment où ils séjournent.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#actions" className="bouton">
            Voir les actions
          </a>
          <Link href="/donnees" className="inline-flex items-center border border-white px-5 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-ink">
            Compléter vos données
          </Link>
        </div>
      </Bandeau>

      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        {/* Chiffres clés */}
        <section className="relative z-10 -mt-8 grid grid-cols-2 border border-line bg-white shadow-sm lg:grid-cols-4">
          {[
            { icone: Sparkles, label: "À lancer", valeur: kpis.aLancer, texte: `avant le ${formatDate(horizon)}`, ton: "" },
            { icone: Lock, label: "En attente d'un accès", valeur: kpis.enAttente, texte: kpis.enAttente ? `${kpis.enAttenteDetail}` : "aucune", ton: "text-cognac" },
            { icone: Mail, label: "Envois déjà prévus", valeur: kpis.conserves, texte: kpis.conservesDates.length ? `conservés : ${kpis.conservesDates.map((d) => formatDate(d)).join(", ")}` : "aucun dans la période", ton: "" },
            { icone: CloudSnow, label: "Neige annoncée", valeur: prev ? `${prev.donnees.neige_16j}` : "n.d.", texte: "cm sur 16 jours à Megève", ton: "" },
          ].map(({ icone: I, label, valeur, texte, ton }, i) => (
            <div key={label} className={`p-5 sm:p-6 ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
              <p className="eyebrow flex items-center gap-2 text-[0.62rem] text-taupe">
                <I className="h-3.5 w-3.5" strokeWidth={1.6} /> {label}
              </p>
              <p className={`mt-2 font-display text-5xl leading-none ${ton}`}>{valeur}</p>
              <p className="mt-2 text-sm text-ink-soft">{texte}</p>
            </div>
          ))}
        </section>

        {/* La priorité du moment */}
        {tete && (
          <section className="mt-14 grid overflow-hidden border border-line bg-white md:grid-cols-[1fr_1.15fr]">
            <div className="relative min-h-[260px]">
              <Image src={tete.sujet.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <p className="eyebrow text-cognac">La priorité du moment</p>
              <h2 className="mt-3 font-display text-4xl leading-tight">{tete.sujet.def.nom}</h2>
              <p className="eyebrow mt-2 text-taupe">
                {tete.ligne ? `${tete.ligne.libelle} · ` : ""}urgence {urgenceLibelle(tete.sujet.urgence).toLowerCase()}
              </p>
              <p className="mt-4 leading-relaxed text-ink-soft">{tete.sujet.pourquoi}</p>
              <div className="mt-6">
                <Link href={`/sujets/${tete.sujet.def.id}`} className="bouton">
                  Ouvrir la fiche
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_340px]" id="actions">
          {/* Les actions */}
          <section className="min-w-0">
            <p className="eyebrow text-taupe">Jusqu&apos;au {formatDate(horizon, true)}</p>
            <h2 className="mt-1 font-display text-4xl">Les actions, semaine par semaine</h2>
            <p className="mt-2 text-sm text-ink-soft">Cliquez une action pour ouvrir sa fiche, la valider et obtenir son brief.</p>
            <div className="mt-6">
              <ListeActions actions={actions} images={images} marches={ctx.marches} decisions={decisions} date={ctx.date} />
            </div>
          </section>

          <aside className="space-y-6">
            <section className="carte p-6">
              <p className="eyebrow text-taupe">Depuis la semaine dernière</p>
              <h2 className="mt-1 font-display text-2xl">Ce qui a changé</h2>
              <ol className="relative mt-5 space-y-5 border-l border-line pl-5">
                {alertes.length === 0 && <li className="text-sm text-ink-soft">Rien de nouveau cette semaine.</li>}
                {alertes.slice(0, 7).map((a, i) => {
                  const I = iconeAlerte[a.type];
                  return (
                    <li key={i} className="relative text-sm">
                      <span className={`absolute -left-[31px] top-0 inline-flex h-5 w-5 items-center justify-center rounded-full ${a.gravite === "action" ? "bg-cognac text-white" : "border border-line bg-white text-taupe"}`}>
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

            <section className="carte overflow-hidden">
              <div className="relative h-28">
                <Image src="/lodge/megeve-village.jpg" alt="" fill className="object-cover" sizes="340px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <p className="absolute bottom-3 left-5 font-display text-2xl text-white">Neige à Megève</p>
              </div>
              <div className="p-6">
                {prev ? (
                  <>
                    <div className="flex h-14 items-end gap-[3px]">
                      {prev.donnees.jours.map((j) => (
                        <div key={j.date} className="flex-1 bg-sky/50" style={{ height: `${Math.max(4, Math.min(100, j.neige_cm * 6))}%` }} title={`${formatDate(j.date)} : ${j.neige_cm} cm`} />
                      ))}
                    </div>
                    <p className="mt-3 text-sm">
                      <strong>{prev.donnees.neige_5j} cm</strong> sur 5 jours, <strong>{prev.donnees.neige_16j} cm</strong> sur 16 jours.
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Prévision Open-Meteo, {relatif(prev.collecte_le, ctx.date)}. Le déclencheur s&apos;active à 20 cm sur 5 jours, pendant la saison.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-ink-soft">Prévision non chargée.</p>
                )}
              </div>
            </section>

            <section className="carte p-6">
              <p className="eyebrow text-taupe">Pour des propositions plus justes</p>
              <h2 className="mt-1 font-display text-2xl">Ce que vous savez et pas nous</h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 bg-sand">
                  <div className="h-full bg-cognac transition-all" style={{ width: `${(faits / manquants.length) * 100}%` }} />
                </div>
                <span className="text-xs text-ink-soft">
                  {faits} sur {manquants.length}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {manquants.map((m) => (
                  <li key={m.label} className={`flex items-center gap-2 ${m.ok ? "text-ink-soft line-through" : ""}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${m.ok ? "bg-sage" : "bg-cognac"}`} />
                    {m.label}
                  </li>
                ))}
              </ul>
              <Link href="/donnees" className="lien-charme mt-5 text-ink">
                Compléter
              </Link>
            </section>

            <section className="carte p-6">
              <p className="eyebrow text-taupe">Les sujets les plus urgents</p>
              <ul className="mt-3 divide-y divide-line">
                {[...sujets]
                  .filter((s) => s.ouvert)
                  .sort((a, b) => b.ordre - a.ordre)
                  .slice(0, 4)
                  .map((s) => (
                    <li key={s.def.id}>
                      <Link href={`/sujets/${s.def.id}`} className="group flex items-center gap-3 py-3">
                        <span className="relative h-11 w-14 shrink-0 overflow-hidden">
                          <Image src={s.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover" sizes="56px" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold group-hover:text-cognac">{s.def.nom}</span>
                          <Niveau libelle={urgenceLibelle(s.urgence)} compact />
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
