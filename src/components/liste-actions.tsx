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
      <div className="flex flex-wrap items-center gap-2">
        {filtres.map((f) => {
          const n = actions.filter(f.test).length;
          return (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`border px-3.5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition ${
                filtre === f.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-greige hover:text-ink"
              }`}
            >
              {f.label} <span className={filtre === f.id ? "text-white/70" : "text-greige-dark"}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-8">
        {semaines.length === 0 && <Vide>Aucune action dans cette catégorie.</Vide>}
        {semaines.map(([s, liste]) => (
          <section key={s}>
            <div className="flex items-baseline gap-3 border-b border-ink/80 pb-2">
              <h3 className="titre-capitales text-lg">{s === cetteSemaine ? "Cette semaine" : s === addDays(cetteSemaine, 7) ? "La semaine prochaine" : `Semaine du ${formatDate(s)}`}</h3>
              <span className="text-xs text-ink-soft">
                {liste.length} action{liste.length > 1 ? "s" : ""}
              </span>
            </div>
            <ul>
              {liste.map((a, i) => {
                const d = decisions[a.activationCle];
                const grise = ["suspendu", "ferme"].includes(a.statut.code);
                const jours = diffDays(a.date, date);
                return (
                  <li key={i} className={`apparition border-b border-line ${grise ? "opacity-55" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                    <Link
                      href={`/sujets/${a.sujetId}?onglet=actions`}
                      className="group grid grid-cols-[58px_1fr] items-center gap-4 py-4 transition hover:bg-white sm:grid-cols-[64px_auto_1fr_auto] sm:px-2"
                    >
                      <div className="text-center leading-none">
                        <p className="font-display text-[2rem]">{a.date.slice(8, 10).replace(/^0/, "")}</p>
                        <p className="eyebrow mt-1 text-[0.6rem] text-taupe">{MOIS[Number(a.date.slice(5, 7)) - 1]}</p>
                      </div>
                      <div className="hidden sm:block">
                        <IconeCanal canal={a.canal} />
                      </div>
                      <div className="min-w-0">
                        <p className="eyebrow text-[0.6rem] text-taupe">
                          {canalLibelle[a.canal]} · {a.enRetard ? "à faire dès maintenant" : jours <= 0 ? "aujourd'hui" : `${jourSemaine(a.date)}, ${relatif(a.date, date)}`}
                        </p>
                        <p className="mt-0.5 font-display text-[1.25rem] leading-snug group-hover:text-cognac">{a.titre}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                          <span className="inline-flex items-center gap-2">
                            {images[a.sujetId] && (
                              <span className="relative inline-block h-5 w-7 overflow-hidden">
                                <Image src={images[a.sujetId]} alt="" fill className="object-cover" sizes="28px" />
                              </span>
                            )}
                            {a.sujetNom}
                          </span>
                          <Marches ids={a.marches} marches={marches} max={3} />
                        </div>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:flex-col sm:items-end">
                        <PuceStatut code={a.statut.code} libelle={a.statut.libelle} />
                        {d?.etat === "validee" && (
                          <span className="inline-flex items-center gap-1 text-xs text-sage">
                            <Check className="h-3.5 w-3.5" /> Validée par {d.par}
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
