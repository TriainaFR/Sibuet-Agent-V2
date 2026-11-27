import Link from "next/link";
import { Courbes } from "@/components/graphiques";
import { COULEUR_N1 } from "@/lib/da";
import { diffDays, formatDate, formatRange } from "@/lib/dates";
import type { VerdictSujet } from "@/lib/engine/rejeu";
import { urgenceLibelle } from "@/lib/format";
import { Niveau } from "./ui";

// Saison rejouée : ce qui s'est passé ensuite, connu parce que la saison est terminée.

const fmt = new Intl.NumberFormat("fr-FR");
const ecart = (a: number, b: number) => (b ? a / b - 1 : null);
const signe = (e: number | null) => (e === null ? "n.d." : `${e >= 0 ? "+" : "−"}${Math.abs(Math.round(e * 100))} %`);

/** Courbe cumulée des nuitées d'une période : cette saison contre la précédente, repère à la date rejouée. */
export function CourbeVerdict({ v, date, hauteur = 220 }: { v: VerdictSujet; date: string; hauteur?: number }) {
  const x = (d: string) => Math.round(diffDays(d, v.periode.debut) / 7);
  return (
    <Courbes
      ariaLabel={`Nuitées réservées pour ${v.nom}, cette saison contre la précédente`}
      hauteur={hauteur}
      series={[
        { id: "n1", nom: "Saison précédente", couleur: COULEUR_N1, points: v.courbe.map((p) => ({ x: x(p.date), y: p.partN1 === null ? null : Math.round(p.partN1 * v.finalN1) })) },
        { id: "n", nom: "Cette saison", couleur: "var(--maison-accent)", aire: true, points: v.courbe.map((p) => ({ x: x(p.date), y: p.part === null ? null : Math.round(p.part * v.final) })) },
      ]}
      ticksX={v.courbe.filter((_, i, t) => i % 6 === 0 || (i === t.length - 1 && i % 6 >= 3)).map((p) => ({ x: x(p.date), libelle: formatDate(p.date) }))}
      libellesX={v.courbe.map((p) => ({ x: x(p.date), libelle: `Au ${formatDate(p.date, true)}` }))}
      repere={{ x: x(date), libelle: `démo au ${formatDate(date)}` }}
    />
  );
}

/** Tableau du verdict : ce que l'agent voyait à la date, le résultat final de chaque période. */
export function TableauVerdict({ verdict, date }: { verdict: VerdictSujet[]; date: string }) {
  return (
    <div className="carte overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-taupe">
            <th className="px-5 py-3 font-semibold">Sujet</th>
            <th className="px-3 py-3 font-semibold">L&apos;agent le classait</th>
            <th className="px-3 py-3 text-right font-semibold">Réservé au {formatDate(date)}</th>
            <th className="px-3 py-3 text-right font-semibold">An dernier, même date</th>
            <th className="px-3 py-3 text-right font-semibold">Final</th>
            <th className="px-3 py-3 text-right font-semibold">Final an dernier</th>
            <th className="px-5 py-3 text-right font-semibold">Bilan</th>
          </tr>
        </thead>
        <tbody>
          {verdict.map((v) => {
            const eDate = ecart(v.aDate, v.aDateN1);
            const eFinal = ecart(v.final, v.finalN1);
            return (
              <tr key={v.id} className="border-b border-line/70 last:border-0">
                <td className="px-5 py-3">
                  <Link href={`/sujets/${v.id}`} className="font-semibold hover:underline">
                    {v.nom}
                  </Link>
                  <span className="block text-xs text-ink-soft">{formatRange(v.periode.debut, v.periode.fin)}</span>
                </td>
                <td className="px-3 py-3">
                  <Niveau libelle={urgenceLibelle(v.urgence)} compact />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {fmt.format(v.aDate)}
                  <span className={`ml-1.5 text-xs font-semibold ${eDate === null ? "text-ink-soft" : eDate < 0 ? "text-brick" : "text-sage"}`}>{signe(eDate)}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fmt.format(v.aDateN1)}</td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmt.format(v.final)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-soft">{fmt.format(v.finalN1)}</td>
                <td className={`px-5 py-3 text-right font-semibold tabular-nums ${eFinal === null ? "text-ink-soft" : eFinal < 0 ? "text-brick" : "text-sage"}`}>{signe(eFinal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
