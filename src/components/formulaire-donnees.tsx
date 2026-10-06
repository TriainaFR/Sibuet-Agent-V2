"use client";

import { Check, ClipboardCopy, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { enregistrerSaisie, revenirAuxEstimations } from "@/app/actions";
import type { Marche, Remplissage, SaisieClient } from "@/lib/types";

interface Props {
  saisie: SaisieClient;
  marches: Marche[];
  sujets: { id: string; nom: string }[];
  /** Délais fournis par un flux (réservations chargées ou Asterio) : ils remplacent la saisie. */
  flux: Partial<Record<string, { med: number; mode: string }>>;
  /** Remplissage mesuré par sujet, depuis les réservations chargées : remplace la saisie. */
  fluxRemplissage: Record<string, string>;
}

const champ = "w-full border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-greige focus:ring-2 focus:ring-sand";

function Etiquette({ saisi }: { saisi: boolean }) {
  return (
    <span className={`px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${saisi ? "bg-sky/12 text-sky" : "bg-ochre/12 text-[#8a6a32]"}`}>{saisi ? "saisi" : "estimation"}</span>
  );
}

function Numero({ n, ok }: { n: number; ok: boolean }) {
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-base ${ok ? "bg-sage text-white" : "border border-ink text-ink"}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : n}
    </span>
  );
}

