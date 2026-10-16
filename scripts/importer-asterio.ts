// Import des exports Asterio « nuitées » (un fichier par hôtel ou un seul pour tout le groupe).
// Usage : npm run asterio [-- chemin/vers/exports]  (par défaut data/depot/asterio-historique)
// Écrit deux relevés datés : asterio_historique (toutes les maisons, agrégé) et asterio (maison pilote,
// délais par marché pour le calcul). Les fichiers bruts restent hors du dépôt git.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { enregistrerHistorique, importerExportsAsterio } from "../src/services/asterio-historique";
import { lireMaisons } from "../src/services/reference";

async function main() {
  const dossier = process.argv[2] ?? "data/depot/asterio-historique";
  const noms = readdirSync(dossier).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith("~$"));
  if (!noms.length) throw new Error(`Aucun export .xlsx dans ${dossier}`);
  const { maisons, pilote } = lireMaisons();
  const debut = Date.now();
  const h = await importerExportsAsterio(noms.map((nom) => ({ nom, contenu: readFileSync(path.join(dossier, nom)) })), maisons, pilote);
  console.log(`${h.lignes} lignes lues en ${((Date.now() - debut) / 1000).toFixed(1)} s, ${h.maisons.length} maisons${h.inconnus.length ? `, inconnues : ${h.inconnus.join(", ")}` : ""}`);
  for (const m of h.maisons) console.log(`  ${m.id.padEnd(18)} ${String(m.nuitees).padStart(6)} nuitées · ${m.saisons.map((s) => `${s.nom} ${s.nuitees}${s.complete ? "" : " (partielle)"}`).join(" · ")}`);
  console.log("→", enregistrerHistorique(h, noms, pilote));
}

main();
