"use client";

import { Check, Download, FileSpreadsheet, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { importerReservations, retirerReservations } from "@/app/actions";
import type { Marche, ResumeReservations } from "@/lib/types";

interface Props {
  /** Synthèse du dernier fichier chargé (agrégée, rien de nominatif). */
  resume: ResumeReservations | null;
  chargeLe: string | null;
  marches: Marche[];
  delais: Partial<Record<string, { med: number; n?: number }>>;
}

const COLONNES = [
  ["Date de réservation", "le jour où la réservation a été prise"],
  ["Pays d'origine", "code (FR, CH, GB…) ou nom du pays"],
  ["Arrivée et départ", "les dates de séjour, ou l'arrivée et le nombre de nuits"],
  ["Nombre de guests", "adultes, et enfants si la colonne existe"],
  ["Nombre de chambres", "1 si la colonne manque"],
  ["Type de chambre", "tel qu'il sort du PMS"],
];

const fr = (n: number) => String(n).replace(".", ",");
const dateFr = (s: string) => s.split("-").reverse().join("/");

export function ChargementReservations({ resume, chargeLe, marches, delais }: Props) {
  const [etat, envoyer, envoi] = useActionState(importerReservations, null);
  const [retrait, demarrer] = useTransition();
  const [nom, setNom] = useState("");
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const choisir = (f: File | undefined) => {
    if (!f || !input.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    input.current.files = dt.files;
    setNom(f.name);
    form.current?.requestSubmit();
  };

  return (
    <section className="carte overflow-hidden">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        {/* Dépôt du fichier */}
        <div className="border-b border-line p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <p className="eyebrow text-[0.62rem] text-taupe">Le plus efficace</p>
          <h2 className="titre-capitales mt-1 text-xl leading-tight">Charger vos réservations</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Un export du PMS suffit, en Excel ou en CSV. L&apos;outil en déduit les délais de réservation par pays et le remplissage de chaque sujet par rapport à
            l&apos;an dernier : les étapes 4 et 5 ci-dessous se remplissent seules.
          </p>

          <form ref={form} action={envoyer}>
            <input
              ref={input}
              type="file"
              name="fichier"
              accept=".xlsx,.csv,.txt"
              className="sr-only"
              onChange={(e) => {
                setNom(e.target.files?.[0]?.name ?? "");
                if (e.target.files?.[0]) form.current?.requestSubmit();
              }}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSurvol(true);
              }}
              onDragLeave={() => setSurvol(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSurvol(false);
                choisir(e.dataTransfer.files[0]);
              }}
              disabled={envoi}
              className={`mt-4 flex w-full flex-col items-center gap-2 border border-dashed px-4 py-7 text-center transition ${
                survol ? "border-greige bg-sand/60" : "border-line bg-white hover:border-greige hover:bg-sand/30"
              } disabled:opacity-60`}
            >
              {envoi ? <FileSpreadsheet className="h-6 w-6 animate-pulse text-greige" /> : <Upload className="h-6 w-6 text-greige" />}
              <span className="text-sm font-semibold">{envoi ? `Lecture de ${nom || "votre fichier"}…` : "Déposez le fichier ici, ou cliquez pour le choisir"}</span>
              <span className="text-xs text-ink-soft">.xlsx ou .csv, 7 Mo au plus, une ligne par réservation</span>
            </button>
          </form>

          {etat && (
            <p className={`mt-3 flex items-start gap-2 text-sm ${etat.ok ? "text-sage" : "text-brick"}`}>
              {etat.ok && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
              {etat.message}
            </p>
          )}

          <div className="mt-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-taupe">Colonnes attendues, dans n&apos;importe quel ordre</p>
            <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
              {COLONNES.map(([c, d]) => (
                <li key={c}>
                  <span className="font-semibold">{c}</span>
                  <span className="block text-xs text-ink-soft">{d}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">Les en-têtes en anglais sont reconnus aussi (booking date, country, check-in, guests, rooms, room type). Les annulations sont écartées si une colonne statut existe.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/exemples/modele_reservations.csv" download className="bouton-clair inline-flex items-center gap-1.5 !px-3.5 !py-2">
                <Download className="h-3.5 w-3.5" /> Modèle vide
              </a>
              <a href="/exemples/reservations_exemple.csv" download className="bouton-clair inline-flex items-center gap-1.5 !px-3.5 !py-2">
                <Download className="h-3.5 w-3.5" /> Exemple fictif
              </a>
            </div>
          </div>

          <p className="mt-5 flex items-start gap-2 border-l-2 border-sage bg-sage/8 px-3 py-2 text-xs text-ink-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
            Le fichier est lu puis oublié : seuls des totaux par pays et par période sont gardés. Aucun nom, e-mail ni numéro de réservation n&apos;est conservé.
            Retirez ces colonnes de l&apos;export si possible.
          </p>
        </div>

        {/* Ce que l'outil en a tiré */}
        <div className="bg-sand/25 p-5 sm:p-6">
          {resume ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="eyebrow text-[0.62rem] text-taupe">Fichier pris en compte{chargeLe ? `, le ${dateFr(chargeLe)}` : ""}</p>
                  <p className="mt-1 break-all font-semibold">{resume.fichier}</p>
                </div>
                <button
                  disabled={retrait}
                  onClick={() => demarrer(() => retirerReservations())}
                  className="inline-flex items-center gap-1.5 border border-line bg-white px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] hover:border-brick hover:text-brick disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Retirer
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="border border-line bg-white px-2 py-3">
                  <p className="font-display text-2xl">{resume.retenues}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-ink-soft">réservations</p>
                </div>
                <div className="border border-line bg-white px-2 py-3">
                  <p className="font-display text-2xl">{resume.chambresMoyennes !== null ? fr(resume.chambresMoyennes) : "-"}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-ink-soft">chambres par résa</p>
                </div>
                <div className="border border-line bg-white px-2 py-3">
                  <p className="font-display text-2xl">{Object.keys(delais).length}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-ink-soft">délais mesurés</p>
                </div>
              </div>
              {resume.arrivees && <p className="mt-2 text-xs text-ink-soft">Arrivées du {dateFr(resume.arrivees[0])} au {dateFr(resume.arrivees[1])}.</p>}
              {resume.ignorees.length > 0 && (
                <p className="mt-1 text-xs text-ink-soft">Lignes écartées : {resume.ignorees.map((i) => `${i.nombre} ${i.raison}`).join(", ")}.</p>
              )}

              <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-taupe">Par pays d&apos;origine</p>
              <table className="mt-2 w-full text-[0.8rem] sm:text-sm">
                <thead>
                  <tr className="text-left text-[0.65rem] uppercase tracking-wide text-ink-soft">
                    <th className="pb-1 font-semibold">Pays</th>
                    <th className="pb-1 pl-2 text-right font-semibold">Résas</th>
                    <th className="pb-1 pl-2 text-right font-semibold">Nuitées</th>
                    <th className="pb-1 pl-2 text-right font-semibold">Guests</th>
                    <th className="pb-1 pl-2 text-right font-semibold">Réserve à</th>
                  </tr>
                </thead>
                <tbody>
                  {resume.parPays.slice(0, 9).map((p) => {
                    const m = marches.find((x) => x.id === p.marche);
                    return (
                      <tr key={p.pays} className="border-t border-line/70">
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: m?.couleur ?? "#c9bfb2" }} />
                            {p.pays}
                            {!m && <span className="hidden text-[0.6rem] uppercase text-ink-soft sm:inline">non suivi</span>}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{p.reservations}</td>
                        <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{p.nuitees}</td>
                        <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{p.personnesMoyennes !== null ? fr(p.personnesMoyennes) : "-"}</td>
                        <td className="whitespace-nowrap py-1.5 pl-2 text-right tabular-nums">{fr(p.delaiMedianSemaines)} sem.</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-1 text-[0.7rem] text-ink-soft">« Réserve à » : délai médian entre la réservation et l&apos;arrivée. Un délai par marché demande au moins 5 réservations.</p>

              {resume.typesChambres.length > 0 && (
                <>
                  <p className="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-taupe">Types de chambres</p>
                  <div className="mt-2 space-y-1.5">
                    {resume.typesChambres.map((t) => (
                      <div key={t.type} className="flex items-center gap-3 text-sm">
                        <span className="w-32 shrink-0 truncate sm:w-40" title={t.type}>
                          {t.type}
                        </span>
                        <span className="h-2 flex-1 bg-white">
                          <span className="block h-2 bg-greige" style={{ width: `${t.part}%` }} />
                        </span>
                        <span className="w-10 text-right tabular-nums text-ink-soft">{t.part} %</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <details className="mt-5 text-xs text-ink-soft">
                <summary className="cursor-pointer font-semibold text-ink">Colonnes reconnues</summary>
                <ul className="mt-2 space-y-0.5">
                  {Object.entries(resume.colonnes).map(([k, v]) => (
                    <li key={k}>
                      {k} ← « {v} »
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center gap-3 text-sm text-ink-soft">
              <FileSpreadsheet className="h-8 w-8 text-greige" />
              <p className="font-semibold text-ink">Aucun fichier chargé pour l&apos;instant.</p>
              <p>
                Sans réservations, les délais viennent de votre saisie ou de nos hypothèses, et le besoin de remplissage de ce que vous indiquez sujet par sujet.
              </p>
              <p>Pour comparer à l&apos;an dernier, l&apos;export doit couvrir aussi la saison précédente (réservations prises depuis l&apos;automne 2025).</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
