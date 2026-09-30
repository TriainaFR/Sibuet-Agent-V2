import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ActionTimeline } from "@/components/action-timeline";
import { DraftPanel } from "@/components/draft-panel";
import { Flags, LeverIcon, OriginBadge, PriorityBadge, StatusBadge, kindLabels } from "@/components/ui";
import { destinationById, hotelById } from "@/config/hotels";
import { levers, marketByCode } from "@/config/markets";
import { formatDate, formatRange, today } from "@/lib/dates";
import { getFiche } from "@/lib/engine/plan";

export default async function FichePage({ params }: PageProps<"/fiches/[id]">) {
  await connection();
  const { id } = await params;
  const fiche = getFiche(decodeURIComponent(id));
  if (!fiche) notFound();

  const hotel = hotelById[fiche.hotelId];
  const dest = destinationById[hotel.destination];
  const commsOnly = fiche.moment.timing === "communication";
  const now = today();

  return (
    <article>
      {/* En-tête */}
      <header className="relative isolate overflow-hidden bg-ink text-white">
        <Image src={hotel.image} alt={hotel.name} fill priority className="-z-10 object-cover opacity-55" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
        <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-6 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Calendrier
          </Link>
          <p className="eyebrow mt-16 text-white/75">
            {hotel.name} · {dest.name} · {kindLabels[fiche.moment.kind]}
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{fiche.moment.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <StatusBadge status={fiche.status} />
            <span className="rounded-full bg-white/95 px-0.5 py-0.5">
              <PriorityBadge level={fiche.priority.level} score={fiche.priority.score} />
            </span>
            <span className="text-sm text-white/85">
              {commsOnly ? "Opération" : "Séjours"} du {formatRange(fiche.eventStart, fiche.eventEnd)} ·{" "}
              {fiche.status === "urgent" ? <strong>à lancer dès maintenant</strong> : <>lancement le <strong>{formatDate(fiche.launchDate, true)}</strong></>}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          {/* Objectif et message */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-white p-5">
              <p className="eyebrow text-taupe">Objectif</p>
              <p className="mt-2 leading-relaxed">{fiche.moment.objective}</p>
            </div>
            <div className="rounded-md border border-line bg-white p-5">
              <p className="eyebrow text-taupe">Message</p>
              <p className="mt-2 font-display text-lg italic leading-snug text-brown">« {fiche.moment.angle} »</p>
            </div>
          </section>

          {/* Priorité */}
          <section className="rounded-md border border-line bg-white p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="eyebrow text-taupe">Pourquoi cette priorité</p>
              <span className="font-display text-2xl">
                {fiche.priority.score}
                <span className="text-sm text-taupe">/100</span>
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {fiche.priority.reasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-taupe">—</span>
                  {r}
                </li>
              ))}
            </ul>
          </section>

          {/* Frise */}
          <section>
            <h2 className="font-display text-2xl">Quand agir</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {commsOnly
                ? "Les actions s'enchaînent pendant l'opération."
                : "Chaque nationalité réserve à son rythme : les leviers sont calés sur la période où chaque marché prend sa décision."}
            </p>
            <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white p-5">
              <div className="min-w-[640px]">
                <ActionTimeline fiche={fiche} now={now} />
              </div>
            </div>
          </section>

          {/* Détail des leviers */}
          <section>
            <h2 className="font-display text-2xl">Plan d&apos;actions par levier</h2>
            <div className="mt-5 space-y-3">
              {fiche.actions.map((a, i) => (
                <div key={i} className="rounded-md border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sand text-brown">
                      <LeverIcon lever={a.lever} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow text-[0.6rem] text-taupe">{levers[a.lever].label}</p>
                      <h3 className="font-display text-xl leading-tight">{a.title}</h3>
                    </div>
                    <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold">
                      {a.endDate ? formatRange(a.date, a.endDate) : formatDate(a.date, true)}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5 pl-12 text-sm leading-relaxed text-ink-soft">
                    {a.details.map((d, j) => (
                      <li key={j} className={d.startsWith("⚠️") ? "font-semibold text-brick" : ""}>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <DraftPanel ficheId={fiche.id} />
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-md border border-line bg-white p-5">
            <p className="eyebrow text-taupe">Marchés ciblés</p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-[0.65rem] uppercase tracking-wider text-taupe">
                  <th className="pb-2 font-semibold">Marché</th>
                  <th className="pb-2 text-right font-semibold">Part</th>
                  {!commsOnly && <th className="pb-2 text-right font-semibold">Fenêtre</th>}
                </tr>
              </thead>
              <tbody>
                {fiche.markets.map((m) => (
                  <tr key={m.market} className="border-t border-line">
                    <td className="py-2">
                      {marketByCode[m.market].flag} {marketByCode[m.market].adjective}
                    </td>
                    <td className="py-2 text-right tabular-nums">{m.share} %</td>
                    {!commsOnly && (
                      <td className="py-2 text-right tabular-nums" title={`${m.windowP25} à ${m.windowP75} j · ${m.sample} réservations`}>
                        {m.windowMedian} j
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!commsOnly && <p className="mt-3 text-[0.7rem] text-ink-soft">Fenêtre = délai médian entre la réservation et l&apos;arrivée, sur la même période les années précédentes.</p>}
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <p className="eyebrow text-taupe">Sur quoi s&apos;appuie la fiche</p>
            <ul className="mt-3 space-y-4">
              {fiche.evidence.map((e, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{e.label}</span>
                    <OriginBadge origin={e.origin} />
                  </div>
                  <p className="mt-1 leading-relaxed text-ink-soft">{e.detail}</p>
                  <p className="mt-0.5 text-[0.7rem] text-taupe">Source : {e.source}</p>
                </li>
              ))}
            </ul>
            {fiche.moment.sourceUrl && (
              <a href={fiche.moment.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs text-brown underline-offset-2 hover:underline">
                {fiche.moment.sourceUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </section>

          <section className="rounded-md border border-line bg-white p-5">
            <p className="eyebrow text-taupe">Indicateurs à suivre</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {fiche.kpis.map((k) => (
                <li key={k}>· {k}</li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-md border border-line bg-white">
            <div className="relative h-32">
              <Image src={hotel.image} alt="" fill className="object-cover" sizes="360px" />
            </div>
            <div className="p-5">
              <p className="eyebrow text-taupe">{hotel.tagline}</p>
              <p className="mt-1 font-display text-xl">{hotel.name}</p>
              <p className="mt-1 text-xs text-ink-soft">{hotel.roomsLabel}</p>
              <Flags codes={Object.keys(hotel.marketMix) as (keyof typeof hotel.marketMix)[]} size="text-xs" />
              <a href={hotel.url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-xs text-brown hover:underline">
                Voir la page de la maison <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
