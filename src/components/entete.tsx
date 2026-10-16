import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import { formatDate } from "@/lib/dates";
import { protectionActive } from "@/lib/session";
import { lireCalculs, lireMaisons, lireParametres } from "@/services/reference";
import { Navigation } from "./navigation";
import { SelecteurMaison } from "./selecteur-maison";

/** En-tête à la manière du site Sibuet : logo centré sur fond blanc, navigation en capitales espacées. */
export function Entete() {
  const { maisons, pilote } = lireMaisons();
  const dernier = lireCalculs().at(-1);
  const { donneesFictives } = lireParametres();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/96 backdrop-blur">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pt-3 sm:px-6">
        <SelecteurMaison maisons={maisons.map((m) => ({ id: m.id, nom: m.nom, destination: m.destination, pilote: m.id === pilote }))} saison="hiver 2026-2027" />
        <Link href="/" aria-label="Accueil" className="block">
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={158} height={44} priority className="h-auto w-[104px] sm:w-[158px]" />
        </Link>
        <div className="flex items-center justify-end gap-3 text-right text-xs text-ink-soft">
          {donneesFictives && <span className="hidden border border-brick/40 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-brick sm:inline">Données fictives</span>}
          {dernier && (
            <span className="hidden sm:block">
              Mis à jour le {formatDate(dernier.date, true)}
              <span className="block text-[0.68rem] text-taupe">calcul n° {dernier.numero}</span>
            </span>
          )}
          {protectionActive() && (
            <form action={seDeconnecter}>
              <button title="Se déconnecter" className="inline-flex h-8 w-8 items-center justify-center border border-line text-ink-soft transition hover:border-ink hover:text-ink">
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.6} />
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <Navigation />
      </div>
    </header>
  );
}
