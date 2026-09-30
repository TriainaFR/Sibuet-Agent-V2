// Affiche le plan calculé en console (vérification rapide du moteur).
// Usage : npm run plan:check
import { buildPlan } from "../src/lib/engine/plan";

const { fiches, snapshot } = buildPlan();
console.log(`Extraction réservations : ${snapshot} · ${fiches.length} fiches`);
for (const f of fiches) {
  console.log(
    `${f.launchDate}  [${f.status.padEnd(8)}] ${String(f.priority.score).padStart(3)} ${f.priority.level.padEnd(7)} ${f.hotelId.padEnd(26)} ${f.moment.title}  · ${f.markets.map((m) => `${m.market}:${m.windowMedian}j`).join(" ")}`,
  );
}
