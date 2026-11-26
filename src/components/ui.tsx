import Image from "next/image";
import type { ReactNode } from "react";
import type { Marche, Origine, StatutCode } from "@/lib/types";

// Composants de base, dans l'esprit du site Sibuet : sobres, angles droits, capitales espacées.

export type Ton = "vert" | "ocre" | "brique" | "gris" | "bleu" | "nuit" | "cognac";

const tons: Record<Ton, string> = {
  vert: "border-sage/40 bg-sage/8 text-sage",
  ocre: "border-ochre/45 bg-ochre/8 text-[#86672f]",
  brique: "border-brick/40 bg-brick/7 text-brick",
  gris: "border-line bg-sand/60 text-ink-soft",
  bleu: "border-sky/40 bg-sky/8 text-sky",
  nuit: "border-nuit bg-nuit text-white",
  cognac: "border-cognac/45 bg-cognac/8 text-cognac",
};

/** Étiquette : petit texte en capitales, filet fin, angles droits. */
export function Puce({ ton = "gris", children, title }: { ton?: Ton; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] text-[0.66rem] font-semibold uppercase tracking-[0.1em] ${tons[ton]}`}>
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
  if (!origine) return <span className="border border-line px-1.5 py-[1px] text-[0.6rem] font-semibold uppercase tracking-wider text-ink-soft">manquant</span>;
  const style = origine === "saisi" ? "border-sky/40 text-sky" : origine === "mesuré" ? "border-sage/40 text-sage" : origine === "fictif" ? "border-brick/40 text-brick" : "border-ochre/45 text-[#86672f]";
  return <span className={`border px-1.5 py-[1px] text-[0.6rem] font-semibold uppercase tracking-wider ${style}`}>{origine}</span>;
}

export function Marches({ ids, marches, max = 4 }: { ids: string[]; marches: Marche[]; max?: number }) {
  const liste = ids.map((id) => marches.find((m) => m.id === id)).filter(Boolean) as Marche[];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {liste.slice(0, max).map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
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
      {eyebrow && <p className="eyebrow text-taupe">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-[2.4rem] leading-[1.05] sm:text-5xl">{titre}</h2>
      {texte && <p className="mt-3 text-ink-soft">{texte}</p>}
    </div>
  );
}

/** Bandeau greige du site, avec grand titre blanc, capitales et filigrane. */
export function Bandeau({
  eyebrow,
  titre,
  sousTitre,
  children,
  photo,
  photo2,
  filigrane = "Lodge Park",
}: {
  eyebrow?: string;
  titre: string;
  sousTitre?: string;
  children?: ReactNode;
  photo?: string;
  photo2?: string;
  filigrane?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-maison-bandeau text-white">
      <span className="filigrane absolute -bottom-6 left-0 text-[9rem] sm:text-[13rem]">{filigrane}</span>
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-16">
        <div className="apparition">
          {eyebrow && <p className="eyebrow text-white/85">{eyebrow}</p>}
          <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] sm:text-6xl">{titre}</h1>
          {sousTitre && <p className="eyebrow mt-4 text-[0.78rem] tracking-[0.2em]">{sousTitre}</p>}
          {children && <div className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-white/95">{children}</div>}
        </div>
        {photo && (
          <div className="relative hidden h-[300px] lg:block">
            <div className="absolute left-0 top-0 h-[270px] w-[62%] overflow-hidden shadow-xl">
              <Image src={photo} alt="" fill className="object-cover" sizes="400px" priority />
            </div>
            {photo2 && (
              <div className="absolute bottom-0 right-0 h-[200px] w-[48%] overflow-hidden border-[6px] border-white shadow-xl">
                <Image src={photo2} alt="" fill className="object-cover" sizes="300px" />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-[0.62rem] text-taupe">{label}</p>
      <div className="mt-1.5 text-[0.93rem] leading-relaxed">{children}</div>
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-line bg-white/50 px-4 py-8 text-center text-sm text-ink-soft">{children}</p>;
}

/** Encadré d'aide : explique en une phrase comment lire un écran. */
export function Aide({ children }: { children: ReactNode }) {
  return (
    <details className="group border-l-2 border-greige bg-white/60 px-4 py-2.5 text-sm text-ink-soft">
      <summary className="cursor-pointer select-none font-semibold text-ink">
        <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink-soft text-[0.62rem]">?</span>
        Comment lire cet écran
      </summary>
      <div className="mt-2 leading-relaxed">{children}</div>
    </details>
  );
}
