import Link from "next/link";
import { Entete } from "@/components/entete";

// Mise en page de l'espace connecté. Le cadre (en-tête, navigation, pied) porte la charte du groupe ;
// le contenu prend le thème de la maison dont il parle (Lodge Park pour l'agent, voir /charte).
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Entete />
      <main className="flex-1" data-maison="lodge-park">
        {children}
      </main>
      <footer className="mt-16 bg-greige-fonce text-white print:hidden" data-maison="groupe">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-6 py-9">
          <div>
            <p className="font-display text-2xl">L&apos;art de vivre, au bon moment.</p>
            <p className="eyebrow mt-1 text-white/85">Le système propose, l&apos;équipe valide</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white/90">
            <Link href="/maisons" className="hover:text-white">Les maisons</Link>
            <Link href="/sources" className="hover:text-white">Sources et routine</Link>
            <Link href="/charte" className="hover:text-white">Charte graphique</Link>
            <Link href="/admin" className="hover:text-white">Coulisses techniques</Link>
          </nav>
          <p className="w-full text-xs text-white/80 sm:w-auto">Agent Sibuet · Allin Conseil et Triaina</p>
        </div>
      </footer>
    </>
  );
}