export function FormulaireDonnees({ saisie, marches, sujets, flux, fluxRemplissage }: Props) {
  const [v, setV] = useState(saisie);
  const [etat, setEtat] = useState<"" | "enregistrement" | "ok" | "memoire">("");
  const [enCours, demarrer] = useTransition();
  const [copie, setCopie] = useState(false);
  const enregistre = useRef(JSON.stringify(saisie));

  // Enregistrement automatique : chaque saisie recalcule la page.
  useEffect(() => {
    if (JSON.stringify(v) === enregistre.current) return;
    setEtat("enregistrement");
    const t = setTimeout(() => {
      demarrer(async () => {
        const { ouverture, fermeture, ouv, clic, acces_google_ads, acces_meta, delais, rempl } = v;
        const r = await enregistrerSaisie({ ouverture, fermeture, ouv, clic, acces_google_ads, acces_meta, delais, rempl });
        enregistre.current = JSON.stringify(v);
        setEtat(r.persistant ? "ok" : "memoire");
      });
    }, 600);
    return () => clearTimeout(t);
  }, [v]);

  const maj = <K extends keyof SaisieClient>(k: K, val: SaisieClient[K]) => setV((x) => ({ ...x, [k]: val }));


  const etapes = [
    { ok: Boolean(v.ouverture && v.fermeture), label: "Les dates de la maison" },
    { ok: Number(v.ouv) > 0, label: "Vos newsletters" },
    { ok: v.acces_google_ads || v.acces_meta, label: "Les accès" },
    { ok: Object.values(v.delais).some((x) => Number(x) > 0) || Object.keys(flux).length > 0, label: "Les délais par pays" },
    { ok: Object.values(v.rempl).some((x) => x !== "inconnu") || Object.keys(fluxRemplissage).length > 0, label: "Le remplissage" },
  ];
  const faits = etapes.filter((e) => e.ok).length;

  return (
    <div className="space-y-5">
      <div className="border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="titre-capitales text-lg">
            {faits === etapes.length ? "Tout est renseigné, merci." : `${faits} sur ${etapes.length} renseignés`}
          </p>
          <p className="text-xs text-ink-soft">Chaque information remplace une estimation et affine les dates proposées.</p>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1">
          {etapes.map((e) => (
            <div key={e.label} title={e.label} className={`h-1.5 ${e.ok ? "bg-sage" : "bg-sand"}`} />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`inline-flex items-center gap-1.5 ${etat === "memoire" ? "text-brick" : "text-ink-soft"}`}>
          {etat === "enregistrement" || enCours ? "Recalcul en cours…" : etat === "ok" ? (
            <>
              <Check className="h-4 w-4 text-sage" /> Enregistré, la page est recalculée
            </>
          ) : etat === "memoire" ? (
            "Hébergement en lecture seule : la saisie est gardée en mémoire, sans être conservée."
          ) : saisie.saisi_le ? (
            `Dernière saisie le ${saisie.saisi_le.split("-").reverse().join("/")}`
          ) : (
            "Aucune saisie pour l'instant : tout est estimé."
          )}
        </span>
        <span className="ml-auto flex gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(JSON.stringify({ ...v, maison: "lodge-park" }, null, 1));
              setCopie(true);
              setTimeout(() => setCopie(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 border border-line bg-white px-3.5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] hover:border-ink"
          >
            {copie ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />} Copier la saisie
          </button>
          <button
            onClick={() =>
              demarrer(async () => {
                await revenirAuxEstimations();
                const vide = { ...v, ouverture: "", fermeture: "", ouv: "", clic: "", acces_google_ads: false, acces_meta: false, delais: {}, rempl: {} };
                enregistre.current = JSON.stringify(vide);
                setV(vide);
              })
            }
            className="inline-flex items-center gap-1.5 border border-line bg-white px-3.5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] hover:border-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Revenir aux estimations
          </button>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Colonne 1 */}
        <div className="space-y-5">
          <section className="carte p-6">
            <p className="flex items-center gap-3"><Numero n={1} ok={etapes[0].ok} /><span className="titre-capitales text-lg leading-tight">La maison</span></p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Ouverture
                <input type="date" value={v.ouverture} onChange={(e) => maj("ouverture", e.target.value)} className={`${champ} mt-1`} />
              </label>
              <label className="text-sm">
                Fermeture
                <input type="date" value={v.fermeture} onChange={(e) => maj("fermeture", e.target.value)} className={`${champ} mt-1`} />
              </label>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {v.ouverture && v.fermeture
                ? `Ouverte du ${v.ouverture.split("-").reverse().join("/")} au ${v.fermeture.split("-").reverse().join("/")}. Les sujets hors période sont grisés.`
                : "Sans vos dates, tous les sujets sont supposés ouverts."}
            </p>
          </section>

          <section className="carte p-6">
            <p className="flex items-center gap-3"><Numero n={2} ok={etapes[1].ok} /><span className="titre-capitales text-lg leading-tight">Vos newsletters</span></p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Taux d&apos;ouverture moyen, %
                <input type="number" min="0" max="100" value={v.ouv} onChange={(e) => maj("ouv", e.target.value)} className={`${champ} mt-1`} />
              </label>
              <label className="text-sm">
                Taux de clic moyen, %
                <input type="number" min="0" max="100" step="0.1" value={v.clic} onChange={(e) => maj("clic", e.target.value)} className={`${champ} mt-1`} />
              </label>
            </div>
            <p className="mt-3 text-sm text-ink-soft">Ils servent de ligne de base aux actions CRM en attendant l&apos;export de l&apos;outil d&apos;emailing.</p>
          </section>

          <section className="carte p-6">
            <p className="flex items-center gap-3"><Numero n={3} ok={etapes[2].ok} /><span className="titre-capitales text-lg leading-tight">Accès ouverts</span></p>
            {(
              [
                ["acces_google_ads", "Google Ads, en lecture"],
                ["acces_meta", "Meta Ads, compte publicitaire"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="mt-3 flex cursor-pointer items-center justify-between gap-3 text-sm">
                {label}
                <input type="checkbox" checked={v[k]} onChange={(e) => maj(k, e.target.checked)} className="h-4 w-4 accent-[#4c3327]" />
              </label>
            ))}
            <p className="mt-3 text-sm text-ink-soft">Sans accès, les actions payantes restent bloquées dans la liste « À faire ».</p>
          </section>
        </div>

        {/* Colonne 2 */}
        <section className="carte p-6">
          <p className="flex items-center gap-3"><Numero n={4} ok={etapes[3].ok} /><span className="titre-capitales text-lg leading-tight">Combien de semaines avant l&apos;arrivée vos clients réservent-ils ?</span></p>
          <p className="mt-1 text-sm text-ink-soft">En médiane, par pays. Vide = notre estimation.</p>
          <div className="mt-4 space-y-2.5">
            {marches.map((m) => {
              const f = flux[m.id];
              const saisi = Number(v.delais[m.id]) > 0;
              return (
                <label key={m.id} className="flex items-center gap-3 text-sm">
                  <span className="flex flex-1 items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
                    {m.nom}
                  </span>
                  {f ? (
                    <span className="flex items-center gap-2">
                      <span className="w-20 border border-line bg-sand px-3 py-2 text-right">{String(f.med).replace(".", ",")}</span>
                      <span className="rounded bg-sage/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-sage">flux {f.mode}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        max="40"
                        step="0.5"
                        value={v.delais[m.id] ?? ""}
                        placeholder={String(m.delai_semaines).replace(".", ",")}
                        onChange={(e) => maj("delais", { ...v.delais, [m.id]: e.target.value })}
                        className="w-20 border border-line bg-white px-3 py-2 text-right outline-none focus:border-greige"
                      />
                      <Etiquette saisi={saisi} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-ink-soft">Dès qu&apos;un fichier de réservations est chargé (ou qu&apos;Asterio est branché), les délais mesurés remplacent la saisie sans rien changer d&apos;autre.</p>
        </section>

        {/* Colonne 3 */}
        <section className="carte p-6">
          <p className="flex items-center gap-3"><Numero n={5} ok={etapes[4].ok} /><span className="titre-capitales text-lg leading-tight">Où en est le remplissage, à ce jour ?</span></p>
          <p className="mt-1 text-sm text-ink-soft">Un sujet déjà bien vendu voit ses actions payantes suspendues.</p>
          <div className="mt-4 space-y-3">
            {sujets.map((s) => (
              <label key={s.id} className="block text-sm">
                {s.nom}
                {fluxRemplissage[s.id] && (
                  <span className="mt-1 flex items-center gap-2 border border-sage/40 bg-sage/8 px-3 py-2 text-xs text-sage">
                    <span className="font-semibold uppercase tracking-wide">réservations</span> {fluxRemplissage[s.id]}
                  </span>
                )}
                <select
                  hidden={Boolean(fluxRemplissage[s.id])}
                  value={v.rempl[s.id] ?? "inconnu"}
                  onChange={(e) => maj("rempl", { ...v.rempl, [s.id]: e.target.value as Remplissage })}
                  className={`${champ} mt-1`}
                >
                  <option value="inconnu">Inconnu</option>
                  <option value="bas">Bas</option>
                  <option value="normal">Comme l&apos;an dernier</option>
                  <option value="plein">Déjà bien vendu</option>
                </select>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
