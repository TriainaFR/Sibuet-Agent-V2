import "server-only";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Releve, SourceId } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Dépôt de données. Tout l'accès au stockage passe par cette interface.
//
// Mode démo : fichiers JSON dans data/ (aucune base à installer).
// Pour passer en production, il suffit d'écrire une autre implémentation de `Depot`
// (SQLite, PostgreSQL, Supabase…) à partir de docs/cadrage/schema.sql, et de la
// renvoyer dans `depot()`. Le reste de l'application ne change pas.
// ─────────────────────────────────────────────────────────────────────────────

export interface Depot {
  /** Données de référence : une seule version, remplacée. */
  lireReference<T>(nom: string, defaut: T): T;
  /** Remplacement d'une donnée de référence (après validation humaine). */
  ecrireReference(nom: string, valeur: unknown): void;
  /** Relevés datés : jamais écrasés. */
  listerReleves(source: SourceId): string[];
  lireReleve<T>(source: SourceId, cle?: string): Releve<T> | null;
  ecrireReleve(releve: Releve): string;
  /** État et décisions (saisie client, validations, calculs, résultats). */
  lireEtat<T>(nom: string, defaut: T): T;
  ecrireEtat(nom: string, valeur: unknown): void;
  /** Dépôt manuel d'exports (data/depot/<source>/). */
  listerDepot(source: string): { nom: string; chemin: string }[];
  readonly persistant: boolean;
}

const DATA = path.join(process.cwd(), "data");

class DepotFichiers implements Depot {
  persistant = true;
  private memoire = new Map<string, unknown>();

  /** Fichiers déjà lus, gardés tant qu'ils ne changent pas sur le disque (date de modification). */
  private cache = new Map<string, { mtime: number; valeur: unknown }>();

  private lire<T>(rel: string, defaut: T): T {
    if (this.memoire.has(rel)) return this.memoire.get(rel) as T;
    const full = path.join(DATA, rel);
    if (!existsSync(full)) return defaut;
    const mtime = statSync(full).mtimeMs;
    const c = this.cache.get(rel);
    if (c && c.mtime === mtime) return structuredClone(c.valeur) as T;
    const valeur = JSON.parse(readFileSync(full, "utf8")) as T;
    this.cache.set(rel, { mtime, valeur });
    return structuredClone(valeur);
  }

  private ecrire(rel: string, valeur: unknown) {
    const full = path.join(DATA, rel);
    try {
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, JSON.stringify(valeur, null, 1));
      this.memoire.delete(rel);
    } catch {
      // Hébergement en lecture seule (démo en ligne) : on garde en mémoire, sans persistance.
      this.persistant = false;
      this.memoire.set(rel, valeur);
    }
  }

  lireReference<T>(nom: string, defaut: T) {
    return this.lire(`reference/${nom}`, defaut);
  }

  ecrireReference(nom: string, valeur: unknown) {
    this.ecrire(`reference/${nom}`, valeur);
  }

  listerReleves(source: SourceId) {
    const dir = path.join(DATA, "signaux", source);
    const enMemoire = [...this.memoire.keys()].filter((k) => k.startsWith(`signaux/${source}/`)).map((k) => path.basename(k, ".json"));
    const surDisque = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [];
    return [...new Set([...surDisque, ...enMemoire])].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }

  lireReleve<T>(source: SourceId, cle?: string) {
    const cles = this.listerReleves(source);
    const choisie = cle ?? cles.at(-1);
    if (!choisie) return null;
    return this.lire<Releve<T> | null>(`signaux/${source}/${choisie}.json`, null);
  }

  ecrireReleve(releve: Releve) {
    // Jamais écrasé : un second relevé le même jour reçoit un suffixe.
    const existants = new Set(this.listerReleves(releve.source));
    let cle = releve.collecte_le;
    for (let i = 2; existants.has(cle); i++) cle = `${releve.collecte_le}_${i}`;
    this.ecrire(`signaux/${releve.source}/${cle}.json`, releve);
    return cle;
  }

  lireEtat<T>(nom: string, defaut: T) {
    return this.lire(`etat/${nom}.json`, defaut);
  }

  ecrireEtat(nom: string, valeur: unknown) {
    this.ecrire(`etat/${nom}.json`, valeur);
  }

  listerDepot(source: string) {
    const dir = path.join(DATA, "depot", source);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => !f.startsWith("."))
      .sort()
      .map((nom) => ({ nom, chemin: path.join(dir, nom) }));
  }
}

let instance: Depot | null = null;
export function depot(): Depot {
  instance ??= new DepotFichiers();
  return instance;
}
