import type { ReactNode } from "react";

// Composants du design system (voir /charte). Ils lisent les jetons --maison-* de la maison
// qui les entoure : posés dans un bloc data-maison="gyp-sea", ils prennent ses couleurs.

/** Chiffre clé : libellé, valeur en sans semi-grasse, écart signé, note. */
export function Chiffre({
  libelle,
  valeur,
  ecart,
  note,
  grand = false,
}: {
  libelle: string;
  valeur: ReactNode;
  /** Écart signé ; bon indique si la hausse est une bonne nouvelle. */
  ecart?: { texte: string; sens: "hausse" | "baisse" | "stable"; bon?: boolean };
  note?: ReactNode;
  grand?: boolean;
}) {
  const ton = !ecart || ecart.sens === "stable" ? "text-ink-soft" : (ecart.sens === "hausse") === (ecart.bon ?? true) ? "text-sage" : "text-brick";
  return (
    <div className="min-w-0">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-taupe">{libelle}</p>
      <p className={`mt-1.5 font-semibold leading-none text-ink ${grand ? "text-[2.6rem]" : "text-[1.85rem]"}`}>{valeur}</p>
      {(ecart || note) && (
        <p className="mt-2 text-xs leading-snug text-ink-soft">
          {ecart && (
            <span className={`mr-1.5 font-semibold ${ton}`}>
              {ecart.sens === "hausse" ? "▲" : ecart.sens === "baisse" ? "▼" : "="} {ecart.texte}
            </span>
          )}
          {note}
        </p>
      )}
    </div>
  );
}

/** En-tête de section : surtitre en capitales, titre dans la serif de la maison, texte d'appui. */
export function EnTete({ surtitre, titre, children, action, id }: { surtitre?: string; titre: ReactNode; children?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div id={id} className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        {surtitre && <p className="eyebrow text-[0.64rem] text-taupe">{surtitre}</p>}
        <h2 className="titre-maison mt-1 text-[1.9rem] leading-tight">{titre}</h2>
        {children && <div className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** Mention de source, datée : chaque chiffre affiché dit d'où il vient. */
export function Source({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[0.72rem] text-taupe">Source : {children}</p>;
}

/** Bloc de contenu : carte blanche à filet fin, angles droits. */
export function Bloc({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`carte p-5 sm:p-7 ${className}`}>{children}</section>;
}

/** Pastille de couleur avec son nom et sa valeur (page /charte). */
export function Nuancier({ nom, hex, role }: { nom: string; hex: string; role: string }) {
  return (
    <div className="min-w-0">
      <div className="h-16 border border-black/5" style={{ background: hex }} />
      <p className="mt-2 text-sm font-semibold">{nom}</p>
      <p className="text-xs text-ink-soft">
        <span className="font-mono">{hex}</span> · {role}
      </p>
    </div>
  );
}
