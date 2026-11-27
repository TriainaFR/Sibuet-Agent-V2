import { BookOpen, History, LogOut, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { seDeconnecter } from "@/app/connexion/actions";
import { formatDate, jourSemaine } from "@/lib/dates";
import { protectionActive } from "@/lib/session";
import { lireHistorique } from "@/services/contexte";
import { dateDeTravail, lireCalculs, lireMaisons, lireMarches, lireParametres, lireSaisons, saisonActive } from "@/services/reference";
import { Coquille } from "./coquille";
import { SelecteurMaison } from "./selecteur-maison";
import { SelecteurMarche } from "./selecteur-marche";
import { SelecteurSaison } from "./selecteur-saison";

/** Cadre de l'application : barre latérale (maison, saison, marché, navigation) et bandeau de rejeu. */
export function Entete({ children }: { children: ReactNode }) {
  const { maisons, pilote } = lireMaisons();
  const dernier = lireCalculs().at(-1);
  const { donneesFictives, marche } = lireParametres();
  const saison = saisonActive();
  const date = dateDeTravail(saison);
  const pays = lireHistorique()?.donnees.maisons.find((m) => m.id === pilote)?.pays ?? [];
  const marches = lireMarches().map((m) => ({ id: m.id, nom: m.nom, couleur: m.couleur, region: m.region, nuitees: pays.find((p) => p.pays === m.pays)?.nuitees ?? 0 }));

  const lien = "flex h-8 items-center gap-2.5 rounded-lg px-2 text-[0.8125rem] text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink";
  return (
    <Coquille
      selecteurs={
        <>
          <SelecteurMaison maisons={maisons.map((m) => ({ id: m.id, nom: m.nom, destination: m.destination, pilote: m.id === pilote }))} saison={saison.nom.toLowerCase()} />
          <SelecteurSaison
            saisons={lireSaisons().saisons.map((s) => ({ id: s.id, nom: s.nom, rejeu: s.rejeu, datesProposees: s.datesProposees }))}
            active={saison.id}
            date={date}
            majLe={dernier?.date}
          />
          <SelecteurMarche marches={marches} actif={marche ?? null} />
        </>
      }
      pied={
        <div className="space-y-px">
          {donneesFictives && <p className="mb-2 rounded-lg bg-brick/10 px-2 py-1.5 text-xs font-medium text-brick">Données fictives affichées</p>}
          <Link href="/admin" className={lien}>
            <Wrench className="h-4 w-4 text-taupe" strokeWidth={1.7} /> Coulisses techniques
          </Link>
          <Link href="/charte" className={lien}>
            <BookOpen className="h-4 w-4 text-taupe" strokeWidth={1.7} /> Charte graphique
          </Link>
          {protectionActive() && (
            <form action={seDeconnecter}>
              <button className={`${lien} w-full`}>
                <LogOut className="h-4 w-4 text-taupe" strokeWidth={1.7} /> Se déconnecter
              </button>
            </form>
          )}
        </div>
      }
      bandeau={
        saison.rejeu ? (
          <div className="flex items-center gap-2 bg-[#8a4b2a] px-4 py-2 text-[0.8125rem] text-white print:hidden sm:px-6">
            <History className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.8} />
            <p className="min-w-0">
              <span className="font-semibold">
                Démonstration rejouée au {jourSemaine(date)} {formatDate(date, true)}, données réelles
              </span>
              <span className="hidden text-white/80 md:inline"> · ventes Asterio du Lodge Park, rien n&apos;a été envoyé</span>
            </p>
          </div>
        ) : null
      }
    >
      {children}
    </Coquille>
  );
}
