import { AlertTriangle, ArrowRight, CalendarClock, CloudSnow, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Marches, Puce, PuceStatut, Vide } from "@/components/ui";
import { formatDate, jourSemaine } from "@/lib/dates";
import { canalCourt, urgenceLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

export default async function AFaire() {
  await connection();
  const { ctx, actions, kpis, dernierCalcul, decisions, horizon } = etatSaison();
  const prev = ctx.prevision;
  const alertes = dernierCalcul?.alertes ?? [];

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      <section>
        <p className="eyebrow text-taupe">Mis à jour le {formatDate(ctx.date, true)}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-[2.7rem]">À faire dans les six semaines</h1>
        <p className="mt-2 max-w-3xl text-ink-soft">
          Ce qu&apos;il faut lancer avant le {formatDate(horizon, true)}, dans l&apos;ordre. Une action est datée au moment où les clients réservent, pas au
          moment où ils séjournent.
        </p>
      </section>

      {/* Indicateurs */}
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="carte p-5">
          <p className="eyebrow flex items-center gap-2 text-taupe">
            <Sparkles className="h-3.5 w-3.5" /> À lancer
          </p>
          <p className="mt-2 font-display text-4xl">{kpis.aLancer}</p>
          <p className="text-sm text-ink-soft">actions avant le {formatDate(horizon)}</p>
        </div>
        <div className="carte p-5">
          <p className="eyebrow flex items-center gap-2 text-taupe">
            <Lock className="h-3.5 w-3.5" /> En attente d&apos;un accès
          </p>
          <p className="mt-2 font-display text-4xl text-brick">{kpis.enAttente}</p>
          <p className="text-sm text-ink-soft">{kpis.enAttente ? `${kpis.enAttenteDetail} : sans accès, elles n'ont pas lieu` : "Aucune"}</p>
        </div>
        <div className="carte p-5">
          <p className="eyebrow flex items-center gap-2 text-taupe">
            <Mail className="h-3.5 w-3.5" /> Envois déjà prévus, conservés
          </p>
          <p className="mt-2 font-display text-4xl">{kpis.conserves}</p>
          <p className="text-sm text-ink-soft">{kpis.conservesDates.map((d) => formatDate(d)).join(", ") || "Aucun dans la période"}</p>
        </div>
        <div className="carte border-brown/30 bg-brown p-5 text-white">
          <p className="eyebrow flex items-center gap-2 text-white/70">
            <AlertTriangle className="h-3.5 w-3.5" /> La plus urgente
          </p>
          {kpis.tete ? (
            <>
              <p className="mt-2 font-display text-[1.7rem] leading-tight">{kpis.tete.ligne?.libelle ?? "Tous marchés"}</p>
              <p className="text-sm text-white/80">
                {kpis.tete.sujet.def.nom.toLowerCase()}, urgence {urgenceLibelle(kpis.tete.sujet.urgence).toLowerCase()}
              </p>
              <Link href={`/sujets/${kpis.tete.sujet.def.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white underline-offset-2 hover:underline">
                Ouvrir la fiche <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm">Rien d&apos;urgent.</p>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Liste des actions */}
        <section className="carte min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display text-2xl">Les actions, date par date</h2>
            <span className="text-xs text-ink-soft">{actions.length} lignes</span>
          </div>
          {actions.length === 0 ? (
            <div className="p-5">
              <Vide>Aucune action dans les six semaines.</Vide>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[0.65rem] uppercase tracking-wider text-taupe">
                    <th className="px-5 py-2.5 font-semibold">Quand</th>
                    <th className="px-3 py-2.5 font-semibold">Quoi</th>
                    <th className="px-3 py-2.5 font-semibold">Sujet</th>
                    <th className="px-3 py-2.5 font-semibold">Pour qui</th>
                    <th className="px-5 py-2.5 font-semibold">Où en est-on</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a, i) => {
                    const decision = decisions[a.activationCle];
                    const grise = ["suspendu", "ferme"].includes(a.statut.code);
                    return (
                      <tr key={i} className={`border-b border-line/70 last:border-0 hover:bg-cream/70 ${grise ? "opacity-55" : ""}`}>
                        <td className="whitespace-nowrap px-5 py-3 align-top">
                          <span className="font-semibold">{formatDate(a.date)}</span>
                          <span className="block text-xs text-ink-soft">{a.enRetard ? "dès maintenant" : jourSemaine(a.date)}</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="mr-1.5 rounded bg-sand px-1.5 py-0.5 text-[0.65rem] font-bold text-brown">{canalCourt[a.canal]}</span>
                          {a.quoi.replace(/^\S+\s/, "")}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Link href={`/sujets/${a.sujetId}?onglet=actions`} className="text-brown underline-offset-2 hover:underline">
                            {a.sujetNom}
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Marches ids={a.marches} marches={ctx.marches} max={3} />
                        </td>
                        <td className="px-5 py-3 align-top">
                          <div className="flex flex-col items-start gap-1">
                            <PuceStatut code={a.statut.code} libelle={a.statut.libelle} />
                            {decision?.etat === "validee" && <Puce ton="vert">Validée par {decision.par}</Puce>}
                            {decision?.etat === "rejetee" && <Puce ton="gris">Rejetée</Puce>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="carte p-5">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <CalendarClock className="h-4 w-4 text-taupe" /> Ce qui a changé
            </h2>
            <p className="text-xs text-ink-soft">
              {dernierCalcul ? `Calcul n° ${dernierCalcul.numero} du ${formatDate(dernierCalcul.date, true)}, comparé au précédent.` : "Aucune routine lancée."}
            </p>
            <ul className="mt-3 space-y-3">
              {alertes.length === 0 && <li className="text-sm text-ink-soft">Rien de nouveau cette semaine.</li>}
              {alertes.slice(0, 8).map((a, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.gravite === "action" ? "bg-brick" : "bg-greige"}`} />
                  <span>
                    {a.sujetId ? (
                      <Link href={`/sujets/${a.sujetId}`} className="font-semibold hover:underline">
                        {a.titre}
                      </Link>
                    ) : (
                      <span className="font-semibold">{a.titre}</span>
                    )}
                    <span className="block text-ink-soft">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="carte p-5">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <CloudSnow className="h-4 w-4 text-taupe" /> Neige à Megève
            </h2>
            {prev ? (
              <>
                <p className="text-xs text-ink-soft">Open-Meteo, prévision du {formatDate(prev.collecte_le, true)}</p>
                <div className="mt-3 flex h-16 items-end gap-[3px]">
                  {prev.donnees.jours.map((j) => (
                    <div key={j.date} className="flex-1 rounded-t bg-sky/60" style={{ height: `${Math.max(3, Math.min(100, j.neige_cm * 6))}%` }} title={`${formatDate(j.date)} : ${j.neige_cm} cm`} />
                  ))}
                </div>
                <p className="mt-2 text-sm">
                  <strong>{prev.donnees.neige_5j} cm</strong> sur 5 jours, <strong>{prev.donnees.neige_16j} cm</strong> sur 16 jours.
                  <span className="block text-ink-soft">Le déclencheur s&apos;active à 20 cm sur 5 jours, pendant la saison.</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">Prévision non chargée.</p>
            )}
          </section>

          <Link href="/donnees" className="carte block p-5 transition hover:border-greige">
            <p className="font-display text-xl">Ce que vous savez et que nous n&apos;avons pas</p>
            <p className="mt-1 text-sm text-ink-soft">
              Dates d&apos;ouverture, délais de réservation par pays, remplissage par sujet, commission et panier moyen. Chaque saisie recalcule la page.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brown">
              Vos données <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
