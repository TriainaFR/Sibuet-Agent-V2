"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Graphiques du design system. Règles : marques fines (traits de 2 px, barres de 24 px au plus,
// bouts arrondis de 4 px), grilles en filet plein, une seule échelle, couleur portée par l'entité
// (accent de la maison pour la saison en cours, greige pour l'année précédente), texte toujours
// dans les encres du texte, survol avec info-bulle, et un tableau des chiffres pour chaque graphique.
// ─────────────────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("fr-FR");
export const nombreFr = (n: number) => fmt.format(Math.round(n));
export const pourcent = (p: number) => `${Math.round(p * 100)} %`;

/** Unités d'affichage (les fonctions ne passent pas du serveur au client). */
export type Unite = "nombre" | "pourcent" | "jours";
const formater = (u: Unite) => (u === "pourcent" ? pourcent : u === "jours" ? (v: number) => `${Math.round(v)} j` : nombreFr);

function useLargeur<T extends HTMLElement>(defaut = 640) {
  const ref = useRef<T>(null);
  const [largeur, setLargeur] = useState(defaut);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maj = () => setLargeur(Math.max(240, el.clientWidth));
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largeur] as const;
}

/** Graduations « propres » (0, 250, 500…) pour un maximum donné. */
function graduations(max: number, cible = 4) {
  if (max <= 0) return [0, 1];
  const brut = max / cible;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= brut) ?? brut;
  const t: number[] = [];
  for (let v = 0; v <= max + pas * 0.001; v += pas) t.push(Math.round(v * 1000) / 1000);
  if (t.at(-1)! < max) t.push(t.at(-1)! + pas);
  return t;
}

function InfoBulle({ x, y, largeur, children }: { x: number; y: number; largeur: number; children: ReactNode }) {
  const gauche = x > largeur - 200;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-[0_8px_24px_-12px_rgba(47,47,43,0.35)]"
      style={{ left: gauche ? undefined : x + 14, right: gauche ? largeur - x + 14 : undefined, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  );
}

/** Légende : trait pour les courbes, carré pour les aires et barres. */
export function Legende({ items, forme = "trait" }: { items: { nom: string; couleur: string }[]; forme?: "trait" | "carre" }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((i) => (
        <li key={i.nom} className="inline-flex items-center gap-1.5">
          {forme === "trait" ? <span className="h-[2px] w-4 rounded-full" style={{ background: i.couleur }} /> : <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: i.couleur }} />}
          {i.nom}
        </li>
      ))}
    </ul>
  );
}

