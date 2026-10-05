import type { SemaineNeige } from "@/lib/engine/calcul";
import { addDays, diffDays, formatDate, maxDate, minDate } from "@/lib/dates";
import { interetLibelle, urgenceLibelle } from "@/lib/format";
import type { Marche, SujetCalcule, Verdict } from "@/lib/types";
import { Niveau, Origine, Puce, type Ton } from "./ui";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const tonVerdict: Record<Verdict, Ton> = {
  "Pas de demande sur ce marché": "gris",
  "Rien n'est prévu, à créer": "vert",
  "Déjà prévu, on garde": "ocre",
  "On envoie trop tard": "brique",
  "Prévu trop tôt": "brique",
  "Seules les agences sont touchées": "bleu",
};

function LigneGrille({ label, children, droite, pos, mois, date }: { label: React.ReactNode; children: React.ReactNode; droite?: React.ReactNode; pos: (d: string) => string; mois: string[]; date: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr_190px] items-center gap-3">
      <div className="truncate text-sm">{label}</div>
      <div className="relative h-7">
        {mois.map((m) => (
          <span key={m} className="absolute inset-y-0 w-px bg-line/70" style={{ left: pos(m) }} />
        ))}
        <span className="absolute inset-y-0 w-0.5 bg-brick/70" style={{ left: pos(date) }} />
        {children}
      </div>
      <div>{droite}</div>
    </div>
  );
}

/** Grille « par pays » : fenêtre d'achat en pointillés, date proposée, newsletter prévue, séjour, neige. */
export function GrilleMarches({ sujet, marches, neige, date }: { sujet: SujetCalcule; marches: Marche[]; neige: SemaineNeige[] | null; date: string }) {
  const lignes = sujet.opportunites;
  const dates = lignes.flatMap((o) => [o.fenetre?.debut, o.fenetre?.fin, o.sejour?.debut, o.sejour?.fin, o.envoi?.date]).filter((d): d is string => Boolean(d));
  if (dates.length === 0) return null;
  const debut = addDays(minDate(date, ...dates), -10);
  const fin = addDays(maxDate(...dates), 10);
  const span = diffDays(fin, debut);
  const x = (d: string) => `${(Math.max(0, Math.min(span, diffDays(d, debut))) / span) * 100}%`;
  const w = (a: string, b: string) => `${Math.max(0.6, ((diffDays(minDate(b, fin), maxDate(a, debut)) + 1) / span) * 100)}%`;
  const mois: string[] = [];
  for (let d = `${debut.slice(0, 7)}-01`; d <= fin; d = addDays(d, 32).slice(0, 7) + "-01") if (d >= debut) mois.push(d);
  const semNeige = (neige ?? []).filter((s) => s.semaine >= debut && s.semaine <= fin);
  const maxNeige = Math.max(1, ...semNeige.map((s) => s.neige_j10_moyenne));


  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[150px_1fr_190px] gap-3">
        <div />
        <div className="relative h-8 text-[0.68rem] text-taupe">
          {mois.map((m) => (
            <span key={m} className="absolute pl-1" style={{ left: x(m) }}>
              {MOIS[Number(m.slice(5, 7)) - 1]}
            </span>
          ))}
          <span className="absolute -translate-x-1/2 rounded bg-white px-1 font-semibold text-brick" style={{ left: x(date), top: 12 }}>
            aujourd&apos;hui
          </span>
        </div>
        <div />
      </div>
      {semNeige.length > 0 && (
        <LigneGrille pos={x} mois={mois} date={date} label={<span className="text-xs text-ink-soft">Neige à J-10, moyenne 5 saisons</span>}>
          {semNeige.map((s) => (
            <span
              key={s.semaine}
              className="absolute bottom-0 rounded-t bg-sky/45"
              style={{ left: x(s.semaine), width: w(s.semaine, addDays(s.semaine, 5)), height: `${(s.neige_j10_moyenne / maxNeige) * 100}%` }}
              title={`Semaine du ${formatDate(s.semaine)} : ${String(s.neige_j10_moyenne).replace(".", ",")} cm en moyenne (de ${Math.min(...s.par_saison)} à ${Math.max(...s.par_saison)} cm selon la saison)`}
            />
          ))}
        </LigneGrille>
      )}
      {lignes.map((o) => {
        const m = marches.find((x) => x.id === o.marche)!;
        const ton = tonVerdict[o.verdict];
        const couleur = ton === "brique" ? "text-brick" : ton === "ocre" ? "text-ochre" : ton === "gris" ? "text-greige" : ton === "bleu" ? "text-sky" : "text-sage";
        return (
          <LigneGrille
            pos={x}
            mois={mois}
            date={date}
            key={o.cle}
            label={
              <span className={`inline-flex items-center gap-1.5 ${o.demandeDetectee ? "" : "text-ink-soft"}`}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.couleur }} />
                {o.libelle}
              </span>
            }
            droite={<Puce ton={ton}>{o.verdict}</Puce>}
          >
            {o.sejour && <span className="absolute top-2.5 h-2 rounded-full bg-brown/15" style={{ left: x(o.sejour.debut), width: w(o.sejour.debut, o.sejour.fin) }} title={`Séjour du ${formatDate(o.sejour.debut)} au ${formatDate(o.sejour.fin)}`} />}
            {o.fenetre && (
              <span
                className={`fenetre-achat absolute top-1.5 h-4 ${couleur}`}
                style={{ left: x(o.fenetre.debut), width: w(o.fenetre.debut, o.fenetre.fin) }}
                title={`Réservent du ${formatDate(o.fenetre.debut)} au ${formatDate(o.fenetre.fin)} (${o.delai.origine})`}
              />
            )}
            {o.dateProposee && <span className="absolute top-0.5 h-6 w-1 -translate-x-1/2 rounded bg-ink" style={{ left: x(o.dateProposee) }} title={`Date proposée : ${formatDate(o.dateProposee)}`} />}
            {o.envoi && (
              <span
                className={`absolute top-1.5 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-2 border-white ${o.envoi.cible === "agences" ? "bg-sky" : "bg-ochre"}`}
                style={{ left: x(o.envoi.date) }}
                title={`Newsletter ${o.envoi.cible} prévue le ${formatDate(o.envoi.date)} : « ${o.envoi.theme} »`}
              />
            )}
          </LigneGrille>
        );
      })}
      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-3 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="fenetre-achat h-3 w-6 text-sage" /> Quand ce pays réserve
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-1 rounded bg-ink" /> Date d&apos;envoi proposée
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rotate-45 bg-ochre" /> Newsletter prévue (clients)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rotate-45 bg-sky" /> Newsletter prévue (agences)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-6 rounded-full bg-brown/15" /> Séjour
        </span>
        <span>Vert : à créer · ocre : elle tombe au bon moment · rouge : elle arrive trop tard ou trop tôt · gris : pas de demande</span>
      </div>
    </div>
  );
}

