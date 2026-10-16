import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import { protectionActive } from "@/lib/session";
import { dateDeTravail, lireCalculs, lireMaisons, lireParametres, lireSaisons, saisonActive } from "@/services/reference";
import { Navigation } from "./navigation";
import { SelecteurMaison } from "./selecteur-maison";
import { SelecteurSaison } from "./selecteur-saison";

/** En-tête à la manière du site Sibuet : logo centré sur fond blanc, navigation en capitales espacées. */
export function Entete() {
  const { maisons, pilote } = lireMaisons();
  const dernier = lireCalculs().at(-1);
  const { donneesFictives } = lireParametres();
  const saison = saisonActive();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/96 backdrop-blur">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-3 sm:gap-4 sm:px-6">
        <SelecteurMaison maisons={maisons.map((m) => ({ id: m.id, nom: m.nom, destination: m.destination, pilote: m.id === pilote }))} saison={saison.nom.toLowerCase()} />
        <Link href="/" aria-label="Accueil" className="block">
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={158} height={44} priority className="h-auto w-[104px] sm:w-[158px]" />
        </Link>
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {donneesFictives && <span className="hidden border border-brick/40 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-brick lg:inline">Données fictives</span>}
          <SelecteurSaison
            saisons={lireSaisons().saisons.map((s) => ({ id: s.id, nom: s.nom, rejeu: s.rejeu, datesProposees: s.datesProposees }))}
            active={saison.id}
            date={dateDeTravail(saison)}
            majLe={dernier?.date}
          />
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
