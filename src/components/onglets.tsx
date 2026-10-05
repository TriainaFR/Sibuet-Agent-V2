"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

/** Onglets de la fiche. L'onglet actif est gardé dans l'adresse (?onglet=…) pour pouvoir être partagé. */
export function Onglets({ onglets }: { onglets: { id: string; label: string; contenu: ReactNode }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [actif, setActif] = useState(params.get("onglet") ?? onglets[0].id);
  return (
    <div>
      <div role="tablist" className="scrollbar-thin sticky top-[104px] z-20 -mx-4 flex gap-2 overflow-x-auto border-b border-line bg-cream/95 px-4 backdrop-blur sm:mx-0 sm:justify-center sm:px-0">
        {onglets.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={actif === o.id}
            onClick={() => {
              setActif(o.id);
              router.replace(`?onglet=${o.id}`, { scroll: false });
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition ${
              actif === o.id ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {onglets.map((o) => (
        <div key={o.id} role="tabpanel" hidden={actif !== o.id} className="apparition pt-8">
          {o.contenu}
        </div>
      ))}
    </div>
  );
}
