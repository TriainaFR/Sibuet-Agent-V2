import Link from "next/link";
import { hotelById } from "@/config/hotels";
import { formatDate, formatRange } from "@/lib/dates";
import type { Fiche } from "@/lib/types";
import { Flags, LeverChips, PriorityBadge, StatusBadge, kindLabels } from "./ui";

export function FicheCard({ fiche, compact = false }: { fiche: Fiche; compact?: boolean }) {
  const hotel = hotelById[fiche.hotelId];
  const commsOnly = fiche.moment.timing === "communication";
  return (
    <Link
      href={`/fiches/${fiche.id}`}
      className="group relative block overflow-hidden rounded-md border border-line bg-white p-3.5 pl-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-greige hover:shadow-md"
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: hotel.color }} />
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow truncate text-[0.6rem] text-taupe">
          {hotel.shortName} · {kindLabels[fiche.moment.kind]}
        </span>
        <StatusBadge status={fiche.status} />
      </div>
      <h3 className="mt-1.5 font-display text-[1.15rem] leading-snug text-ink group-hover:text-brown">{fiche.moment.title}</h3>
      <p className="mt-1 text-xs text-ink-soft">
        {commsOnly ? "Opération" : "Séjours"} : {formatRange(fiche.eventStart, fiche.eventEnd)}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-ink">
        {fiche.status === "urgent" ? "À lancer dès maintenant" : `Lancer le ${formatDate(fiche.launchDate, true)}`}
      </p>
      {!compact && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Flags codes={fiche.markets.map((m) => m.market)} />
          <LeverChips ids={[...new Set(fiche.actions.map((a) => a.lever))]} />
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <PriorityBadge level={fiche.priority.level} score={fiche.priority.score} />
        {compact && <Flags codes={fiche.markets.slice(0, 4).map((m) => m.market)} size="text-xs" />}
      </div>
    </Link>
  );
}
