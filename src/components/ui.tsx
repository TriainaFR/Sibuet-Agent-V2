import {
  BriefcaseBusiness,
  Camera,
  HeartHandshake,
  Mail,
  MousePointerClick,
  Newspaper,
  Search,
  type LucideIcon,
} from "lucide-react";
import { levers, marketByCode } from "@/config/markets";
import type { DataOrigin, FicheStatus, LeverId, MarketCode, MomentKind } from "@/lib/types";

export const leverIcons: Record<LeverId, LucideIcon> = {
  instagram: Camera,
  "google-ads": MousePointerClick,
  seo: Search,
  newsletter: Mail,
  crm: HeartHandshake,
  rp: Newspaper,
  linkedin: BriefcaseBusiness,
};

export const kindLabels: Record<MomentKind, string> = {
  saison: "Saison",
  "evenement-local": "Événement local",
  marronnier: "Marronnier",
  vacances: "Vacances",
  meteo: "Météo",
  "b2b-rh": "RH / B2B",
};

const statusStyles: Record<FicheStatus, string> = {
  urgent: "bg-brick text-white",
  "à lancer": "bg-ochre text-white",
  "à venir": "bg-sand text-ink-soft",
  "en cours": "bg-olive text-white",
};

const statusLabels: Record<FicheStatus, string> = {
  urgent: "En retard",
  "à lancer": "À lancer",
  "à venir": "À venir",
  "en cours": "En cours",
};

export function StatusBadge({ status }: { status: FicheStatus }) {
  return <span className={`eyebrow shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6rem] ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}

export function PriorityBadge({ level, score }: { level: "haute" | "moyenne" | "basse"; score: number }) {
  const color = level === "haute" ? "text-brick border-brick/40" : level === "moyenne" ? "text-ochre border-ochre/40" : "text-sage border-sage/40";
  return (
    <span className={`eyebrow inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6rem] ${color}`} title={`Score de priorité : ${score}/100`}>
      <span className={`h-1.5 w-1.5 rounded-full ${level === "haute" ? "bg-brick" : level === "moyenne" ? "bg-ochre" : "bg-sage"}`} />
      Priorité {level}
    </span>
  );
}

export function Flags({ codes, size = "text-sm" }: { codes: MarketCode[]; size?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${size}`}>
      {codes.map((c) => (
        <span key={c} title={marketByCode[c].name}>
          {marketByCode[c].flag}
        </span>
      ))}
    </span>
  );
}

export function LeverIcon({ lever, className = "h-3.5 w-3.5" }: { lever: LeverId; className?: string }) {
  const Icon = leverIcons[lever];
  return <Icon className={className} aria-label={levers[lever].label} strokeWidth={1.6} />;
}

export function LeverChips({ ids }: { ids: LeverId[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((l) => (
        <span key={l} title={levers[l].label} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sand text-ink-soft">
          <LeverIcon lever={l} />
        </span>
      ))}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: DataOrigin }) {
  const style =
    origin === "réel" ? "bg-olive/15 text-olive" : origin === "simulé" ? "bg-ochre/15 text-ochre" : "bg-sand text-ink-soft";
  return <span className={`eyebrow rounded px-1.5 py-0.5 text-[0.56rem] ${style}`}>{origin}</span>;
}
