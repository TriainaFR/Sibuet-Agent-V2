import { Entete } from "@/components/entete";

// Mise en page de l'espace connecté : en-tête Sibuet, contenu, pied de page.
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Entete />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 bg-greige text-white">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div>
            <p className="font-display text-2xl">L&apos;art de vivre, au bon moment.</p>
            <p className="eyebrow mt-1 text-white/80">Le système propose, l&apos;équipe valide</p>
          </div>
          <p className="text-xs text-white/85">Agent Sibuet · Allin Conseil et Triaina · démonstration</p>
        </div>
      </footer>
    </>
  );
}
