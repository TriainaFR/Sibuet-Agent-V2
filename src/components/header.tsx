import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "./nav-links";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Accueil">
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={150} height={42} priority />
        </Link>
        <span className="hidden h-8 w-px bg-line xl:block" />
        <span className="eyebrow hidden whitespace-nowrap text-taupe xl:block">Calendrier d&apos;activation</span>
        <NavLinks />
        <span className="eyebrow ml-auto hidden rounded-full border border-ochre/40 bg-ochre/10 px-3 py-1 text-[0.62rem] text-ochre xl:block">
          Démo · réservations simulées
        </span>
      </div>
    </header>
  );
}
