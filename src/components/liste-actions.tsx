"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, diffDays, formatDate, jourSemaine, lundi, relatif } from "@/lib/dates";
import { canalLibelle } from "@/lib/format";
import type { ActionAFaire, Decision, Marche } from "@/lib/types";
import { IconeCanal } from "./icones";
import { Marches, PuceStatut, Vide } from "./ui";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

type Filtre = "tout" | "lancer" | "bloque" | "prevu";
const filtres: { id: Filtre; label: string; test: (a: ActionAFaire) => boolean }[] = [
  { id: "tout", label: "Tout", test: () => true },
  { id: "lancer", label: "À lancer", test: (a) => ["a_lancer", "a_creer", "declencher", "en_retard"].includes(a.statut.code) },
  { id: "bloque", label: "Bloqué", test: (a) => ["bloque", "a_confirmer"].includes(a.statut.code) },
  { id: "prevu", label: "Déjà prévu", test: (a) => a.statut.code === "existant" },
];

export function ListeActions({
  actions,
  images,
  marches,
  decisions,
  date,
}: {
  actions: ActionAFaire[];
  images: Record<string, string>;
  marches: Marche[];
  decisions: Record<string, Decision>;
  date: string;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const visibles = actions.filter(filtres.find((f) => f.id === filtre)!.test);
  const semaines = useMemo(() => {
    const m = new Map<string, ActionAFaire[]>();
    for (const a of visibles) {
      const s = lundi(a.date);
      m.set(s, [...(m.get(s) ?? []), a]);
    }
    return [...m.entries()];
  }, [visibles]);
  const cetteSemaine = lundi(date);

  return (
    <div>
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-cream p-0.5">
        {filtres.map((f) => {
          const n = actions.filter(f.test).length;
          return (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`h-7 rounded-md px-2.5 text-[0.8125rem] transition ${
                filtre === f.id ? "bg-white font-medium text-ink shadow-[0_1px_2px_rgba(28,28,26,0.1)]" : "text-ink-soft hover:text-ink"
              }`}
            >
              {f.label} <span className="ml-0.5 text-taupe tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-5">
        {semaines.length === 0 && <Vide>Aucune action dans cette catégorie.</Vide>}
        {semaines.map(([s, liste]) => (
          <section key={s}>
            <div className="flex items-baseline gap-2 pb-1.5">
              <h3 className="text-xs font-semibold text-ink">{s === cetteSemaine ? "Cette semaine" : s === addDays(cetteSemaine, 7) ? "La semaine prochaine" : `Semaine du ${formatDate(s)}`}</h3>
              <span className="text-xs text-taupe">
                {liste.length} action{liste.length > 1 ? "s" : ""}
              </span>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {liste.map((a, i) => {
                const d = decisions[a.activationCle];
                const grise = ["suspendu", "ferme"].includes(a.statut.code);
                const jours = diffDays(a.date, date);
                return (
                  <li key={i} className={grise ? "opacity-55" : ""}>
                    <Link
                      href={`/sujets/${a.sujetId}?onglet=actions`}
                      className="group grid grid-cols-[44px_1fr] items-center gap-3 px-3 py-2.5 transition hover:bg-cream/70 sm:grid-cols-[44px_auto_1fr_auto]"
                    >
                      <div className="text-center leading-none">
                        <p className="text-[0.9375rem] font-semibold tabular-nums">{a.date.slice(8, 10).replace(/^0/, "")}</p>
                        <p className="mt-0.5 text-[0.6875rem] text-taupe">{MOIS[Number(a.date.slice(5, 7)) - 1]}</p>
                      </div>
                      <div className="hidden sm:block">
                        <IconeCanal canal={a.canal} taille="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[0.8125rem] font-medium leading-snug text-ink group-hover:text-nav">{a.titre}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-taupe">
                          <span>
                            {canalLibelle[a.canal]} · {a.enRetard ? "à faire dès maintenant" : jours <= 0 ? "aujourd'hui" : `${jourSemaine(a.date)}, ${relatif(a.date, date)}`}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            {images[a.sujetId] && (
                              <span className="relative inline-block h-4 w-5 overflow-hidden rounded-sm">
                                <Image src={images[a.sujetId]} alt="" fill className="object-cover" sizes="28px" />
                              </span>
                            )}
                            {a.sujetNom}
                          </span>
                          <span className="hidden md:inline">
                            <Marches ids={a.marches} marches={marches} max={3} />
                          </span>
                        </div>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
                        <PuceStatut code={a.statut.code} libelle={a.statut.libelle} />
                        {d?.etat === "validee" && (
                          <span className="inline-flex items-center gap-1 text-xs text-sage">
                            <Check className="h-3.5 w-3.5" /> Validée
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
