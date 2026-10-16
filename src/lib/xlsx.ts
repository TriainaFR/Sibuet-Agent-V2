import { unzipSync, strFromU8 } from "fflate";
import { readSheet } from "read-excel-file/node";

// Lecture d'une feuille Excel en tableau de lignes.
// read-excel-file d'abord ; en secours, un lecteur minimal pour les exports qui omettent
// l'adresse des cellules (cas des exports Asterio) : chaînes en ligne ou partagées, nombres.

const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const texte = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (_, e: string) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITES[e] ?? `&${e};`)));

function lecteurMinimal(contenu: Buffer): unknown[][] {
  const zip = unzipSync(new Uint8Array(contenu));
  const nomFeuille = Object.keys(zip).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!nomFeuille) throw new Error("Feuille introuvable dans le fichier Excel.");
  const partagees: string[] = [];
  if (zip["xl/sharedStrings.xml"]) {
    for (const si of strFromU8(zip["xl/sharedStrings.xml"]).match(/<(?:\w+:)?si>[\s\S]*?<\/(?:\w+:)?si>/g) ?? []) {
      partagees.push(texte((si.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
    }
  }
  const xml = strFromU8(zip[nomFeuille]);
  const lignes: unknown[][] = [];
  for (const row of xml.match(/<(?:\w+:)?row\b[^>]*>[\s\S]*?<\/(?:\w+:)?row>|<(?:\w+:)?row\b[^>]*\/>/g) ?? []) {
    const ligne: unknown[] = [];
    for (const c of row.match(/<(?:\w+:)?c\b[^>]*\/>|<(?:\w+:)?c\b[^>]*>[\s\S]*?<\/(?:\w+:)?c>/g) ?? []) {
      // Avec une adresse (r="C12"), on respecte la colonne ; sinon les cellules se suivent.
      const r = /\sr="([A-Z]+)\d+"/.exec(c);
      if (r) {
        const col = [...r[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
        while (ligne.length < col) ligne.push(null);
      }
      const type = /\st="(\w+)"/.exec(c)?.[1];
      const v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(c)?.[1];
      if (type === "inlineStr") ligne.push(texte((c.match(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
      else if (type === "s") ligne.push(v !== undefined ? (partagees[Number(v)] ?? null) : null);
      else if (type === "str") ligne.push(v !== undefined ? texte(v) : null);
      else if (type === "b") ligne.push(v === "1");
      else ligne.push(v !== undefined ? Number(v) : null);
    }
    lignes.push(ligne);
  }
  return lignes;
}

export async function lireFeuille(contenu: Buffer): Promise<unknown[][]> {
  try {
    return (await readSheet(contenu)) as unknown[][];
  } catch {
    return lecteurMinimal(contenu);
  }
}

/** Numéro de série Excel (jours depuis le 30/12/1899) vers date ISO. */
export const dateExcel = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
