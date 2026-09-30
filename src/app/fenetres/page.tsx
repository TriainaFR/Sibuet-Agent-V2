import Link from "next/link";
import { connection } from "next/server";
import { hotelById, hotels } from "@/config/hotels";
import { marketByCode } from "@/config/markets";
import { formatDate, monthLabel } from "@/lib/dates";
import { bookingsSnapshotDate } from "@/lib/data";
import { paceByMonth, windowMatrix } from "@/lib/engine/stats";
import type { HotelId } from "@/lib/types";

const MONTHS_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

/** Échelle séquentielle crème → brun Sibuet, selon le nombre de jours. */
function heat(days: number) {
  const t = Math.min(1, days / 200);
  const a = [243, 239, 233];
  const b = [76, 51, 39];
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return { background: `rgb(${c.join(",")})`, color: t > 0.5 ? "#fff" : "#34342e" };
}

export default async function FenetresPage({ searchParams }: PageProps<"/fenetres">) {
  await connection();
  const sp = await searchParams;
  const hotelId = (typeof sp.maison === "string" && sp.maison in hotelById ? sp.maison : "les-fermes-de-marie") as HotelId;
  const hotel = hotelById[hotelId];
  const snapshot = bookingsSnapshotDate();
  const matrix = windowMatrix(hotelId, snapshot);
  const pace = paceByMonth(hotelId, snapshot);
  const maxPace = Math.max(1, ...pace.map((p) => Math.max(p.lastYearFinal, p.current)));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <p className="eyebrow text-taupe">Analyse du booking engine · extraction du {formatDate(snapshot, true)}</p>
      <h1 className="mt-2 font-display text-4xl">Fenêtres de réservation</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Combien de jours avant leur arrivée réservent les clients de chaque nationalité, selon le mois du séjour. C&apos;est cette donnée qui cale le
        calendrier : on parle à un marché <em>juste avant</em> qu&apos;il ne prenne sa décision.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {hotels.map((h) => (
          <Link
            key={h.id}
            href={`/fenetres?maison=${h.id}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              h.id === hotelId ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-soft hover:border-greige"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
            {h.name}
          </Link>
        ))}
      </div>

      {/* Matrice */}
      <section className="mt-8 rounded-md border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">Délai médian réservation → arrivée (jours)</h2>
          <span className="text-xs text-ink-soft">{matrix.total.toLocaleString("fr-FR")} réservations · données simulées</span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="text-left text-[0.65rem] font-semibold uppercase tracking-wider text-taupe">Nationalité</th>
                <th className="text-right text-[0.65rem] font-semibold uppercase tracking-wider text-taupe">Part</th>
                {matrix.months.map((m) => (
                  <th key={m} className="min-w-12 text-center text-[0.65rem] font-semibold uppercase tracking-wider text-taupe">
                    {MONTHS_SHORT[m - 1]}
                  </th>
                ))}
                <th className="text-right text-[0.65rem] font-semibold uppercase tracking-wider text-taupe">Global</th>
              </tr>
            </thead>
            <tbody>
              {matrix.markets.map(({ market, share }) => {
                const o = matrix.overall(market);
                return (
                  <tr key={market}>
                    <td className="whitespace-nowrap pr-3">
                      {marketByCode[market].flag} {marketByCode[market].adjective}
                    </td>
                    <td className="pr-2 text-right tabular-nums text-ink-soft">{share} %</td>
                    {matrix.months.map((m) => {
                      const v = matrix.value(market, m);
                      if (!v) return <td key={m} className="rounded bg-cream" />;
                      return (
                        <td
                          key={m}
                          className="rounded py-1.5 text-center tabular-nums"
                          style={{ ...heat(v.median), opacity: v.n < 8 ? 0.45 : 1 }}
                          title={`${v.n} réservations`}
                        >
                          {v.median}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap pl-2 text-right tabular-nums font-semibold" title={`50 % entre ${o.p25} et ${o.p75} j`}>
                      {o.median} j
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.7rem] text-ink-soft">Mois = mois d&apos;arrivée. Cases pâles : moins de 8 réservations, à interpréter avec prudence.</p>
      </section>

      {/* Profils */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matrix.markets.slice(0, 6).map(({ market }) => {
          const m = marketByCode[market];
          const o = matrix.overall(market);
          return (
            <div key={market} className="rounded-md border border-line bg-white p-4">
              <p className="font-semibold">
                {m.flag} {m.adjective} · <span className="font-display text-lg">{o.median} j</span>
              </p>
              <p className="mt-1 text-sm text-ink-soft">{m.profile}</p>
            </div>
          );
        })}
      </section>

      {/* Rythme */}
      <section className="mt-8 rounded-md border border-line bg-white p-5">
        <h2 className="font-display text-2xl">Réservations en main pour les prochains mois</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Nuitées déjà réservées au {formatDate(snapshot, true)}, comparées à l&apos;an dernier à la même date et au total final de l&apos;an dernier.
        </p>
        <div className="mt-5 space-y-3">
          {pace.length === 0 && <p className="text-sm text-ink-soft">{hotel.name} : pas d&apos;historique sur les mois à venir.</p>}
          {pace.map((p) => {
            const ratio = p.lastYearSameDate >= 30 ? p.current / p.lastYearSameDate : null; // trop peu de volume = comparaison non significative
            return (
              <div key={p.month} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
                <span className="capitalize">{monthLabel(p.month)}</span>
                <div className="relative h-6 rounded bg-cream">
                  <span className="absolute inset-y-0 left-0 rounded bg-greige/35" style={{ width: `${(p.lastYearFinal / maxPace) * 100}%` }} />
                  <span className="absolute inset-y-1.5 left-0 rounded-sm bg-brown" style={{ width: `${(p.current / maxPace) * 100}%` }} />
                  <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(p.lastYearSameDate / maxPace) * 100}%` }} />
                </div>
                <span className={`text-right tabular-nums font-semibold ${ratio !== null && ratio < 0.9 ? "text-brick" : "text-olive"}`}>
                  {ratio === null ? <span className="font-normal text-taupe">trop tôt</span> : `${ratio >= 1 ? "+" : ""}${Math.round((ratio - 1) * 100)} %`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.7rem] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-brown" /> Déjà réservé
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-ink" /> L&apos;an dernier à la même date
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-4 rounded-sm bg-greige/35" /> Total final l&apos;an dernier
          </span>
        </div>
      </section>
    </div>
  );
}
