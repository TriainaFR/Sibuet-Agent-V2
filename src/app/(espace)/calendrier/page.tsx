import Image from "next/image";
import { Bandeau } from "@/components/ui";
import Link from "next/link";
import { connection } from "next/server";
import { addDays, diffDays, formatDate, lundi, maxDate, minDate } from "@/lib/dates";
import { urgenceLibelle } from "@/lib/format";
import { etatSaison } from "@/services/etat";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function Grille({ children, h = "h-9", mois, vacances, x, w, date }: { children: React.ReactNode; h?: string; mois: string[]; vacances: { nom: string; debut: string; fin: string }[]; x: (d: string) => number; w: (a: string, b: string) => number; date: string }) {
  return (
    <div className={`relative ${h}`}>
      {mois.map((m) => (
        <span key={m} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${x(m)}%` }} />
      ))}
      {vacances.map((v) => (
        <span key={v.nom} className="absolute inset-y-0 bg-sky/[0.07]" style={{ left: `${x(v.debut)}%`, width: `${w(v.debut, v.fin)}%` }} />
      ))}
      <span className="absolute inset-y-0 z-10 w-0.5 bg-brick/70" style={{ left: `${x(date)}%` }} />
      {children}
    </div>
  );
}

export default async function Calendrier(props: PageProps<"/calendrier">) {
  await connection();
  const { fermes } = await props.searchParams;
  const { sujets: tous, ctx } = etatSaison();
  const nbFermes = tous.filter((s) => !s.ouvert).length;
  const sujets = fermes ? tous : tous.filter((s) => s.ouvert);
  const debut = `${ctx.date.slice(0, 7)}-01`;
  const fin = addDays(ctx.saison.fin, 1);
  const span = diffDays(fin, debut);
  const x = (d: string) => (Math.max(0, Math.min(span, diffDays(d, debut))) / span) * 100;
  const w = (a: string, b: string) => Math.max(0.5, x(minDate(b, fin)) - x(maxDate(a, debut)));
  const mois: string[] = [];
  for (let d = debut; d < fin; d = `${addDays(d, 32).slice(0, 7)}-01`) mois.push(d);

  // Vacances scolaires françaises (union des trois zones) et densité d'événements par semaine
  const fr = ctx.vacances.filter((v) => v.id.startsWith("fr")).flatMap((v) => v.periodes);
  const vacFr = [...new Map(fr.map((p) => [p.nom, { nom: p.nom, debut: minDate(...fr.filter((q) => q.nom === p.nom).map((q) => q.debut)), fin: maxDate(...fr.filter((q) => q.nom === p.nom).map((q) => q.fin)) }])).values()];
  const parSemaine = new Map<string, number>();
  for (const e of ctx.agenda?.donnees.evenements ?? []) {
    if (e.type === "décor" || e.debut < debut || e.debut > fin) continue;
    const s = lundi(e.debut);
    parSemaine.set(s, (parSemaine.get(s) ?? 0) + 1);
  }
  const maxEv = Math.max(1, ...parSemaine.values());
  const envois = ctx.envois?.donnees.envois ?? [];
  const piste = { mois, vacances: vacFr, x, w, date: ctx.date };


  return (
    <>
      <Bandeau eyebrow={`Lodge Park, ${ctx.saison.nom.toLowerCase()}${ctx.saison.rejeu ? ", rejoué" : ""}`} titre="Le calendrier de la saison" sousTitre="Quand ils réservent, quand ils séjournent" filigrane="Calendrier" photo="/lodge/megeve-village.jpg" photo2="/lodge/lp-7.jpg">
        <p>
          Pour chaque sujet : en pointillés, le moment où les clients réservent ; en plein, le moment où ils séjournent. Les losanges sont les newsletters déjà
        prévues. Cliquez un sujet pour ouvrir sa fiche.
        </p>
      </Bandeau>
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6">
      {nbFermes > 0 && (
        <p className="text-right text-sm text-ink-soft">
          <Link href={fermes ? "/calendrier" : "/calendrier?fermes=1"} className="underline-offset-4 hover:text-ink hover:underline">
            {fermes ? "Masquer" : "Afficher"} {nbFermes} sujet{nbFermes > 1 ? "s" : ""} hors période d&apos;ouverture
          </Link>
        </p>
      )}
      <div className="carte mt-4 overflow-x-auto p-5">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[260px_1fr] gap-4">
            <div />
            <div className="relative h-6 text-xs text-taupe">
              {mois.map((m) => (
                <span key={m} className="absolute pl-1.5" style={{ left: `${x(m)}%` }}>
                  {MOIS[Number(m.slice(5, 7)) - 1]}
                </span>
              ))}
              <span className="absolute -translate-x-1/2 text-[0.68rem] font-semibold text-brick" style={{ left: `${x(ctx.date)}%`, top: 14 }}>
                aujourd&apos;hui
              </span>
            </div>
          </div>
          <div className="mt-2 divide-y divide-line/60">
            {sujets.map((s) => (
              <div key={s.def.id} className={`grid grid-cols-[260px_1fr] items-center gap-4 py-1.5 ${s.ouvert ? "" : "opacity-45"}`}>
                <Link href={`/sujets/${s.def.id}`} className="group flex min-w-0 items-center gap-3">
                  <span className="relative h-10 w-12 shrink-0 overflow-hidden">
                    <Image src={s.def.image ?? "/hotels/lodge-park.jpg"} alt="" fill className="object-cover" sizes="48px" />
                  </span>
                  <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold group-hover:text-cognac">{s.def.nom}</span>
                  <span className="text-xs text-ink-soft">{!s.ouvert ? "Maison fermée" : s.urgence >= 0.85 ? "À travailler maintenant" : s.urgence >= 0.6 ? "À préparer" : "Plus tard"}</span>
                  </span>
                </Link>
                <Grille {...piste}>
                  {s.fenetre && s.ouvert && (
                    <span
                      className="fenetre-achat absolute top-2.5 h-4 text-cognac"
                      style={{ left: `${x(s.fenetre.debut)}%`, width: `${w(s.fenetre.debut, s.fenetre.fin)}%` }}
                      title={`Les clients réservent du ${formatDate(s.fenetre.debut)} au ${formatDate(s.fenetre.fin)} · urgence ${urgenceLibelle(s.urgence).toLowerCase()}`}
                    />
                  )}
                  {s.def.sejour && (
                    <span
                      className={`absolute top-3 h-3 rounded-full ${s.def.famille === "declencheur" ? "bg-sky/40" : "bg-nuit/80"}`}
                      style={{ left: `${x(s.def.sejour.debut)}%`, width: `${w(s.def.sejour.debut, s.def.sejour.fin)}%` }}
                      title={`Séjour du ${formatDate(s.def.sejour.debut)} au ${formatDate(s.def.sejour.fin)}`}
                    />
                  )}
                </Grille>
              </div>
            ))}
            <div className="grid grid-cols-[260px_1fr] items-center gap-4 py-1.5">
              <span className="text-sm font-semibold">Newsletters déjà prévues</span>
              <Grille {...piste}>
                {envois.map((e, i) => (
                  <span
                    key={i}
                    className={`absolute top-3 z-20 h-3 w-3 -translate-x-1/2 rotate-45 ${e.cible === "agences" ? "border-2 border-sky bg-white" : "bg-ochre"}`}
                    style={{ left: `${x(e.date)}%` }}
                    title={`${formatDate(e.date)} : ${e.theme} (${e.cible}, ${e.maison})`}
                  />
                ))}
              </Grille>
            </div>
            <div className="grid grid-cols-[260px_1fr] items-center gap-4 py-1.5">
              <span>
                <span className="block text-sm font-semibold">Événements de la station</span>
                <span className="text-xs text-ink-soft">nombre par semaine, hors décors</span>
              </span>
              <Grille h="h-12" {...piste}>
                {[...parSemaine.entries()].map(([s, n]) => (
                  <span
                    key={s}
                    className="absolute bottom-0 rounded-t bg-taupe/50"
                    style={{ left: `${x(s)}%`, width: `${w(s, addDays(s, 5))}%`, height: `${(n / maxEv) * 100}%` }}
                    title={`Semaine du ${formatDate(s)} : ${n} événement${n > 1 ? "s" : ""}`}
                  />
                ))}
              </Grille>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <span className="fenetre-achat h-3 w-8 text-cognac" /> Les clients réservent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-8 rounded-full bg-nuit/80" /> Les clients séjournent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rotate-45 bg-ochre" /> Envoi clients
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rotate-45 border-2 border-sky bg-white" /> Envoi agences
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-8 bg-sky/15" /> Vacances scolaires françaises
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-0.5 bg-brick" /> Aujourd&apos;hui
            </span>
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="carte p-5">
          <h2 className="text-base font-semibold">Plan d&apos;envois du client</h2>
          <p className="text-xs text-ink-soft">{ctx.envois?.donnees.statut}</p>
          <ul className="mt-3 divide-y divide-line/60 text-sm">
            {envois.map((e, i) => (
              <li key={i} className="flex items-baseline gap-3 py-2">
                <span className="w-16 shrink-0 font-semibold">{formatDate(e.date)}</span>
                <span className="flex-1">{e.theme}</span>
                <span className="text-xs text-ink-soft">
                  {e.cible}, {e.maison}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="carte p-5">
          <h2 className="text-base font-semibold">Vacances scolaires par marché</h2>
          <p className="text-xs text-ink-soft">Sites officiels de chaque pays. Recoupées avec OpenHolidays : les écarts sont signalés.</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {ctx.vacances.map((v) => (
              <li key={v.id}>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: ctx.marches.find((m) => m.id === v.id)?.couleur }} />
                  {v.nom}
                </span>
                {!v.verifie && <span className="ml-2 rounded bg-ochre/15 px-1.5 text-[0.65rem] font-semibold uppercase text-[#8a6a32]">à vérifier</span>}
                <span className="block text-ink-soft">{v.periodes.map((p) => `${p.nom} du ${formatDate(p.debut)} au ${formatDate(p.fin)}`).join(" · ")}</span>
                {v.ecart_controle && <span className="mt-0.5 block text-xs text-brick">{v.ecart_controle}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
    </>
  );
}