export function TableauMarches({ sujet, marches, interet }: { sujet: SujetCalcule; marches: Marche[]; interet: (d: number) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[0.65rem] uppercase tracking-wider text-taupe">
            <th className="py-2 pr-3 font-semibold">Pays</th>
            <th className="px-3 py-2 font-semibold">Ils réservent</th>
            <th className="px-3 py-2 font-semibold">Intérêt</th>
            <th className="px-3 py-2 font-semibold">Urgence</th>
            <th className="px-3 py-2 font-semibold">Canal à date</th>
            <th className="py-2 pl-3 font-semibold">Ce qu&apos;on constate</th>
          </tr>
        </thead>
        <tbody>
          {sujet.opportunites.map((o) => {
            const m = marches.find((x) => x.id === o.marche)!;
            return (
              <tr key={o.cle} className="border-b border-line/70 last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} />
                    {o.libelle}
                  </span>
                  {o.vacances && <span className="block text-xs text-ink-soft">{o.vacances}</span>}
                </td>
                <td className="px-3 py-2.5">
                  {o.fenetre ? `${formatDate(o.fenetre.debut)} au ${formatDate(o.fenetre.fin)}` : "sur prévision"} <Origine origine={o.delai.origine} />
                  <span className="block text-xs text-ink-soft">environ {String(o.delai.mediane).replace(".", ",")} semaines avant l&apos;arrivée</span>
                </td>
                <td className="px-3 py-2.5">
                  <Niveau libelle={interet(o.facteurs.demande.valeur * o.facteurs.visibilite.valeur)} />
                </td>
                <td className="px-3 py-2.5">{o.close ? <Puce>Fenêtre passée</Puce> : <Niveau libelle={urgenceLibelle(o.urgence)} />}</td>
                <td className="px-3 py-2.5 text-ink-soft">{o.canalADate}</td>
                <td className="py-2.5 pl-3">
                  {o.verdict}
                  {o.envoi && <span className="block text-xs text-ink-soft">Envoi {o.envoi.cible} du {formatDate(o.envoi.date)} : « {o.envoi.theme} »</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { interetLibelle };
