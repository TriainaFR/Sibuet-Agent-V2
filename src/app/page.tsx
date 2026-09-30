import { CloudSnow, Sun, CalendarDays, Database } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarBoard } from "@/components/calendar-board";
import { marketByCode } from "@/config/markets";
import { addDays, formatDate, formatRange, today } from "@/lib/dates";
import { buildPlan } from "@/lib/engine/plan";
import { upcomingHolidays, weatherSignals } from "@/lib/signals";

export default async function Home() {
  await connection(); // calcul à chaque visite : la date du jour et la météo changent
  const { fiches, snapshot } = buildPlan();
  const [weather, holidays] = await Promise.all([weatherSignals(), Promise.resolve(upcomingHolidays())]);

  const now = today();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${now.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + i);
    return d.toISOString().slice(0, 7);
  });
  const demo = fiches.filter((f) => ["les-fermes-de-marie", "la-bastide-de-marie"].includes(f.hotelId));
  const urgent = demo.filter((f) => f.status === "urgent").length;
  const soon = demo.filter((f) => f.launchDate <= addDays(now, 30)).length;

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-taupe">Maisons & Hôtels Sibuet · {formatDate(now, true)}</p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              De quoi parler, <em className="text-brown">quand</em>, à qui.
            </h1>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
              Chaque fiche est un sujet de communication. Sa date de lancement est calculée à partir des{" "}
              <strong className="text-ink">fenêtres de réservation de chaque nationalité</strong>, puis croisée avec les recherches Google, la météo, les
              vacances des marchés et les temps forts locaux.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="eyebrow text-[0.6rem] text-taupe">Fiches · périmètre démo</dt>
                <dd className="font-display text-3xl">{demo.length}</dd>
              </div>
              <div>
                <dt className="eyebrow text-[0.6rem] text-taupe">À lancer sous 30 jours</dt>
                <dd className="font-display text-3xl">{soon}</dd>
              </div>
              <div>
                <dt className="eyebrow text-[0.6rem] text-brick">Déjà en retard</dt>
                <dd className="font-display text-3xl text-brick">{urgent}</dd>
              </div>
            </dl>
          </div>

          <div className="grid content-start gap-3">
            <p className="eyebrow text-taupe">Signaux du moment</p>
            {weather.map((w) => (
              <div key={w.destination} className={`flex gap-3 rounded-md border p-3.5 ${w.tone === "action" ? "border-ochre/50 bg-ochre/5" : "border-line bg-cream/60"}`}>
                {w.destination === "megeve" ? <CloudSnow className="mt-0.5 h-5 w-5 shrink-0 text-taupe" strokeWidth={1.5} /> : <Sun className="mt-0.5 h-5 w-5 shrink-0 text-taupe" strokeWidth={1.5} />}
                <div className="text-sm">
                  <p className="font-semibold">Météo à {w.name} · 7 prochains jours</p>
                  <p className="text-ink-soft">{w.message}</p>
                </div>
              </div>
            ))}
            {holidays.length > 0 && (
              <div className="flex gap-3 rounded-md border border-line bg-cream/60 p-3.5">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-taupe" strokeWidth={1.5} />
                <div className="text-sm">
                  <p className="font-semibold">Vacances qui approchent chez vos marchés</p>
                  <ul className="mt-1 space-y-0.5 text-ink-soft">
                    {holidays.map((h, i) => (
                      <li key={i}>
                        {marketByCode[h.country].flag}&nbsp; {h.name} · {formatRange(h.start, h.end)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <Link href="/sources" className="flex gap-3 rounded-md border border-line bg-cream/60 p-3.5 transition hover:border-greige">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-taupe" strokeWidth={1.5} />
              <div className="text-sm">
                <p className="font-semibold">Réservations extraites le {formatDate(snapshot, true)}</p>
                <p className="text-ink-soft">Données simulées en attendant l&apos;export du booking engine · voir les sources →</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <CalendarBoard fiches={fiches} months={months} />
    </>
  );
}
