import { connection } from "next/server";
import { AlertTriangle, Bell, CalendarRange, Check, ChevronsUpDown, Clock, Database, FileDown, FileText, Gauge, Globe2, Home, ListChecks, Mail, Route, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { Chiffre, Nuancier } from "@/components/ds";
import { BarresH, Courbes, Delais, Empile } from "@/components/graphiques";
import { IconeCanal } from "@/components/icones";
import { CourbeSaison, FrisesFenetres } from "@/components/tableau-bord";
import { Aide, EnTetePage, Niveau, Origine, Puce, Vide } from "@/components/ui";
import { CANAUX, COULEUR_N1, IDENTITES } from "@/lib/da";
import { VOCABULAIRE_INTERDIT } from "@/lib/engine/regles";

export const metadata = { title: "Charte graphique" };

const SECTIONS = [
  { id: "principes", label: "Principes" },
  { id: "couleurs", label: "Couleurs" },
  { id: "typographie", label: "Typographie" },
  { id: "formes", label: "Espacements et formes" },
  { id: "composants", label: "Composants" },
  { id: "graphiques", label: "Graphiques" },
  { id: "maisons", label: "Les maisons" },
  { id: "ecriture", label: "Écriture" },
];

const PRINCIPES = [
  { icone: ListChecks, titre: "Une application, pas un site", texte: "Barre latérale fixe, contenu dans des panneaux, tableaux denses. On sait où tout se trouve avant de remarquer le style." },
  { icone: Sparkles, titre: "La touche Sibuet reste discrète", texte: "Le logo dans la navigation, le bleu nuit du Lodge Park pour l'action principale, le cognac pour « aujourd'hui ». Pas de bandeau photo." },
  { icone: Database, titre: "Chaque chiffre dit d'où il vient", texte: "Source et date sous chaque bloc chiffré. Ce qui est estimé est marqué estimation, ce qui vient du client est marqué saisi." },
  { icone: Check, titre: "Le système propose, l'équipe valide", texte: "Aucune action ne part sans validation. Un seul bouton plein par zone : Valider. Le reste en bouton clair ou discret." },
];

const SURFACES = [
  { nom: "Fond", hex: "#f5f4f0", role: "fond de l'application" },
  { nom: "Panneau", hex: "#ffffff", role: "contenu, cartes" },
  { nom: "Filet", hex: "#e7e4de", role: "bordures, séparateurs" },
  { nom: "Encre", hex: "#1c1c1a", role: "titres, texte" },
  { nom: "Encre secondaire", hex: "#5c5a55", role: "descriptions" },
  { nom: "Taupe", hex: "#74706a", role: "libellés, sources" },
];
const ACCENTS = [
  { nom: "Bleu nuit", hex: "#16213a", role: "action principale, élément actif" },
  { nom: "Cognac", hex: "#a8683f", role: "aujourd'hui, niveau élevé" },
  { nom: "Brun du rejeu", hex: "#8a4b2a", role: "bandeau de démonstration" },
];
const ETATS = [
  { nom: "Favorable", hex: "#4e7a4b", role: "hausse, validé" },
  { nom: "Attention", hex: "#b7862c", role: "à vérifier, reporté" },
  { nom: "Alerte", hex: "#b0472f", role: "baisse, bloqué, avance fragile" },
  { nom: "Saisi", hex: "#5d7c95", role: "donnée du client" },
];
const MARCHES = [
  ["France", "#3f6185"],
  ["Royaume-Uni", "#6f7456"],
  ["Turquie", "#b5683f"],
  ["États-Unis", "#7b5f8c"],
  ["Russie", "#8c4a4a"],
  ["Arabie saoudite", "#4f7f6b"],
  ["Belgique", "#b08a4a"],
  ["Suisse", "#a04f3a"],
  ["Émirats", "#2f7f86"],
  ["Grèce", "#4a6fa5"],
];

const demoMois = ["oct.", "nov.", "déc.", "janv.", "févr.", "mars"];

function Section({ id, titre, intro, children }: { id: string; titre: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold tracking-tight">{titre}</h2>
      {intro && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Specimen({ nom, spec, children }: { nom: string; spec: string; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-2 px-5 py-4 md:grid-cols-[13rem_1fr]">
      <div>
        <p className="text-[0.8125rem] font-medium">{nom}</p>
        <p className="text-xs text-taupe">{spec}</p>
      </div>
      <div className="min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Bloc({ titre, note, children, className = "" }: { titre: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panneau flex flex-col ${className}`}>
      <p className="border-b border-line px-4 py-2.5 text-[0.8125rem] font-semibold">{titre}</p>
      <div className="flex-1 p-4">{children}</div>
      {note && <p className="border-t border-line px-4 py-2.5 text-xs text-taupe">{note}</p>}
    </div>
  );
}

export default async function Charte() {
  await connection();
  const courbeDemo = {
    semaines: Array.from({ length: 44 }, (_, i) => new Date(Date.UTC(2025, 5, 1 + i * 7)).toISOString().slice(0, 10)),
    n: Array.from({ length: 20 }, (_, i) => Math.round(Math.pow(i / 19, 2.2) * 280)),
    n1: Array.from({ length: 44 }, (_, i) => Math.round(Math.pow(i / 43, 1.8) * 2400)),
    hiverDebut: "2025-12-01",
  };

  return (
    <>
      <EnTetePage fil={[{ label: "Pilotage" }]} titre="Charte graphique" meta="Le système de l'application, version 2">
        Une interface d&apos;application claire, dans la lignée de Linear, Attio et Lighthouse, avec une touche Sibuet discrète. Cette page montre les vrais composants :
        ce qui est ici est ce qui est utilisé ailleurs.
      </EnTetePage>

      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[180px_1fr] lg:px-8">
        <nav aria-label="Sommaire de la charte" className="hidden lg:block">
          <ul className="sticky top-6 space-y-px">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-md px-2 py-1.5 text-[0.8125rem] text-ink-soft transition-colors hover:bg-cream hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          <Section id="principes" titre="Principes">
            <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {PRINCIPES.map((p) => {
                const I = p.icone;
                return (
                  <div key={p.titre} className="flex gap-3 bg-white p-5">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-cream text-ink-soft">
                      <I className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">{p.titre}</h3>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-soft">{p.texte}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section id="couleurs" titre="Couleurs" intro="Des neutres chauds pour le cadre, un seul accent pour l'action, et des couleurs d'état réservées à un sens. Une couleur d'état s'accompagne toujours d'un mot.">
            <div className="space-y-4">
              <Bloc titre="Surfaces et texte">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                  {SURFACES.map((c) => (
                    <Nuancier key={c.hex} {...c} />
                  ))}
                </div>
              </Bloc>
              <div className="grid gap-4 lg:grid-cols-[3fr_4fr]">
                <Bloc titre="Accents">
                  <div className="grid grid-cols-3 gap-4">
                    {ACCENTS.map((c) => (
                      <Nuancier key={c.hex} {...c} />
                    ))}
                  </div>
                </Bloc>
                <Bloc titre="États">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {ETATS.map((c) => (
                      <Nuancier key={c.hex} {...c} />
                    ))}
                  </div>
                </Bloc>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Bloc titre="Marchés" note="Une couleur fixe par marché, la même sur tous les écrans : pastille, frise, carte de priorité.">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {MARCHES.map(([nom, hex]) => (
                      <span key={nom} className="inline-flex items-center gap-1.5 text-[0.8125rem]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: hex }} />
                        {nom}
                      </span>
                    ))}
                  </div>
                </Bloc>
                <Bloc titre="Canaux de vente" note="Cinq teintes dans un ordre fixe, contrôlées pour le daltonisme.">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {CANAUX.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 text-[0.8125rem]">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.couleur }} />
                        {c.nom}
                      </span>
                    ))}
                  </div>
                </Bloc>
              </div>
            </div>
          </Section>

          <Section id="typographie" titre="Typographie" intro="Une seule famille, Inter, pour tout : titres, texte et chiffres. Les chiffres des tableaux sont tabulaires pour s'aligner en colonne.">
            <div className="panneau divide-y divide-line">
              <Specimen nom="Titre d'écran" spec="Inter 600 · 24 px · approche −0,02 em">
                <p className="text-2xl font-semibold tracking-[-0.02em]">Cette semaine</p>
              </Specimen>
              <Specimen nom="Titre de section" spec="Inter 600 · 16 px">
                <p className="text-base font-semibold tracking-tight">À décider cette semaine</p>
              </Specimen>
              <Specimen nom="Titre de panneau" spec="Inter 600 · 13 px">
                <p className="text-[0.8125rem] font-semibold">Marchés à date</p>
              </Specimen>
              <Specimen nom="Texte" spec="Inter 400 · 14 px · interlignage 1,5">
                <p className="max-w-xl text-sm leading-relaxed">La moitié des nuitées britanniques se réserve moins de 36 jours avant la nuit.</p>
              </Specimen>
              <Specimen nom="Libellé" spec="Inter 500 · 12 px · taupe">
                <p className="text-xs font-medium text-taupe">Délai d&apos;achat médian</p>
              </Specimen>
              <Specimen nom="Chiffre clé" spec="Inter 600 · 32 px · chiffres tabulaires">
                <p className="flex items-baseline gap-2">
                  <span className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">282</span>
                  <Puce ton="vert">+52 %</Puce>
                </p>
              </Specimen>
              <Specimen nom="Source" spec="Inter 400 · 12 px · taupe, sous chaque bloc chiffré">
                <p className="text-xs text-taupe">Source : Asterio, nuitées de décembre à mars, export du 14 oct. 2026.</p>
              </Specimen>
            </div>
          </Section>

          <Section id="formes" titre="Espacements et formes" intro="Une grille de 4 px. Trois rayons, du plus petit au plus grand selon la taille de l'objet. Des ombres très légères, toujours décalées vers le bas.">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { r: "6 px", cls: "rounded-md", usage: "pastilles, étiquettes" },
                { r: "8 px", cls: "rounded-lg", usage: "boutons, champs, icônes" },
                { r: "12 px", cls: "rounded-xl", usage: "panneaux, cartes, menus" },
              ].map((x) => (
                <div key={x.r} className="panneau flex items-center gap-4 p-4">
                  <span className={`h-12 w-12 border border-line bg-cream ${x.cls}`} />
                  <div>
                    <p className="text-[0.8125rem] font-medium">Rayon {x.r}</p>
                    <p className="text-xs text-taupe">{x.usage}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_2fr]">
              <Bloc titre="Espacements">
                <div className="space-y-2">
                  {[4, 8, 12, 16, 20, 24, 32].map((e) => (
                    <div key={e} className="flex items-center gap-3 text-xs text-taupe">
                      <span className="w-10 tabular-nums">{e} px</span>
                      <span className="h-2.5 rounded-sm bg-nav/70" style={{ width: e * 3 }} />
                    </div>
                  ))}
                </div>
              </Bloc>
              <Bloc titre="La coquille de l'application" note="Barre latérale de 248 px sur le fond, contenu dans un panneau blanc, bandeau de démonstration en haut du panneau.">
                <div className="flex h-44 overflow-hidden rounded-lg border border-line bg-cream">
                  <div className="w-[26%] space-y-1.5 p-2.5">
                    <div className="h-2.5 w-14 rounded bg-ink/70" />
                    <div className="mt-3 h-5 rounded-md bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" />
                    <div className="h-5 rounded-md bg-black/[0.04]" />
                    <div className="h-5 rounded-md bg-black/[0.04]" />
                    <div className="mt-3 space-y-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-3 rounded ${i === 0 ? "bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" : "bg-black/[0.05]"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="my-1.5 mr-1.5 flex flex-1 flex-col overflow-hidden rounded-md border border-line bg-white">
                    <div className="h-3 bg-[#8a4b2a]" />
                    <div className="border-b border-line p-2.5">
                      <div className="h-3 w-24 rounded bg-ink/80" />
                      <div className="mt-1.5 h-2 w-40 rounded bg-ink/15" />
                    </div>
                    <div className="grid flex-1 grid-cols-3 gap-1.5 p-2.5">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded border border-line" />
                      ))}
                    </div>
                  </div>
                </div>
              </Bloc>
            </div>
          </Section>

          <Section id="composants" titre="Composants">
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloc titre="Boutons" note="Un seul bouton plein par zone : l'action principale.">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bouton">
                    <Check className="h-3.5 w-3.5" /> Valider
                  </span>
                  <span className="bouton-clair">
                    <Clock className="h-3.5 w-3.5" /> Reporter
                  </span>
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium text-ink-soft">
                    <X className="h-3.5 w-3.5" /> Rejeter
                  </span>
                  <span className="bouton-clair">
                    <FileDown className="h-3.5 w-3.5" /> Plan de la semaine
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-sage/12 px-2.5 text-[0.8125rem] font-medium text-[#3d6639]">
                    <Check className="h-3.5 w-3.5" /> Validée
                  </span>
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ochre/14 px-2.5 text-[0.8125rem] font-medium text-[#7c5a17]">
                    <Clock className="h-3.5 w-3.5" /> Reportée
                  </span>
                  <span className="bouton opacity-40">Désactivé</span>
                </div>
              </Bloc>
              <Bloc titre="Champs">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[0.8125rem] font-medium">Commission des plateformes</span>
                    <input readOnly value="18 %" className="mt-1.5 h-9 w-full border border-line bg-white px-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-[0.8125rem] font-medium">Marché</span>
                    <select className="mt-1.5 h-9 w-full border border-line bg-white px-2.5 text-sm" defaultValue="uk">
                      <option value="uk">Royaume-Uni</option>
                      <option value="fr">France</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 inline-flex items-center gap-0.5 rounded-lg bg-cream p-0.5">
                  <span className="h-7 rounded-md bg-white px-2.5 text-[0.8125rem] font-medium leading-7 shadow-[0_1px_2px_rgba(28,28,26,0.1)]">Tout 47</span>
                  <span className="h-7 px-2.5 text-[0.8125rem] leading-7 text-ink-soft">À lancer 16</span>
                  <span className="h-7 px-2.5 text-[0.8125rem] leading-7 text-ink-soft">Bloqué 31</span>
                </div>
              </Bloc>
              <Bloc titre="Pastilles, niveaux, origine" note="Plus de points veut toujours dire plus prioritaire. L'origine dit si un chiffre est mesuré, saisi ou estimé.">
                <div className="flex flex-wrap items-center gap-2">
                  <Puce ton="nuit">À lancer</Puce>
                  <Puce ton="ocre">Déjà prévu</Puce>
                  <Puce ton="brique">Bloqué</Puce>
                  <Puce ton="vert">Branché</Puce>
                  <Puce ton="cognac">Rejeu</Puce>
                  <Puce ton="gris">Suspendu</Puce>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Niveau libelle="Élevée" compact />
                  <Niveau libelle="Moyenne" compact />
                  <Niveau libelle="Basse" compact />
                  <Niveau libelle="Non mesuré" compact />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Origine origine="mesuré" />
                  <Origine origine="saisi" />
                  <Origine origine="estimation" />
                  <Origine origine={null} />
                </div>
              </Bloc>
              <Bloc titre="Navigation et sélecteurs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-px rounded-lg bg-cream p-2">
                    {[
                      { I: Home, l: "Cette semaine", a: true },
                      { I: Sparkles, l: "Sujets" },
                      { I: Globe2, l: "Marchés" },
                      { I: CalendarRange, l: "Calendrier" },
                      { I: Route, l: "Canaux" },
                    ].map(({ I, l, a }) => (
                      <div key={l} className={`flex h-8 items-center gap-2.5 rounded-lg px-2 text-[0.8125rem] ${a ? "bg-white font-medium shadow-[0_1px_2px_rgba(28,28,26,0.08),0_0_0_1px_rgba(28,28,26,0.06)]" : "text-ink-soft"}`}>
                        <I className={`h-4 w-4 ${a ? "text-nav" : "text-taupe"}`} strokeWidth={1.7} /> {l}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1 rounded-lg bg-cream p-2">
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-nav text-[0.6875rem] font-semibold text-white">LP</span>
                      <span className="flex-1">
                        <span className="block text-[0.8125rem] font-medium">Lodge Park</span>
                        <span className="block text-xs text-taupe">Maison pilote</span>
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-taupe" />
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sand">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#6f7456]" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-[0.8125rem] font-medium">Royaume-Uni</span>
                        <span className="block text-xs text-taupe">Filtre de marché</span>
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-taupe" />
                    </div>
                  </div>
                </div>
              </Bloc>
              <Bloc titre="Chiffres clés">
                <div className="grid grid-cols-2 gap-5">
                  <Chiffre libelle="Hiver 2025-2026" valeur="2 059" ecart={{ texte: "15 %", sens: "baisse" }} note="contre 2 430 un an plus tôt" />
                  <Chiffre libelle="Vendu en direct" valeur="46 %" ecart={{ texte: "1 pt", sens: "hausse" }} note="téléphone, e-mail et site" />
                </div>
              </Bloc>
              <Bloc titre="Alerte, aide, vide, icônes">
                <div className="rounded-lg border border-brick/20 bg-[#fffaf8] p-3">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-brick">
                    <AlertTriangle className="h-4 w-4" /> Avance fragile
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-ink-soft">Une alerte dit ce qui se passe et pourquoi, en une phrase chiffrée.</p>
                </div>
                <div className="mt-3">
                  <Aide>Une phrase pour lire l&apos;écran, repliée par défaut.</Aide>
                </div>
                <div className="mt-3">
                  <Vide>Rien ici pour l&apos;instant.</Vide>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <IconeCanal canal="crm" taille="h-8 w-8" />
                  <IconeCanal canal="seo" taille="h-8 w-8" />
                  <IconeCanal canal="sea" taille="h-8 w-8" />
                  <IconeCanal canal="meta" taille="h-8 w-8" />
                  <IconeCanal canal="agences" taille="h-8 w-8" />
                  {[Mail, Search, Bell, Gauge, FileText, ShieldCheck].map((I, i) => (
                    <I key={i} className="h-4 w-4 text-taupe" strokeWidth={1.7} />
                  ))}
                </div>
                <p className="mt-2 text-xs text-taupe">Icônes Lucide, trait 1,7, dans un carré à coins de 8 px pour les canaux.</p>
              </Bloc>
            </div>
          </Section>

          <Section id="graphiques" titre="Graphiques" intro="Traits de 2 px, filets clairs, une seule échelle. La saison en cours en bleu nuit, la précédente en greige pointillé, aujourd'hui en cognac. Données d'exemple sur cette page.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloc titre="Nuitées réservées au fil des semaines" className="lg:col-span-2">
                <CourbeSaison c={courbeDemo} date="2025-10-16" aDate={280} aDateN1={185} />
              </Bloc>
              <Bloc titre="Fenêtres d'achat par marché" note="Signature de l'application : une barre par sujet, le trait cognac marque aujourd'hui.">
                <FrisesFenetres
                  date="2025-10-16"
                  lignes={[
                    { marche: { id: "fr", nom: "France", couleur: "#3f6185" }, fenetres: [{ debut: "2025-11-10", fin: "2026-01-20", sujet: "Exemple", sujetId: "fevrier" }] },
                    { marche: { id: "uk", nom: "Royaume-Uni", couleur: "#6f7456" }, fenetres: [{ debut: "2025-10-16", fin: "2025-12-20", sujet: "Exemple", sujetId: "janvier" }] },
                    { marche: { id: "us", nom: "États-Unis", couleur: "#7b5f8c" }, fenetres: [{ debut: "2025-10-30", fin: "2026-01-10", sujet: "Exemple", sujetId: "fetes" }] },
                  ]}
                />
              </Bloc>
              <Bloc titre="Comparaison de deux saisons">
                <Courbes
                  ariaLabel="Exemple de comparaison de deux saisons"
                  hauteur={180}
                  series={[
                    { id: "n1", nom: "Hiver 2024-2025", couleur: COULEUR_N1, points: [120, 300, 330, 810, 860, 430].map((y, x) => ({ x, y })) },
                    { id: "n", nom: "Hiver 2025-2026", couleur: "#16213a", aire: true, points: [140, 280, 310, 740, 620, 390].map((y, x) => ({ x, y })) },
                  ]}
                  ticksX={demoMois.map((libelle, x) => ({ x, libelle }))}
                />
              </Bloc>
              <Bloc titre="Part par catégorie">
                <BarresH
                  unite="pourcent"
                  items={[
                    { id: "fr", libelle: "France", valeur: 0.3 },
                    { id: "uk", libelle: "Royaume-Uni", valeur: 0.11 },
                    { id: "us", libelle: "États-Unis", valeur: 0.05 },
                    { id: "autres", libelle: "Autres pays", valeur: 0.19, attenue: true },
                  ]}
                />
              </Bloc>
              <Bloc titre="Canaux">
                <Empile
                  categories={CANAUX.map((c) => ({ id: c.id, nom: c.nom, couleur: c.couleur }))}
                  lignes={[{ id: "ex", libelle: "Exemple", valeurs: { direct: 46, site: 6, ota: 23, agences: 21, groupes: 4 } }]}
                />
              </Bloc>
              <Bloc titre="Délais d'achat (quartiles)" className="lg:col-span-2">
                <Delais
                  lignes={[
                    { id: "fr", libelle: "France", q1: 9, med: 27, q3: 60, n: 426 },
                    { id: "uk", libelle: "Royaume-Uni", q1: 16, med: 36, q3: 65, n: 124 },
                    { id: "ch", libelle: "Suisse", q1: 3, med: 12, q3: 30, n: 90 },
                  ]}
                />
              </Bloc>
            </div>
          </Section>

          <Section id="maisons" titre="Les maisons" intro="L'application garde un seul cadre. La couleur de chaque maison n'apparaît qu'en accent : la pastille du sélecteur et les écrans de portrait.">
            <div className="panneau divide-y divide-line">
              {IDENTITES.map((id) => (
                <div key={id.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
                  <span className="flex min-w-[15rem] items-center gap-3">
                    <span className="h-7 w-7 shrink-0 rounded-md" style={{ background: id.couleurs[0]?.hex }} />
                    <span>
                      <span className="block text-[0.8125rem] font-medium">{id.nom}</span>
                      <span className="block text-xs text-taupe">{id.site}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {id.couleurs.map((c) => (
                      <span key={c.hex + c.nom} title={`${c.nom} · ${c.hex} · ${c.role}`} className="h-5 w-5 rounded shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" style={{ background: c.hex }} />
                    ))}
                  </span>
                  <span className="ml-auto text-xs text-taupe">{id.esprit}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="ecriture" titre="Écriture">
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloc titre="Règles">
                <ul className="space-y-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                  <li>En français, phrases courtes, un verbe d&apos;action pour chaque action : « Envoyer la newsletter aux Britanniques ».</li>
                  <li>Des mots plutôt que des indices : Haut, Moyen, Bas.</li>
                  <li>Pas de tiret long, pas de dièse ni d&apos;astérisque comme marqueur.</li>
                  <li>Chaque chiffre avec sa source et sa date ; les hypothèses déclarées comme telles.</li>
                  <li>Rien de nominatif : des pays, des dates, des totaux.</li>
                </ul>
              </Bloc>
              <Bloc titre="Vocabulaire écarté" note="Vérifié automatiquement dans chaque brief produit par l'agent.">
                <div className="flex flex-wrap gap-1.5">
                  {VOCABULAIRE_INTERDIT.map((v) => (
                    <span key={v} className="rounded-md bg-cream px-2 py-0.5 text-[0.8125rem] text-ink-soft line-through decoration-brick/70">
                      {v}
                    </span>
                  ))}
                </div>
              </Bloc>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
