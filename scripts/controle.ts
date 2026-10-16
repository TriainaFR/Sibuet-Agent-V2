// Contrôle du moteur : rejoue le calcul à une date et le compare au calcul n° 5 de Jérôme (23 sept. 2026).
// Usage : npm run controle [-- 2026-09-23]
// Depuis l'import de l'historique Asterio (16 oct. 2026), les délais sont mesurés par période et par pays :
// les fenêtres s'écartent donc de celles du calcul n° 5, qui reposaient sur des hypothèses.
// Le calcul n° 5 multipliait encore par un facteur marge non mesuré (0,5). Ce facteur est retiré à la demande de Jérôme
// (6 oct. 2026) : ses scores et ordres sont donc divisés par 0,5 pour rester comparables.
const MARGE_N5 = 0.5;
import { readFileSync } from "node:fs";
import { calculerSaison } from "../src/lib/engine/calcul";
import { construireContexte } from "../src/services/contexte";

const date = process.argv[2] ?? "2026-09-23";
const ref = JSON.parse(readFileSync("data/reference/calcul_5_2026-09-23.json", "utf8")) as {
  id: string; nom: string; grille: { marche: string; fenetre: [string, string] | null; score: number; urgence: number; ordre: number; ecart: number }[];
}[];
const ctx = construireContexte(date);
const sujets = calculerSaison(ctx);
let ecartsFenetre = 0;
let n = 0;
for (const s of sujets) {
  const r = ref.find((x) => x.id === s.def.id);
  console.log(`\n${s.def.nom}  ordre ${s.ordre.toFixed(2)}${r ? ` (Jérôme ${(Math.max(...r.grille.map((g) => g.ordre)) / MARGE_N5).toFixed(2)})` : ""}`);
  const restantes = [...(r?.grille ?? [])];
  for (const o of s.opportunites) {
    const i = restantes.findIndex((x) => x.marche === o.libelle || (o.libelle.startsWith(x.marche) && x.marche !== "tous marchés") || x.marche === "tous marchés");
    const g = i >= 0 ? restantes.splice(i, 1)[0] : undefined;
    const f = o.fenetre ? `${o.fenetre.debut}→${o.fenetre.fin}` : "n.d.";
    const fj = g?.fenetre ? `${g.fenetre[0]}→${g.fenetre[1]}` : "n.d.";
    if (g?.fenetre && o.fenetre) { n++; if (fj !== f) ecartsFenetre++; }
    console.log(
      `  ${o.libelle.padEnd(18)} ${f.padEnd(23)} ${fj === f ? "=" : "≠ " + fj}  score ${o.score.toFixed(2).padStart(5)} (${g ? (g.score / MARGE_N5).toFixed(2) : "  -  "})  urg ${o.urgence.toFixed(2)} (${g?.urgence.toFixed(2) ?? " - "})  dem ${o.facteurs.demande.valeur} vis ${o.facteurs.visibilite.valeur}${o.facteurs.visibilite.manquant ? "*" : ""} (écart J ${g?.ecart ?? "-"})  ${o.verdict}`,
    );
  }
}
console.log(`\nFenêtres d'achat identiques : ${n - ecartsFenetre} sur ${n}`);
