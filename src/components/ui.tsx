import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Marche, Origine, StatutCode } from "@/lib/types";

// Composants de base de l'application : pastilles, niveaux, en-têtes d'écran, champs.

export type Ton = "vert" | "ocre" | "brique" | "gris" | "bleu" | "nuit" | "cognac";

const tons: Record<Ton, string> = {
  vert: "bg-sage/12 text-[#3d6639]",
  ocre: "bg-ochre/14 text-[#7c5a17]",
  brique: "bg-brick/10 text-brick",
  gris: "bg-sand text-ink-soft",
  bleu: "bg-sky/12 text-[#3f6380]",
  nuit: "bg-nav/8 text-nav",
  cognac: "bg-cognac/12 text-[#8a4b2a]",
};

/** Pastille d'état : fond teinté, coins arrondis, casse normale. */
export function Puce({ ton = "gris", children, title }: { ton?: Ton; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`pastille ${tons[ton]}`}>
      {children}
    </span>
  );
}

export const tonStatut: Record<StatutCode, Ton> = {
  a_lancer: "nuit",
  a_creer: "nuit",
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

/** Niveau lisible (urgence, intérêt, visibilité) : trois points pleins ou vides et un mot. */
export function Niveau({ libelle, compact = false }: { libelle: string; compact?: boolean }) {
  // Une seule règle : plus de points veut toujours dire plus prioritaire (urgence, intérêt, reste à gagner).
  const n = /^(Élevée|Haut|Haute)/.test(libelle) ? 3 : /^(Moyenne|Moyen)/.test(libelle) ? 2 : /^Non mesur/.test(libelle) ? 0 : 1;
  const couleur = n === 3 ? "bg-cognac" : n === 2 ? "bg-ochre" : "bg-greige";
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="inline-flex gap-[3px]">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-[7px] w-[7px] rounded-full ${i <= n ? couleur : "bg-line"}`} />
        ))}
      </span>
      <span className={compact ? "text-xs text-ink-soft" : "text-sm"}>{libelle}</span>
    </span>
  );
}

export function Origine({ origine }: { origine: Origine | null }) {
  if (!origine) return <span className="rounded-md bg-sand px-1.5 py-px text-[0.6875rem] font-medium text-ink-soft">manquant</span>;
  const style = origine === "saisi" ? "bg-sky/12 text-[#3f6380]" : origine === "mesuré" ? "bg-sage/12 text-[#3d6639]" : origine === "fictif" ? "bg-brick/10 text-brick" : "bg-ochre/14 text-[#7c5a17]";
  return <span className={`rounded-md px-1.5 py-px text-[0.6875rem] font-medium ${style}`}>{origine}</span>;
}

export function Marches({ ids, marches, max = 4 }: { ids: string[]; marches: Marche[]; max?: number }) {
  const liste = ids.map((id) => marches.find((m) => m.id === id)).filter(Boolean) as Marche[];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {liste.slice(0, max).map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
          {m.nom}
        </span>
      ))}
      {liste.length > max && <span className="text-xs text-ink-soft">et {liste.length - max} autres</span>}
    </span>
  );
}

/** Titre de section centré, comme « À découvrir aussi à l'hôtel Lodge Park… ». */
export function TitreCentre({ eyebrow, titre, texte }: { eyebrow?: string; titre: string; texte?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-xl font-semibold tracking-tight">{titre}</h2>
      {eyebrow && <p className="mt-1 text-sm text-taupe">{eyebrow}</p>}
      {texte && <p className="mt-3 text-ink-soft">{texte}</p>}
    </div>
  );
}

/** En-tête d'écran de l'application : fil d'Ariane, titre, description et actions. */
export function EnTetePage({ fil, titre, meta, children, actions, vignette }: { fil?: { href?: string; label: string }[]; titre: ReactNode; meta?: ReactNode; children?: ReactNode; actions?: ReactNode; vignette?: ReactNode }) {
  return (
    <header className="border-b border-line px-4 pb-5 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        {fil && fil.length > 0 && (
          <nav aria-label="Fil d'Ariane" className="mb-2 flex flex-wrap items-center gap-1 text-[0.8125rem] text-taupe">
            {fil.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-greige" />}
                {f.href ? (
                  <Link href={f.href} className="rounded px-0.5 hover:text-ink">
                    {f.label}
                  </Link>
                ) : (
                  <span>{f.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 max-w-3xl gap-4">
            {vignette}
            <div className="min-w-0">
            <h1 className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-2xl">{titre}</h1>
            {meta && <p className="mt-1 text-[0.8125rem] text-taupe">{meta}</p>}
            {children && <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}

/** Ancien bandeau photo : devenu l'en-tête d'écran standard (les photos et le filigrane ne sont plus affichés). */
export function Bandeau({ titre, sousTitre, children, actions }: { eyebrow?: string; titre: string; sousTitre?: string; children?: ReactNode; photo?: string; photo2?: string; filigrane?: string; actions?: ReactNode }) {
  return (
    <EnTetePage titre={titre} meta={sousTitre} actions={actions}>
      {children}
    </EnTetePage>
  );
}

export function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-taupe">{label}</p>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm text-ink-soft">{children}</p>;
}

/** Encadré d'aide : explique en une phrase comment lire un écran. */
export function Aide({ children }: { children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-cream px-4 py-2.5 text-sm text-ink-soft">
      <summary className="cursor-pointer select-none font-medium text-ink">
        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink-soft text-[0.62rem]">?</span>
        Comment lire cet écran
      </summary>
      <div className="mt-2 leading-relaxed">{children}</div>
    </details>
  );
}
