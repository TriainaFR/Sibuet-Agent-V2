import Link from "next/link";
import { diffDays, formatDate } from "@/lib/dates";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const fmt = new Intl.NumberFormat("fr-FR");

/** Nuitées de l'hiver réservées au fil des semaines : cette saison jusqu'à aujourd'hui, l'hiver précédent en entier. */
export function CourbeSaison({ c, date, aDate, aDateN1 }: { c: { semaines: string[]; n: number[]; n1: number[]; hiverDebut: string }; date: string; aDate: number; aDateN1: number }) {
  const W = 640;
  const H = 168;
  const pad = { g: 34, d: 8, h: 10, b: 22 };
  const total = c.semaines.length - 1;
  const max = Math.max(...c.n1, ...c.n, 1);
  const pas = max > 1500 ? 1000 : max > 600 ? 500 : 200;
  const x = (i: number) => pad.g + (i / total) * (W - pad.g - pad.d);
  const y = (v: number) => H - pad.b - (v / (Math.ceil(max / pas) * pas)) * (H - pad.h - pad.b);
  const iDate = Math.min(total, Math.max(0, diffDays(date, c.semaines[0]) / 7));
  const ligne = (v: number[]) => v.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(" ");
  const nPts = [...c.n.slice(0, Math.floor(iDate) + 1)];
  const cheminN = `${ligne(nPts)} L${x(iDate).toFixed(1)},${y(aDate).toFixed(1)}`;
  const aire = `${cheminN} L${x(iDate).toFixed(1)},${y(0)} L${x(0)},${y(0)} Z`;
  const graduations = Array.from({ length: Math.ceil(max / pas) + 1 }, (_, k) => k * pas);
  const mois = c.semaines.map((s, i) => ({ s, i })).filter(({ s }, k, a) => k === 0 || s.slice(5, 7) !== a[k - 1].s.slice(5, 7));
  const iHiver = diffDays(c.hiverDebut, c.semaines[0]) / 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="graphique h-auto w-full" role="img" aria-label={`${aDate} nuitées réservées au ${formatDate(date, true)}, contre ${aDateN1} un an plus tôt`}>
      {graduations.map((g) => (
        <g key={g}>
          <line x1={pad.g} x2={W - pad.d} y1={y(g)} y2={y(g)} stroke="#ece9e3" />
          <text x={pad.g - 6} y={y(g) + 3.5} textAnchor="end" fontSize="10" fill="#8a867f">
            {fmt.format(g)}
          </text>
        </g>
      ))}
      <rect x={x(iHiver)} y={pad.h} width={W - pad.d - x(iHiver)} height={H - pad.h - pad.b} fill="#16213a" opacity="0.035" />
      <text x={x(iHiver) + 6} y={pad.h + 11} fontSize="10" fill="#8a867f">
        séjours
      </text>
      {mois.map(({ s, i }) => (
        <text key={s} x={x(i) + 2} y={H - 6} fontSize="10" fill="#8a867f">
          {MOIS[Number(s.slice(5, 7)) - 1]}
        </text>
      ))}
      <path d={ligne(c.n1)} fill="none" stroke="#b9b3aa" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d={aire} fill="#16213a" opacity="0.08" />
      <path d={cheminN} fill="none" stroke="#16213a" strokeWidth="2" strokeLinejoin="round" />
      <line x1={x(iDate)} x2={x(iDate)} y1={pad.h} y2={H - pad.b} stroke="#a8683f" strokeWidth="1.25" />
      <circle cx={x(iDate)} cy={y(aDate)} r="3.5" fill="#16213a" stroke="#fff" strokeWidth="1.5" />
      <circle cx={x(iDate)} cy={y(aDateN1)} r="3" fill="#fff" stroke="#9c968d" strokeWidth="1.5" />
    </svg>
  );
}

export interface LigneFenetre {
  marche: { id: string; nom: string; couleur: string };
  fenetres: { debut: string; fin: string; sujet: string; sujetId: string }[];
}

/** Fenêtres d'achat par marché sur les semaines qui viennent, avec le jour de calcul en trait cognac. */
export function FrisesFenetres({ lignes, date, jours = 98 }: { lignes: LigneFenetre[]; date: string; jours?: number }) {
  const debut = date;
  const pct = (d: string) => Math.max(0, Math.min(100, (diffDays(d, debut) / jours) * 100));
  const reperes: string[] = [];
  for (let k = 0; k <= jours; k += 28) {
    const d = new Date(`${debut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + k);
    reperes.push(d.toISOString().slice(0, 10));
  }
  return (
    <div>
      <div className="relative ml-[7.5rem] h-5 text-[0.6875rem] text-taupe">
        {reperes.map((r, k) => (
          <span key={r} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct(r)}%` }}>
            {k === 0 ? "auj." : `${Number(r.slice(8, 10))} ${MOIS[Number(r.slice(5, 7)) - 1]}`}
          </span>
        ))}
      </div>
      <ul className="space-y-1.5">
        {lignes.map((l) => (
          <li key={l.marche.id} className="grid grid-cols-[7rem_1fr] items-center gap-2">
            <Link href={`/marches/${l.marche.id}`} className="flex min-w-0 items-center gap-2 text-[0.8125rem] hover:text-nav hover:underline">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.marche.couleur }} />
              <span className="truncate">{l.marche.nom}</span>
            </Link>
            <div className="relative h-6 rounded-md bg-cream">
              {reperes.slice(1).map((r) => (
                <span key={r} className="absolute inset-y-0 w-px bg-line" style={{ left: `${pct(r)}%` }} />
              ))}
              {l.fenetres.map((f) => (
                <Link
                  key={f.sujetId + f.debut}
                  href={`/sujets/${f.sujetId}`}
                  title={`${f.sujet} : achat du ${formatDate(f.debut)} au ${formatDate(f.fin)}`}
                  className="absolute top-1 h-4 rounded-[5px] opacity-85 ring-1 ring-white transition hover:opacity-100"
                  style={{ left: `${pct(f.debut)}%`, width: `${Math.max(1.5, pct(f.fin) - pct(f.debut))}%`, background: l.marche.couleur }}
                />
              ))}
              <span className="absolute inset-y-0 left-0 w-0.5 rounded bg-cognac" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
