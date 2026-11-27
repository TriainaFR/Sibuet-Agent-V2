"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Navigation } from "./navigation";

/**
 * Coquille de l'application : barre latérale fixe sur grand écran, tiroir sur mobile,
 * contenu dans un panneau blanc posé sur le fond de l'application.
 */
export function Coquille({ selecteurs, pied, bandeau, compteurs, children }: { selecteurs: ReactNode; pied: ReactNode; bandeau: ReactNode; compteurs?: Record<string, number>; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
  }, [ouvert]);

  const barre = (
    <div className="flex h-full flex-col gap-5 px-3 pb-3 pt-4">
      <Link href="/" className="flex items-center gap-2.5 px-2" aria-label="Accueil Agent Sibuet">
        <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={124} height={34} priority className="h-auto w-[118px]" />
        <span className="rounded-md border border-line bg-white px-1.5 text-[0.6875rem] font-medium leading-5 text-ink-soft">Agent</span>
      </Link>
      <div className="space-y-1">{selecteurs}</div>
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <Navigation onNaviguer={() => setOuvert(false)} compteurs={compteurs} />
      </div>
      <div className="border-t border-line pt-3">{pied}</div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream print:block print:bg-white">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 lg:block print:hidden">{barre}</aside>

      {/* Tiroir mobile */}
      <div className={`fixed inset-0 z-50 lg:hidden ${ouvert ? "" : "pointer-events-none"}`} aria-hidden={!ouvert}>
        <div onClick={() => setOuvert(false)} className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 ${ouvert ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 w-[284px] bg-cream shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${ouvert ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOuvert(false)} aria-label="Fermer le menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-soft hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
          {barre}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-cream/95 px-3 backdrop-blur lg:hidden print:hidden">
          <button onClick={() => setOuvert(true)} aria-label="Ouvrir le menu" className="rounded-lg p-1.5 text-ink hover:bg-black/5">
            <Menu className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={92} height={26} className="h-auto w-[92px]" />
        </div>
        <main className="flex min-w-0 flex-1 flex-col p-0 lg:py-2 lg:pr-2 print:p-0" data-maison="lodge-park">
          <div className="flex min-h-full flex-1 flex-col overflow-hidden bg-white lg:rounded-xl lg:border lg:border-line lg:shadow-[0_1px_3px_rgba(28,28,26,0.05)] print:border-0 print:shadow-none">
            {bandeau}
            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