/** Tableau des chiffres, replié : la donnée reste lisible sans survol ni couleur. */
export function TableauChiffres({ colonnes, lignes, titre = "Voir les chiffres" }: { colonnes: string[]; lignes: (string | number)[][]; titre?: string }) {
  return (
    <details className="mt-3 text-xs text-ink-soft">
      <summary className="cursor-pointer select-none font-semibold text-ink-soft hover:text-ink">{titre}</summary>
      <div className="mt-2 max-h-72 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {colonnes.map((c, i) => (
                <th key={c} className={`border-b border-line py-1.5 pr-3 font-semibold text-ink ${i ? "text-right" : "text-left"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i} className="border-b border-line/60">
                {l.map((v, j) => (
                  <td key={j} className={`py-1.5 pr-3 ${j ? "text-right tabular-nums" : ""}`}>
                    {typeof v === "number" ? nombreFr(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── Courbes ──────────────────────────────────────────────────────────────────

export interface Serie {
  id: string;
  nom: string;
  couleur: string;
  points: { x: number; y: number | null }[];
  /** Voile sous la courbe (série principale). */
  aire?: boolean;
}

export function Courbes({
  series,
  ticksX,
  libellesX,
  unite = "nombre",
  hauteur = 240,
  yMax,
  repere,
  ariaLabel,
}: {
  series: Serie[];
  ticksX: { x: number; libelle: string }[];
  /** Libellé de chaque x dans l'info-bulle (sinon celui de la graduation, sinon la valeur). */
  libellesX?: { x: number; libelle: string }[];
  unite?: Unite;
  hauteur?: number;
  yMax?: number;
  /** Repère vertical (par exemple « aujourd'hui l'an dernier »). */
  repere?: { x: number; libelle: string };
  ariaLabel: string;
}) {
  const [ref, largeur] = useLargeur<HTMLDivElement>();
  const [survol, setSurvol] = useState<number | null>(null);
  const id = useId();
  const formatY = formater(unite);
  const libelleX = (x: number) => libellesX?.find((l) => l.x === x)?.libelle ?? ticksX.find((t) => t.x === x)?.libelle ?? String(x);
  const m = { g: 44, d: 14, h: 12, b: 26 };
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  const xMin = Math.min(...xs, ...ticksX.map((t) => t.x));
  const xMax = Math.max(...xs, ...ticksX.map((t) => t.x));
  const max = yMax ?? Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y ?? 0)));
  const t = yMax !== undefined ? graduations(yMax) : graduations(max);
  const haut = t.at(-1)!;
  const X = (x: number) => m.g + ((x - xMin) / Math.max(1, xMax - xMin)) * (largeur - m.g - m.d);
  const Y = (y: number) => m.h + (1 - y / haut) * (hauteur - m.h - m.b);
  const chemin = (pts: Serie["points"]) => {
    let d = "";
    let leve = true;
    for (const p of pts) {
      if (p.y === null) {
        leve = true;
        continue;
      }
      d += `${leve ? "M" : "L"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`;
      leve = false;
    }
    return d;
  };
  const proche = (px: number) => xs.reduce((a, b) => (Math.abs(X(b) - px) < Math.abs(X(a) - px) ? b : a), xs[0]);

  return (
    <div className="graphique">
      {series.length > 1 && (
        <div className="mb-2">
          <Legende items={series} />
        </div>
      )}
      <div ref={ref} className="relative">
        <svg
          width={largeur}
          height={hauteur}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setSurvol(proche(e.clientX - r.left));
          }}
          onPointerLeave={() => setSurvol(null)}
          className="block touch-none"
        >
          <defs>
            {series
              .filter((s) => s.aire)
              .map((s) => (
                <linearGradient key={s.id} id={`${id}-${s.id}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={s.couleur} stopOpacity="0.14" />
                  <stop offset="1" stopColor={s.couleur} stopOpacity="0.02" />
                </linearGradient>
              ))}
          </defs>
          {t.map((v) => (
            <g key={v}>
              <line x1={m.g} x2={largeur - m.d} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={m.g - 8} y={Y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-ink-soft)">
                {formatY(v)}
              </text>
            </g>
          ))}
          {ticksX.map((tk) => (
            <text key={tk.x} x={X(tk.x)} y={hauteur - 6} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
              {tk.libelle}
            </text>
          ))}
          {repere && (
            <g>
              <line x1={X(repere.x)} x2={X(repere.x)} y1={m.h} y2={hauteur - m.b} stroke="var(--color-ink)" strokeWidth="1" />
              <text x={X(repere.x) + 6} y={m.h + 10} fontSize="11" fill="var(--color-ink)">
                {repere.libelle}
              </text>
            </g>
          )}
          {series.map((s) => (
            <g key={s.id} className="graphique-entree">
              {s.aire && (
                <path
                  d={`${chemin(s.points)}L${X(s.points.filter((p) => p.y !== null).at(-1)?.x ?? xMax)},${Y(0)}L${X(s.points.find((p) => p.y !== null)?.x ?? xMin)},${Y(0)}Z`}
                  fill={`url(#${id}-${s.id})`}
                />
              )}
              <path d={chemin(s.points)} fill="none" stroke={s.couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {(() => {
                const fin = s.points.filter((p) => p.y !== null).at(-1);
                return fin ? <circle cx={X(fin.x)} cy={Y(fin.y!)} r="4" fill={s.couleur} stroke="#fff" strokeWidth="2" /> : null;
              })()}
            </g>
          ))}
          {survol !== null && (
            <g>
              <line x1={X(survol)} x2={X(survol)} y1={m.h} y2={hauteur - m.b} stroke="var(--color-greige)" strokeWidth="1" />
              {series.map((s) => {
                const p = s.points.find((q) => q.x === survol);
                return p && p.y !== null ? <circle key={s.id} cx={X(survol)} cy={Y(p.y)} r="4.5" fill={s.couleur} stroke="#fff" strokeWidth="2" /> : null;
              })}
            </g>
          )}
        </svg>
        {survol !== null && (
          <InfoBulle x={X(survol)} y={m.h} largeur={largeur}>
            <p className="mb-1 font-semibold text-ink">{libelleX(survol)}</p>
            {series.map((s) => {
              const p = s.points.find((q) => q.x === survol);
              return (
                <p key={s.id} className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-ink-soft">
                    <span className="h-[2px] w-3 rounded-full" style={{ background: s.couleur }} />
                    {s.nom}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{p && p.y !== null ? formatY(p.y) : "n.d."}</span>
                </p>
              );
            })}
          </InfoBulle>
        )}
      </div>
    </div>
  );
}

// ── Barres horizontales ──────────────────────────────────────────────────────

