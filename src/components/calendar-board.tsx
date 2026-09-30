"use client";

import { useMemo, useState } from "react";
import { hotels } from "@/config/hotels";
import { levers, leverOrder, markets } from "@/config/markets";
import { monthLabel } from "@/lib/dates";
import type { Fiche, HotelId, LeverId, MarketCode } from "@/lib/types";
import { FicheCard } from "./fiche-card";
import { LeverIcon } from "./ui";

type HotelFilter = "demo" | "all" | HotelId;
type Mode = "action" | "event";

const chip = (active: boolean) =>
  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${
    active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-greige hover:text-ink"
  }`;

export function CalendarBoard({ fiches, months }: { fiches: Fiche[]; months: string[] }) {
  const [hotelFilter, setHotelFilter] = useState<HotelFilter>("demo");
  const [market, setMarket] = useState<MarketCode | null>(null);
  const [lever, setLever] = useState<LeverId | null>(null);
  const [mode, setMode] = useState<Mode>("action");
  const [onlyHigh, setOnlyHigh] = useState(false);

  const filtered = useMemo(
    () =>
      fiches.filter((f) => {
        if (hotelFilter === "demo" && !hotels.find((h) => h.id === f.hotelId)?.demo) return false;
        if (hotelFilter !== "demo" && hotelFilter !== "all" && f.hotelId !== hotelFilter) return false;
        if (market && !f.markets.some((m) => m.market === market)) return false;
        if (lever && !f.actions.some((a) => a.lever === lever)) return false;
        if (onlyHigh && f.priority.level !== "haute") return false;
        return true;
      }),
    [fiches, hotelFilter, market, lever, onlyHigh],
  );

  const now = filtered
    .filter((f) => f.status === "urgent" || f.status === "à lancer" || f.status === "en cours")
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 8);

  const columns = useMemo(() => {
    const map = new Map<string, Fiche[]>(months.map((m) => [m, []]));
    for (const f of filtered) {
      let key = (mode === "action" ? f.launchDate : f.eventStart).slice(0, 7);
      if (key < months[0]) key = months[0];
      if (!map.has(key)) continue;
      map.get(key)!.push(f);
    }
    for (const list of map.values()) list.sort((a, b) => b.priority.score - a.priority.score);
    return map;
  }, [filtered, months, mode]);

  return (
    <div>
      {/* Filtres */}
      <div className="sticky top-[65px] z-20 border-y border-line bg-cream/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2.5 px-4 py-3 sm:px-6">
          <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto">
            <span className="eyebrow mr-1 text-taupe">Maison</span>
            <button className={chip(hotelFilter === "demo")} onClick={() => setHotelFilter("demo")}>
              Périmètre démo
            </button>
            <button className={chip(hotelFilter === "all")} onClick={() => setHotelFilter("all")}>
              Toutes
            </button>
            {hotels.map((h) => (
              <button key={h.id} className={chip(hotelFilter === h.id)} onClick={() => setHotelFilter(h.id)}>
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                {h.shortName}
              </button>
            ))}
          </div>
          <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto">
            <span className="eyebrow mr-1 text-taupe">Marché</span>
            <button className={chip(market === null)} onClick={() => setMarket(null)}>
              Tous
            </button>
            {markets.map((m) => (
              <button key={m.code} className={chip(market === m.code)} onClick={() => setMarket(market === m.code ? null : m.code)} title={m.profile}>
                {m.flag} {m.adjective}
              </button>
            ))}
          </div>
          <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto">
            <span className="eyebrow mr-1 text-taupe">Levier</span>
            <button className={chip(lever === null)} onClick={() => setLever(null)}>
              Tous
            </button>
            {leverOrder.map((l) => (
              <button key={l} className={chip(lever === l)} onClick={() => setLever(lever === l ? null : l)}>
                <LeverIcon lever={l} /> {levers[l].label}
              </button>
            ))}
            <span className="mx-2 h-5 w-px shrink-0 bg-line" />
            <button className={chip(onlyHigh)} onClick={() => setOnlyHigh(!onlyHigh)}>
              Priorité haute
            </button>
            <span className="ml-auto" />
            <div className="flex shrink-0 rounded-full border border-line bg-white p-0.5 text-xs">
              {(
                [
                  ["action", "Quand agir"],
                  ["event", "Quand ça se passe"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMode(k)}
                  className={`rounded-full px-3 py-1 transition ${mode === k ? "bg-brown text-white" : "text-ink-soft hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* À faire maintenant */}
      {now.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl">À faire maintenant</h2>
            <span className="text-xs text-ink-soft">Fiches en retard ou à lancer sous 30 jours, par priorité</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {now.map((f) => (
              <FicheCard key={f.id} fiche={f} compact />
            ))}
          </div>
        </section>
      )}

      {/* Timeline mensuelle */}
      <section className="pt-10 pb-12">
        <div className="mx-auto flex max-w-[1400px] items-baseline justify-between gap-4 px-4 sm:px-6">
          <h2 className="font-display text-2xl">Les 12 prochains mois</h2>
          <span className="text-xs text-ink-soft">
            {filtered.length} fiches · classées par {mode === "action" ? "date de lancement" : "date de l'événement"}
          </span>
        </div>
        <div className="scrollbar-thin mt-4 overflow-x-auto pb-4">
          <div className="flex gap-4 px-4 sm:px-6" style={{ width: "max-content" }}>
            {months.map((m, i) => {
              const list = columns.get(m) ?? [];
              return (
                <div key={m} className="w-[280px] shrink-0">
                  <div className="mb-3 flex items-baseline justify-between border-b border-greige/60 pb-2">
                    <h3 className="font-display text-xl capitalize">{monthLabel(m)}</h3>
                    <span className="eyebrow text-[0.6rem] text-taupe">
                      {i === 0 && mode === "action" ? "maintenant · " : ""}
                      {list.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {list.length === 0 && <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-greige">Rien de prévu</p>}
                    {list.map((f) => (
                      <FicheCard key={f.id} fiche={f} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
