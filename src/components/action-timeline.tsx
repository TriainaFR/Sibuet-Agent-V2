import { levers, marketByCode } from "@/config/markets";
import { addDays, diffDays, formatDate, formatRange, maxDate, minDate } from "@/lib/dates";
import type { Fiche } from "@/lib/types";
import { LeverIcon } from "./ui";

// Frise « quand agir » : fenêtres de décision de chaque marché + actions de chaque levier.

const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function ActionTimeline({ fiche, now }: { fiche: Fiche; now: string }) {
  const commsOnly = fiche.moment.timing === "communication";
  const starts = [now, ...fiche.actions.map((a) => a.date), ...(commsOnly ? [] : fiche.markets.map((m) => m.decisionStart))];
  const axisStart = addDays(minDate(...starts), -7);
  const axisEnd = addDays(maxDate(fiche.eventEnd, ...fiche.actions.map((a) => a.endDate ?? a.date)), 7);
  const span = Math.max(1, diffDays(axisEnd, axisStart));
  const pos = (d: string) => `${(Math.max(0, Math.min(span, diffDays(d, axisStart))) / span) * 100}%`;
  const width = (a: string, b: string) => `${Math.max(0.8, ((diffDays(minDate(b, axisEnd), maxDate(a, axisStart)) + 1) / span) * 100)}%`;

  // Graduations : le 1er de chaque mois
  const ticks: string[] = [];
  for (let d = `${axisStart.slice(0, 7)}-01`; d <= axisEnd; ) {
    if (d >= axisStart) ticks.push(d);
    const dt = new Date(`${d}T00:00:00Z`);
    dt.setUTCMonth(dt.getUTCMonth() + 1);
    d = dt.toISOString().slice(0, 10);
  }

  const Row = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
    <div className="grid grid-cols-[150px_1fr] items-center gap-3 sm:grid-cols-[190px_1fr]">
      <div className="truncate text-xs text-ink-soft">{label}</div>
      <div className="relative h-6">{children}</div>
    </div>
  );

  return (
    <div className="relative">
      {/* En-tête des mois */}
      <div className="grid grid-cols-[150px_1fr] gap-3 sm:grid-cols-[190px_1fr]">
        <div />
        <div className="relative h-5 text-[0.65rem] text-taupe">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pos(t) }}>
              {MONTHS_SHORT[Number(t.slice(5, 7)) - 1]}
            </span>
          ))}
        </div>
      </div>

      <div className="relative space-y-1.5 border-t border-line pt-2">
        {/* Repères verticaux : aujourd'hui et événement */}
        <div className="pointer-events-none absolute inset-y-0 left-[162px] right-0 sm:left-[202px]">
          {ticks.map((t) => (
            <span key={t} className="absolute inset-y-0 w-px bg-line/70" style={{ left: pos(t) }} />
          ))}
          <span className="absolute inset-y-0 bg-brown/10" style={{ left: pos(fiche.eventStart), width: width(fiche.eventStart, fiche.eventEnd) }} />
          <span className="absolute inset-y-0 w-0.5 bg-brick" style={{ left: pos(now) }} />
        </div>

        {!commsOnly && (
          <>
            <p className="eyebrow pt-1 text-[0.6rem] text-taupe">Fenêtres de décision (50 % des réservations)</p>
            {fiche.markets.map((m) => (
              <Row
                key={m.market}
                label={
                  <>
                    {marketByCode[m.market].flag} {marketByCode[m.market].adjective} · {m.windowMedian} j
                  </>
                }
              >
                <span
                  className="absolute top-1 h-4 rounded-sm bg-greige/60"
                  style={{ left: pos(m.decisionStart), width: width(m.decisionStart, m.decisionEnd) }}
                  title={`${formatRange(m.decisionStart, m.decisionEnd)}`}
                />
              </Row>
            ))}
          </>
        )}

        <p className="eyebrow pt-3 text-[0.6rem] text-taupe">Actions</p>
        {fiche.actions.map((a, i) => (
          <Row
            key={i}
            label={
              <span className="inline-flex items-center gap-1.5">
                <LeverIcon lever={a.lever} className="h-3.5 w-3.5 shrink-0" />
                {levers[a.lever].label}
                {a.lever === "newsletter" && a.title.includes("·") ? ` ${a.title.split(" · ")[0].replace("Newsletter ", "")}` : ""}
              </span>
            }
          >
            {a.endDate ? (
              <span
                className="absolute top-1 h-4 rounded-sm bg-brown/80"
                style={{ left: pos(a.date), width: width(a.date, a.endDate) }}
                title={`${a.title} · ${formatRange(a.date, a.endDate)}`}
              />
            ) : (
              <span
                className="absolute top-0.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-brown shadow"
                style={{ left: pos(a.date) }}
                title={`${a.title} · ${formatDate(a.date, true)}`}
              />
            )}
          </Row>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.7rem] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-brick" /> Aujourd&apos;hui
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 bg-brown/10" /> {commsOnly ? "Opération" : "Séjours"} ({formatRange(fiche.eventStart, fiche.eventEnd)})
        </span>
        {!commsOnly && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-greige/60" /> Période où le marché réserve
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-brown/80" /> Campagne active
        </span>
      </div>
    </div>
  );
}