export function BarresH({
  items,
  unite = "nombre",
  couleur = "var(--maison-accent)",
  max,
}: {
  items: { id: string; libelle: string; valeur: number; note?: string; attenue?: boolean }[];
  unite?: Unite;
  couleur?: string;
  max?: number;
}) {
  const haut = max ?? Math.max(1, ...items.map((i) => i.valeur));
  const [survol, setSurvol] = useState<string | null>(null);
  const format = formater(unite);
  return (
    <ul className="graphique space-y-1.5" onPointerLeave={() => setSurvol(null)}>
      {items.map((i) => (
        <li
          key={i.id}
          tabIndex={0}
          onPointerEnter={() => setSurvol(i.id)}
          onFocus={() => setSurvol(i.id)}
          onBlur={() => setSurvol(null)}
          className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 outline-none sm:grid-cols-[minmax(0,10rem)_1fr]"
        >
          <span className={`truncate text-sm ${survol === i.id ? "text-ink" : "text-ink-soft"}`} title={i.libelle}>
            {i.libelle}
          </span>
          <span className="relative flex h-5 items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] transition-[width,opacity] duration-500"
              style={{ width: `${Math.max(0.5, (i.valeur / haut) * 82)}%`, background: couleur, opacity: i.attenue ? 0.35 : survol && survol !== i.id ? 0.55 : 1 }}
            />
            <span className="whitespace-nowrap text-xs tabular-nums text-ink">{format(i.valeur)}</span>
            {survol === i.id && i.note && <span className="truncate text-xs text-ink-soft">· {i.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Barres empilées à 100 % ──────────────────────────────────────────────────

export function Empile({
  lignes,
  categories,
}: {
  lignes: { id: string; libelle: string; valeurs: Record<string, number> }[];
  categories: { id: string; nom: string; couleur: string }[];
}) {
  const [survol, setSurvol] = useState<{ ligne: string; cat: string } | null>(null);
  const presentes = categories.filter((c) => lignes.some((l) => (l.valeurs[c.id] ?? 0) > 0));
  return (
    <div className="graphique">
      <div className="mb-3">
        <Legende items={presentes} forme="carre" />
      </div>
      <ul className="space-y-2.5">
        {lignes.map((l) => {
          const total = presentes.reduce((s, c) => s + (l.valeurs[c.id] ?? 0), 0);
          return (
            <li key={l.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_1fr]">
              <span className="truncate text-sm text-ink-soft">{l.libelle}</span>
              <span className="flex h-6 gap-[2px] overflow-hidden rounded-[4px]" onPointerLeave={() => setSurvol(null)}>
                {presentes.map((c) => {
                  const v = l.valeurs[c.id] ?? 0;
                  if (!v || !total) return null;
                  const p = v / total;
                  const actif = survol?.ligne === l.id && survol.cat === c.id;
                  return (
                    <span
                      key={c.id}
                      tabIndex={0}
                      title={`${c.nom} : ${pourcent(p)} (${nombreFr(v)} nuitées)`}
                      onPointerEnter={() => setSurvol({ ligne: l.id, cat: c.id })}
                      onFocus={() => setSurvol({ ligne: l.id, cat: c.id })}
                      className="relative flex items-center justify-center text-[0.68rem] font-semibold text-white outline-none transition-opacity"
                      style={{ width: `${p * 100}%`, background: c.couleur, opacity: survol && !actif && survol.ligne === l.id ? 0.6 : 1 }}
                    >
                      {p >= 0.09 ? pourcent(p) : ""}
                    </span>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 h-4 text-xs text-ink-soft" aria-live="polite">
        {survol &&
          (() => {
            const l = lignes.find((x) => x.id === survol.ligne)!;
            const c = presentes.find((x) => x.id === survol.cat)!;
            const total = presentes.reduce((s, k) => s + (l.valeurs[k.id] ?? 0), 0);
            return `${l.libelle} · ${c.nom} : ${pourcent((l.valeurs[c.id] ?? 0) / total)}, ${nombreFr(l.valeurs[c.id] ?? 0)} nuitées`;
          })()}
      </p>
    </div>
  );
}

// ── Carte de chaleur : mois de séjour × mois de réservation ─────────────────

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function Chaleur({ matrice, lignes }: { matrice: number[][]; lignes: number[] }) {
  const [survol, setSurvol] = useState<{ l: number; c: number } | null>(null);
  // Part de chaque mois de réservation dans les nuitées du mois de séjour (lecture par ligne).
  const parts = matrice.map((ligne) => {
    const t = ligne.reduce((a, b) => a + b, 0);
    return ligne.map((v) => (t ? v / t : 0));
  });
  const paliers = [0.02, 0.06, 0.12, 0.2, 0.3];
  const teinte = (p: number) => {
    const i = paliers.findIndex((x) => p < x);
    const niveau = i === -1 ? paliers.length : i;
    return niveau === 0 ? "var(--color-sand)" : `color-mix(in srgb, var(--maison-accent) ${[0, 14, 30, 48, 68, 90][niveau]}%, white)`;
  };
  return (
    <div className="graphique">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-20 text-left text-xs font-medium text-taupe">Séjour ↓ Résa →</th>
              {MOIS_COURTS.map((m, i) => (
                <th key={m} className={`text-center text-[0.68rem] font-normal ${survol?.c === i ? "text-ink" : "text-ink-soft"}`}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody onPointerLeave={() => setSurvol(null)}>
            {lignes.map((l) => (
              <tr key={l}>
                <td className={`pr-2 text-xs ${survol?.l === l ? "text-ink" : "text-ink-soft"}`}>{MOIS_COURTS[l]}</td>
                {parts[l].map((p, c) => (
                  <td
                    key={c}
                    tabIndex={0}
                    onPointerEnter={() => setSurvol({ l, c })}
                    onFocus={() => setSurvol({ l, c })}
                    className="h-7 rounded-[3px] outline-none transition-[outline] focus:outline-2 focus:outline-ink"
                    style={{ background: teinte(p), outline: survol?.l === l && survol.c === c ? "2px solid var(--color-ink)" : undefined }}
                    title={`Séjours de ${MOIS_COURTS[l]} réservés en ${MOIS_COURTS[c]} : ${pourcent(p)}`}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span aria-live="polite" className="min-h-4">
          {survol
            ? `Séjours de ${MOIS_COURTS[survol.l]} réservés en ${MOIS_COURTS[survol.c]} : ${pourcent(parts[survol.l][survol.c])} des nuitées (${nombreFr(matrice[survol.l][survol.c])})`
            : "Chaque ligne se lit seule : la part des nuitées du mois de séjour réservée chaque mois."}
        </span>
        <span className="inline-flex items-center gap-1">
          moins
          {[0.01, 0.04, 0.09, 0.16, 0.25, 0.4].map((p) => (
            <span key={p} className="h-2.5 w-4 rounded-[2px]" style={{ background: teinte(p) }} />
          ))}
          plus
        </span>
      </div>
    </div>
  );
}

// ── Délais de réservation : quartiles par pays ───────────────────────────────

export function Delais({ lignes, max }: { lignes: { id: string; libelle: string; q1: number; med: number; q3: number; n: number }[]; max?: number }) {
  const haut = max ?? Math.max(4, ...lignes.map((l) => l.q3));
  const t = graduations(haut, 4);
  const fin = t.at(-1)!;
  const [survol, setSurvol] = useState<string | null>(null);
  const pct = (v: number) => `${(v / fin) * 100}%`;
  return (
    <div className="graphique">
      <ul className="space-y-2" onPointerLeave={() => setSurvol(null)}>
        {lignes.map((l) => (
          <li
            key={l.id}
            tabIndex={0}
            onPointerEnter={() => setSurvol(l.id)}
            onFocus={() => setSurvol(l.id)}
            className="grid grid-cols-[minmax(0,8rem)_1fr_3.5rem] items-center gap-3 outline-none sm:grid-cols-[minmax(0,9.5rem)_1fr_4rem]"
          >
            <span className={`truncate text-sm ${survol === l.id ? "text-ink" : "text-ink-soft"}`}>{l.libelle}</span>
            <span className="relative h-5">
              <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <span className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ left: pct(l.q1), width: `calc(${pct(l.q3 - l.q1)} + 2px)`, background: "color-mix(in srgb, var(--maison-accent) 28%, white)" }} />
              <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: pct(l.med), background: "var(--maison-accent)" }} />
            </span>
            <span className="text-right text-xs tabular-nums text-ink">{Math.round(l.med)} j</span>
            {survol === l.id && (
              <span className="col-span-3 -mt-1 text-xs text-ink-soft sm:col-start-2">
                La moitié réserve entre {Math.round(l.q1)} et {Math.round(l.q3)} jours avant l&apos;arrivée, médiane {Math.round(l.med)} jours ({l.n} séjours).
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-1 grid grid-cols-[minmax(0,8rem)_1fr_3.5rem] gap-3 sm:grid-cols-[minmax(0,9.5rem)_1fr_4rem]">
        <span />
        <span className="relative h-4 text-[0.68rem] text-ink-soft">
          {t.map((v) => (
            <span key={v} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(v) }}>
              {v} j
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
