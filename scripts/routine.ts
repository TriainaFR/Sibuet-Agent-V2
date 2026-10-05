// Routine du lundi : collecte de toutes les sources, relevés datés, calcul, alertes.
// Usage : npm run routine                 (collecte complète, à planifier chaque lundi à 6 h)
//         npm run routine -- --rapide     (agenda limité aux prochaines semaines)
//         npm run routine -- --date=2026-09-28 --sans-collecte   (rejouer un calcul à une date)
//         npm run routine -- --sources=meteo_prevision,agenda
import { lancerRoutine } from "../src/services/routine";

const arg = (nom: string) => process.argv.find((a) => a.startsWith(`--${nom}`));
const valeur = (nom: string) => arg(nom)?.split("=")[1];

process.env.ROUTINE_VERBEUSE = "1";
lancerRoutine({
  date: valeur("date"),
  rapide: Boolean(arg("rapide")),
  forcer: Boolean(arg("forcer")),
  sansCollecte: Boolean(arg("sans-collecte")),
  sources: valeur("sources")?.split(","),
}).then(({ resume }) => {
  console.log(`\nCalcul n° ${resume.numero} du ${resume.date}`);
  for (const a of resume.alertes) console.log(`  ${a.gravite === "action" ? "!" : "·"} ${a.titre} : ${a.detail}`);
});
