"use client";

import {
  ArrowDown,
  ArrowRight,
  BedDouble,
  Building2,
  Bell,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CloudRain,
  FileText,
  Gauge,
  Home,
  ListChecks,
  Mail,
  MousePointerClick,
  PenLine,
  School,
  Search,
  ShieldCheck,
  Snowflake,
  TrendingUp,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { deposerTrace, importerReservations } from "@/app/actions";
import { ETAPES_AGENT, FAMILLES, LIBELLE_ETAT, SORTIES, SOURCES_FLUX, type EtatFlux, type FamilleFlux, type SortieId, type SourceFlux } from "@/lib/flux";
import type { TraceDepot } from "@/lib/types";

/** État réel de chaque source, calculé par la page. */
export interface EtatSource {
  etat: EtatFlux;
  /** Dernier relevé, en clair (« relevé du 19 sept. 2026 : … »). */
  releve?: string;
  depot?: TraceDepot;
}

const ICONES: Record<string, LucideIcon> = {
  reservations: BedDouble,
  newsletters: Mail,
  maison: Home,
  semrush: TrendingUp,
  gsc: Search,
  ga4: Users,
  meteo: Snowflake,
  meteo_depart: CloudRain,
  agenda: CalendarDays,
  vacances: School,
  google_ads: MousePointerClick,
  meta: Camera,
};
const ICONES_SORTIE: Record<SortieId, LucideIcon> = { afaire: ListChecks, calendrier: CalendarRange, fiches: FileText, alertes: Bell, briefs: PenLine, mesure: Gauge, portraits: Building2 };
const COULEUR_ETAT: Record<EtatFlux, string> = { branche: "bg-sage", pret: "bg-ochre", a_fournir: "bg-brick" };

interface Trace {
  id: string;
  d: string;
  source?: string;
  sortie?: SortieId;
}

export function FluxDonnees({ etats }: { etats: Record<string, EtatSource> }) {
  const zone = useRef<HTMLDivElement>(null);
  const agent = useRef<HTMLDivElement>(null);
  const noeuds = useRef(new Map<string, HTMLElement>());
  const [traces, setTraces] = useState<Trace[]>([]);
  const [survol, setSurvol] = useState<{ source?: string; sortie?: SortieId } | null>(null);
  const [ouverte, setOuverte] = useState<SourceFlux | null>(null);
  const [mouvement, setMouvement] = useState(true);

  const enregistrer = useCallback(
    (cle: string) => (el: HTMLElement | null) => {
      if (el) noeuds.current.set(cle, el);
      else noeuds.current.delete(cle);
    },
    [],
  );

  // Tracé des liens : mesuré sur la mise en page réelle, recalculé au redimensionnement.
  useLayoutEffect(() => {
    const z = zone.current;
    const a = agent.current;
    if (!z || !a) return;
    const tracer = () => {
      if (getComputedStyle(z).display === "none" || window.innerWidth < 1024) return setTraces([]);
      const rz = z.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      const courbe = (x1: number, y1: number, x2: number, y2: number) => {
        const m = (x2 - x1) / 2;
        return `M ${x1} ${y1} C ${x1 + m} ${y1}, ${x2 - m} ${y2}, ${x2} ${y2}`;
      };
      const t: Trace[] = [];
      SOURCES_FLUX.forEach((s, i) => {
        const el = noeuds.current.get(`s:${s.id}`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const yA = ra.top + ra.height * ((i + 1) / (SOURCES_FLUX.length + 1)) * 0.8 + ra.height * 0.1;
        t.push({ id: `s:${s.id}`, source: s.id, d: courbe(r.right - rz.left, r.top + r.height / 2 - rz.top, ra.left - rz.left, yA - rz.top) });
      });
      SORTIES.forEach((o, i) => {
        const el = noeuds.current.get(`o:${o.id}`);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const yA = ra.top + ra.height * (0.2 + (0.6 * i) / Math.max(1, SORTIES.length - 1));
        t.push({ id: `o:${o.id}`, sortie: o.id, d: courbe(ra.right - rz.left, yA - rz.top, r.left - rz.left, r.top + r.height / 2 - rz.top) });
      });
      setTraces(t);
    };
    tracer();
    const ro = new ResizeObserver(tracer);
    ro.observe(z);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maj = () => setMouvement(!mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  // Ce qui est mis en avant : une source et ce qu'elle nourrit, ou un résultat et les sources qui l'alimentent.
  const actif = survol ?? (ouverte ? { source: ouverte.id } : null);
  const sourcesActives = new Set<string>(
    actif?.source ? [actif.source] : actif?.sortie ? SOURCES_FLUX.filter((s) => s.nourrit.includes(actif.sortie!)).map((s) => s.id) : [],
  );
  const sortiesActives = new Set<SortieId>(
    actif?.source ? (SOURCES_FLUX.find((s) => s.id === actif.source)?.nourrit ?? []) : actif?.sortie ? [actif.sortie] : [],
  );
  const estActif = (t: Trace) => (t.source ? sourcesActives.has(t.source) : sortiesActives.has(t.sortie!));

  const familles = Object.keys(FAMILLES) as FamilleFlux[];

  return (
    <section className="carte overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
        <div>
          <p className="text-xs font-medium text-taupe">Comment fonctionne l&apos;agent</p>
          <h2 className="mt-1 text-base font-semibold">De vos données à vos actions</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Chaque source répond à une question simple. Cliquez sur l&apos;une d&apos;elles pour voir ce que l&apos;agent en tire, et y déposer un fichier.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          {(Object.keys(LIBELLE_ETAT) as EtatFlux[]).map((e) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${COULEUR_ETAT[e]}`} /> {LIBELLE_ETAT[e]}
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={zone}
        className="relative grid grid-cols-1 gap-6 px-5 py-7 sm:px-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)_minmax(0,0.75fr)] lg:gap-x-16 xl:gap-x-24"
        onMouseLeave={() => setSurvol(null)}
      >
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" aria-hidden>
          {traces.map((t) => {
            const on = estActif(t);
            const attenue = actif && !on;
            return (
              <g key={t.id} className="transition-opacity duration-300" style={{ opacity: attenue ? 0.18 : 1 }}>
                <path d={t.d} fill="none" stroke={on ? "var(--color-cognac)" : "var(--color-greige)"} strokeWidth={on ? 1.8 : 1} className={mouvement ? "flux-trait" : ""} strokeDasharray="4 6" />
                {on && mouvement && (
                  <circle r="3.2" fill="var(--color-cognac)">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={t.d} />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* 1. Les sources */}
        <div className="relative space-y-5">
          <p className="titre-colonne">1 · Vos sources</p>
          {familles.map((f) => (
            <div key={f}>
              <p className="mb-2 text-xs font-medium text-taupe">{FAMILLES[f]}</p>
              <div className="space-y-2">
                {SOURCES_FLUX.filter((s) => s.famille === f).map((s) => {
                  const I = ICONES[s.id] ?? FileText;
                  const etat = etats[s.id]?.etat ?? s.etat;
                  const on = sourcesActives.has(s.id);
                  return (
                    <button
                      key={s.id}
                      ref={enregistrer(`s:${s.id}`)}
                      onMouseEnter={() => setSurvol({ source: s.id })}
                      onFocus={() => setSurvol({ source: s.id })}
                      onBlur={() => setSurvol(null)}
                      onClick={() => setOuverte(s)}
                      className={`group flex w-full items-center gap-3 border bg-white px-3 py-2.5 text-left transition ${
                        on ? "border-cognac shadow-[0_4px_18px_-10px_rgba(164,108,69,0.6)]" : "border-line hover:border-greige"
                      } ${actif && !on ? "opacity-55" : ""}`}
                    >
                      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${on ? "border-cognac bg-cognac text-white" : "border-line bg-cream text-ink"} transition`}>
                        <I className="h-4 w-4" strokeWidth={1.6} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {s.nom}
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COULEUR_ETAT[etat]}`} title={LIBELLE_ETAT[etat]} />
                        </span>
                        <span className="line-clamp-2 block text-xs text-ink-soft lg:truncate">{s.question}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-greige opacity-0 transition group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <ArrowDown className="mx-auto h-5 w-5 text-greige lg:hidden" />

        {/* 2. L'agent */}
        <div className="relative lg:self-center">
          <p className="titre-colonne">2 · L&apos;agent travaille</p>
          <div ref={agent} className="relative overflow-hidden bg-nuit px-5 py-6 text-cream">
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(/lodge/lp-3.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
            <div className="relative">
              <p className="text-xs font-medium text-cream/60">Chaque lundi, 6 h</p>
              <p className="mt-1 text-base font-semibold">L&apos;agent Sibuet</p>
              <ol className="mt-5 space-y-4">
                {ETAPES_AGENT.map((e, i) => (
                  <li key={e.titre} className="flex gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.7rem] ${
                        i === ETAPES_AGENT.length - 1 ? "border-cognac bg-cognac text-white" : "border-cream/40"
                      }`}
                    >
                      {i === ETAPES_AGENT.length - 1 ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{e.titre}</span>
                      <span className="block text-xs leading-relaxed text-cream/70">{e.texte}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <ArrowDown className="mx-auto h-5 w-5 text-greige lg:hidden" />

        {/* 3. Ce que vous recevez */}
        <div className="relative space-y-2 lg:self-center">
          <p className="titre-colonne">3 · Vous recevez</p>
          {SORTIES.map((o) => {
            const I = ICONES_SORTIE[o.id];
            const on = sortiesActives.has(o.id);
            return (
              <Link
                key={o.id}
                href={o.lien}
                ref={enregistrer(`o:${o.id}`)}
                onMouseEnter={() => setSurvol({ sortie: o.id })}
                onFocus={() => setSurvol({ sortie: o.id })}
                onBlur={() => setSurvol(null)}
                className={`flex items-center gap-3 border px-3 py-2.5 transition ${on ? "border-cognac bg-white" : "border-line bg-sand/40 hover:bg-white"} ${
                  actif && !on ? "opacity-55" : ""
                }`}
              >
                <I className={`h-4 w-4 shrink-0 ${on ? "text-cognac" : "text-taupe"}`} strokeWidth={1.6} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{o.nom}</span>
                  <span className="block text-xs text-ink-soft">{o.texte}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Tiroir source={ouverte} etat={ouverte ? etats[ouverte.id] : undefined} fermer={() => setOuverte(null)} />
    </section>
  );
}

function Tiroir({ source, etat, fermer }: { source: SourceFlux | null; etat?: EtatSource; fermer: () => void }) {
  const bouton = useRef<HTMLButtonElement>(null);
  const [affichee, setAffichee] = useState<SourceFlux | null>(source);
  if (source && source !== affichee) setAffichee(source);

  useEffect(() => {
    if (!source) return;
    bouton.current?.focus();
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [source, fermer]);

  const s = affichee;
  const ouvert = Boolean(source);
  const I = s ? (ICONES[s.id] ?? FileText) : FileText;
  const e = s ? (etat?.etat ?? s.etat) : "a_fournir";
  const sorties = s ? SORTIES.filter((o) => s.nourrit.includes(o.id)) : [];

  return (
    <div className={`fixed inset-0 z-50 ${ouvert ? "" : "pointer-events-none"}`} aria-hidden={!ouvert}>
      <div onClick={fermer} className={`absolute inset-0 bg-ink/35 transition-opacity duration-300 ${ouvert ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={s?.nom}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col bg-cream shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          ouvert ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {s && (
          <>
            <div className="flex items-start gap-4 border-b border-line bg-white px-6 py-5">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-nuit text-cream">
                <I className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-taupe">{FAMILLES[s.famille]}</p>
                <h3 className="text-[0.9375rem] font-semibold leading-tight">{s.nom}</h3>
                <p className="mt-1 text-sm font-semibold italic text-ink-soft">« {s.question} »</p>
              </div>
              <button ref={bouton} onClick={fermer} className="-mr-2 p-2 text-ink-soft hover:text-ink" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1 text-xs font-semibold">
                  <span className={`h-2 w-2 rounded-full ${COULEUR_ETAT[e]}`} /> {LIBELLE_ETAT[e]}
                </span>
                <span className="text-xs text-ink-soft">Mise à jour : {s.cadence}</span>
              </div>
              <p className="-mt-3 text-sm text-ink-soft">{s.etatDetail}</p>
              {etat?.releve && <p className="-mt-3 text-xs text-taupe">{etat.releve}</p>}

              <Bloc titre="Ce qu'on récupère">
                <ul className="flex flex-wrap gap-1.5">
                  {s.recupere.map((x) => (
                    <li key={x} className="rounded-xl border border-line bg-white px-2.5 py-1 text-xs">
                      {x}
                    </li>
                  ))}
                </ul>
                {s.jamais && (
                  <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    <span>
                      <span className="font-semibold text-ink">Jamais : </span>
                      {s.jamais.join(", ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}.
                    </span>
                  </p>
                )}
              </Bloc>

              <Bloc titre="Pourquoi">
                <p className="text-sm leading-relaxed">{s.pourquoi}</p>
              </Bloc>

              <Bloc titre="Ce que l'agent en fait">
                <ol className="space-y-2">
                  {s.traitement.map((x, i) => (
                    <li key={x} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink/30 text-[0.65rem]">{i + 1}</span>
                      {x}
                    </li>
                  ))}
                </ol>
              </Bloc>

              <div className="rounded-lg bg-cognac/8 px-4 py-3">
                <p className="text-xs font-medium text-cognac">Exemple de lecture</p>
                <p className="mt-1 font-display text-[1.05rem] leading-snug">{s.exemple}</p>
              </div>

              <Bloc titre="Où vous le voyez">
                <ul className="flex flex-wrap gap-1.5">
                  {sorties.map((o) => {
                    const J = ICONES_SORTIE[o.id];
                    return (
                      <li key={o.id}>
                        <Link href={o.lien} onClick={fermer} className="inline-flex items-center gap-1.5 border border-line bg-sand/50 px-2.5 py-1 text-xs hover:border-ink">
                          <J className="h-3.5 w-3.5 text-taupe" /> {o.nom}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Bloc>

              {s.depot ? (
                <DepotSource key={s.id} source={s} trace={etat?.depot} />
              ) : s.id === "maison" ? (
                <Link href="/donnees" onClick={fermer} className="bouton inline-flex items-center gap-2">
                  Remplir Vos données <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <p className="flex items-center gap-2 border border-dashed border-line px-4 py-3 text-sm text-ink-soft">
                  <Check className="h-4 w-4 text-sage" /> Rien à déposer : cette source se met à jour seule.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-taupe">{titre}</p>
      {children}
    </div>
  );
}

function DepotSource({ source, trace }: { source: SourceFlux; trace?: TraceDepot }) {
  const reservations = source.depot === "reservations";
  const [etat, envoyer, envoi] = useActionState(reservations ? importerReservations : deposerTrace, null);
  const [survol, setSurvol] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const choisir = (liste: FileList) => {
    if (!liste.length || !input.current) return;
    const dt = new DataTransfer();
    for (const f of reservations ? [...liste] : [liste[0]]) dt.items.add(f);
    input.current.files = dt.files;
    form.current?.requestSubmit();
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-taupe">Déposer un fichier</p>
      <form ref={form} action={envoyer}>
        <input type="hidden" name="source" value={source.id} />
        <input ref={input} type="file" name="fichier" accept=".xlsx,.csv,.txt" multiple={reservations} className="sr-only" onChange={(e) => e.target.files?.[0] && form.current?.requestSubmit()} />
        <button
          type="button"
          disabled={envoi}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            choisir(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center gap-1.5 border border-dashed px-4 py-6 text-center transition disabled:opacity-60 ${
            survol ? "border-cognac bg-white" : "border-greige bg-white/60 hover:bg-white"
          }`}
        >
          <Upload className={`h-5 w-5 text-cognac ${envoi ? "animate-bounce" : ""}`} />
          <span className="text-sm font-semibold">{envoi ? "Lecture du fichier…" : "Déposez le fichier ici, ou cliquez"}</span>
          <span className="text-xs text-ink-soft">{source.formats}, 7 Mo au plus</span>
        </button>
      </form>
      {etat && <p className={`mt-2 text-sm ${etat.ok ? "text-sage" : "text-brick"}`}>{etat.message}</p>}
      {etat?.ok && reservations && (
        <Link href="/donnees" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          Voir ce que l&apos;agent en a tiré <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {!etat && trace && (
        <p className="mt-2 text-xs text-ink-soft">
          Dernier fichier reçu : {trace.fichier}, le {trace.recu_le.split("-").reverse().join("/")}, {trace.colonnes.length} colonnes ({trace.colonnes.slice(0, 5).join(", ")}
          {trace.colonnes.length > 5 ? "…" : ""}).
        </p>
      )}
      <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
        {reservations
          ? "Le fichier est lu puis oublié : seuls des totaux par pays et par semaine sont gardés."
          : "Seuls le nom du fichier et ses en-têtes de colonnes sont gardés, pour préparer le branchement sur votre format exact."}
      </p>
    </div>
  );
}
