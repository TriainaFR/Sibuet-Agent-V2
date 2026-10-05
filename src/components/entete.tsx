import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { lireCalculs, lireMaisons, lireParametres } from "@/services/reference";
import { Navigation } from "./navigation";

export function Entete() {
  const { maisons, pilote } = lireMaisons();
  const maison = maisons.find((m) => m.id === pilote)!;
  const dernier = lireCalculs().at(-1);
  const { donneesFictives } = lireParametres();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
          <Link href="/" className="shrink-0" aria-label="Accueil">
            <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={138} height={38} priority />
          </Link>
          <span className="hidden h-8 w-px bg-line sm:block" />
          <div className="min-w-0">
            <p className="font-display text-xl leading-none">
              {maison.nom} <span className="text-taupe">hiver 2026-2027</span>
            </p>
            <p className="mt-1 hidden text-xs text-ink-soft md:block">
              Autres maisons après le pilote : {maisons.filter((m) => !m.pilote).map((m) => m.nom).join(", ")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-right text-xs text-ink-soft">
            {donneesFictives && <span className="rounded-full bg-brick/10 px-2.5 py-1 font-semibold text-brick">Données fictives actives</span>}
            {dernier && (
              <span>
                Calcul n° {dernier.numero}
                <br />
                du {formatDate(dernier.date, true)}
              </span>
            )}
          </div>
        </div>
        <Navigation />
      </div>
    </header>
  );
}
