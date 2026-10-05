import type { ReactNode } from "react";
import type { Marche, Origine, StatutCode } from "@/lib/types";

// Composants de base, sans état.

export type Ton = "vert" | "ocre" | "brique" | "gris" | "bleu" | "brun";

const tons: Record<Ton, string> = {
  vert: "bg-sage/12 text-sage ring-sage/25",
  ocre: "bg-ochre/12 text-[#8a6a32] ring-ochre/30",
  brique: "bg-brick/10 text-brick ring-brick/25",
  gris: "bg-sand text-ink-soft ring-line",
  bleu: "bg-sky/10 text-sky ring-sky/25",
  brun: "bg-brown text-white ring-brown",
};

export function Puce({ ton = "gris", children, title }: { ton?: Ton; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tons[ton]}`}>
      {children}
    </span>
  );
}

export const tonStatut: Record<StatutCode, Ton> = {
  a_lancer: "vert",
  a_creer: "vert",
  declencher: "brique",
  en_retard: "brique",
  existant: "ocre",
  bloque: "brique",
  suspendu: "gris",
  a_confirmer: "gris",
  veille: "bleu",
  ferme: "gris",
};

export function PuceStatut({ code, libelle }: { code: StatutCode; libelle: string }) {
  return <Puce ton={tonStatut[code]}>{libelle}</Puce>;
}

export function Niveau({ libelle }: { libelle: string }) {
  const ton: Ton = /Élevée|Haut|Peu visible/.test(libelle) ? "brique" : /Moyenne|Moyen|peu cliquée/.test(libelle) ? "ocre" : /Bien placée/.test(libelle) ? "vert" : "gris";
  return <Puce ton={ton}>{libelle}</Puce>;
}

export function Origine({ origine }: { origine: Origine | null }) {
  if (!origine) return <span className="rounded bg-sand px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-ink-soft">manquant</span>;
  const style = origine === "saisi" ? "bg-sky/12 text-sky" : origine === "mesuré" ? "bg-sage/15 text-sage" : origine === "fictif" ? "bg-brick/10 text-brick" : "bg-ochre/12 text-[#8a6a32]";
  return <span className={`rounded px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide ${style}`}>{origine}</span>;
}

export function Marches({ ids, marches, max = 4 }: { ids: string[]; marches: Marche[]; max?: number }) {
  const liste = ids.map((id) => marches.find((m) => m.id === id)).filter(Boolean) as Marche[];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {liste.slice(0, max).map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
          {m.nom}
        </span>
      ))}
      {liste.length > max && <span className="text-xs text-ink-soft">+ {liste.length - max}</span>}
    </span>
  );
}

export function TitreSection({ eyebrow, titre, children }: { eyebrow?: string; titre: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow text-taupe">{eyebrow}</p>}
        <h2 className="mt-1 font-display text-[1.75rem] leading-tight">{titre}</h2>
      </div>
      {children}
    </div>
  );
}

export function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-[0.6rem] text-taupe">{label}</p>
      <div className="mt-1 text-[0.92rem] leading-relaxed">{children}</div>
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">{children}</p>;
}
