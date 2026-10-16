import { ArrowRight, Bell, CalendarRange, Check, FileText, Gauge, ListChecks } from "lucide-react";
import { Chiffre, EnTete, Nuancier } from "@/components/ds";
import { BarresH, Courbes, Delais, Empile } from "@/components/graphiques";
import { Aide, Bandeau, Niveau, Origine, Puce, Vide } from "@/components/ui";
import { CANAUX, COULEUR_N1, IDENTITES } from "@/lib/da";
import { VOCABULAIRE_INTERDIT } from "@/lib/engine/regles";

export const metadata = { title: "Charte graphique" };

const PRINCIPES = [
  { titre: "Le cadre est au groupe, le contenu à la maison", texte: "En-tête, navigation et pied de page portent la charte Maisons & Hôtels Sibuet. Dès qu'un écran parle d'une maison, il prend ses couleurs et sa serif." },
  { titre: "La donnée parle, le décor se tait", texte: "Marques fines, filets d'un pixel, beaucoup d'air. La couleur sert à distinguer, jamais à décorer." },
  { titre: "Chaque chiffre dit d'où il vient", texte: "Source et date sous chaque bloc chiffré. Ce qui est estimé est marqué estimation, ce qui vient du client est marqué saisi." },
  { titre: "Le système propose, l'équipe valide", texte: "Aucune action ne part sans validation. Les boutons d'action sont rares et explicites : un verbe, un objet." },
];

const demoMois = ["oct.", "nov.", "déc.", "janv.", "févr.", "mars"];

export default function Charte() {
  return (
    <div data-maison="groupe">
      <Bandeau eyebrow="Design system" titre="Charte graphique" sousTitre="Le groupe, les maisons, les règles" filigrane="Charte" photo="/hotels/toutes.jpg" photo2="/brand/stamp.png">
        <p>
          La charte de l&apos;Agent Sibuet reprend celle de maisonsethotels-sibuet.com pour le cadre, et l&apos;identité de chaque hôtel, relevée sur son site, pour
          tout ce qui le concerne. Un seul jeu de composants, huit thèmes.
        </p>
      </Bandeau>

      <div className="mx-auto max-w-[1320px] space-y-16 px-4 py-14 sm:px-6">
        {/* Principes */}
        <section>
          <EnTete surtitre="01" titre="Principes" />
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPES.map((p, i) => (
              <div key={p.titre} className="bg-white p-6">
                <p className="font-display text-4xl text-greige">{i + 1}</p>
                <h3 className="font-display mt-3 text-xl leading-snug">{p.titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Maisons */}
        <section>
          <EnTete surtitre="02" titre="Le groupe et ses maisons">
            Chaque thème est activé par un simple attribut <code className="bg-sand px-1 text-[0.85em]">data-maison</code> : accent, second accent, fond, encre, bandeau et
            serif de titre. Les composants lisent ces jetons et s&apos;adaptent seuls.
          </EnTete>
          <div className="grid gap-5 lg:grid-cols-2">
            {IDENTITES.map((id) => (
              <article key={id.id} data-maison={id.id} className="flex flex-col overflow-hidden border border-line bg-white">
                <div className="bg-maison-bandeau px-6 py-5 text-white">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/75">{id.site}</p>
                  <p className="mt-1 text-[2rem] leading-tight" style={{ fontFamily: "var(--maison-serif)" }}>
                    {id.nom}
                  </p>
                  <p className="mt-1 text-sm text-white/85">{id.esprit}</p>
                </div>
                <div className="grid flex-1 gap-5 p-6 sm:grid-cols-[1.2fr_1fr]">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {id.couleurs.map((c) => (
                      <Nuancier key={c.hex + c.nom} {...c} />
                    ))}
                  </div>
                  <div className="space-y-4 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Serif de titre</p>
                      <p className="titre-maison text-2xl">{id.serif.equivalent}</p>
                      <p className="text-xs text-ink-soft">
                        {id.serif.nom === id.serif.equivalent ? "celle du site" : `pour ${id.serif.nom}, police du site sous licence`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Texte</p>
                      <p className="text-sm">{id.sans}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bouton !px-3.5 !py-2">Valider</span>
                      <span className="lien-charme text-maison">Voir</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Typographie */}
        <section>
          <EnTete surtitre="03" titre="Typographie">
            Deux familles : une serif de titre (celle de la maison) et Source Sans pour tout le reste, chiffres compris. Les grands chiffres restent en sans : une serif
            les rendrait décoratifs.
          </EnTete>
          <div className="carte divide-y divide-line">
            {[
              { nom: "Titre de page", spec: "serif · 60 px · interlignage 1,02", rendu: <p className="font-display text-6xl leading-[1.02]">Les maisons</p> },
              { nom: "Titre de section", spec: "serif de la maison · 30 px", rendu: <p className="titre-maison text-[1.9rem] leading-tight">Quand ils réservent</p> },
              { nom: "Titre en capitales", spec: "serif · capitales · 20 px", rendu: <p className="titre-capitales text-xl">Charger vos réservations</p> },
              { nom: "Surtitre", spec: "Source Sans 600 · 11 px · capitales · espacement 0,18 em", rendu: <p className="eyebrow text-taupe">Ce que disent les réservations</p> },
              { nom: "Texte", spec: "Source Sans 400 · 16 px · interlignage 1,6", rendu: <p className="max-w-xl leading-relaxed">La moitié des séjours se réserve moins de quinze jours avant l&apos;arrivée.</p> },
              { nom: "Chiffre clé", spec: "Source Sans 600 · 42 px · chiffres proportionnels", rendu: <p className="text-[2.6rem] font-semibold leading-none">2 059</p> },
              { nom: "Légende, source", spec: "Source Sans 400 · 12 px · taupe", rendu: <p className="text-[0.72rem] text-taupe">Source : Asterio, nuits du 14 oct. 2024 au 14 oct. 2026</p> },
            ].map((t) => (
              <div key={t.nom} className="grid items-center gap-3 px-6 py-5 md:grid-cols-[14rem_1fr]">
                <div>
                  <p className="text-sm font-semibold">{t.nom}</p>
                  <p className="text-xs text-ink-soft">{t.spec}</p>
                </div>
                <div className="min-w-0 overflow-hidden">{t.rendu}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Couleurs fonctionnelles */}
        <section>
          <EnTete surtitre="04" titre="Couleurs qui ont un sens">
            Réservées à un état. Elles s&apos;accompagnent toujours d&apos;un mot ou d&apos;une icône, jamais de la couleur seule.
          </EnTete>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">États</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Nuancier nom="Favorable" hex="#6c8460" role="hausse, branché" />
                <Nuancier nom="Attention" hex="#b08a4a" role="à vérifier" />
                <Nuancier nom="Alerte" hex="#a4553a" role="baisse, bloqué" />
                <Nuancier nom="Saisi" hex="#5d7c95" role="donnée du client" />
              </div>
            </div>
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Origine d&apos;une donnée</p>
              <div className="flex flex-wrap gap-2">
                <Origine origine="mesuré" />
                <Origine origine="saisi" />
                <Origine origine="estimation" />
                <Origine origine="fictif" />
                <Origine origine={null} />
              </div>
              <p className="mb-3 mt-6 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Étiquettes et niveaux</p>
              <div className="flex flex-wrap items-center gap-3">
                <Puce ton="nuit">À lancer</Puce>
                <Puce ton="ocre">Déjà prévu</Puce>
                <Puce ton="brique">Bloqué</Puce>
                <Puce ton="vert">Branché</Puce>
                <Puce ton="gris">Suspendu</Puce>
                <Niveau libelle="Élevée" compact />
                <Niveau libelle="Moyenne" compact />
                <Niveau libelle="Basse" compact />
              </div>
            </div>
          </div>
        </section>

        {/* Composants */}
        <section>
          <EnTete surtitre="05" titre="Composants" />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="carte space-y-4 p-6">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Boutons et liens</p>
              <div className="flex flex-wrap gap-3">
                <span className="bouton">
                  Valider l&apos;action <Check className="h-4 w-4" />
                </span>
                <span className="bouton-clair">Modifier</span>
              </div>
              <span className="lien-charme">Voir le portrait</span>
              <p className="text-xs text-ink-soft">Un seul bouton plein par écran : l&apos;action principale. Le reste en bouton clair ou en lien.</p>
            </div>
            <div className="carte space-y-5 p-6">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Chiffre clé</p>
              <Chiffre libelle="Hiver 2025-2026" valeur="2 059" ecart={{ texte: "15 %", sens: "baisse" }} note="contre 2 430 sur les mêmes dates un an plus tôt" />
              <Chiffre libelle="Vendu en direct" valeur="52 %" ecart={{ texte: "1 pt", sens: "hausse" }} note="dont 6 % par le site" />
            </div>
            <div className="carte space-y-4 p-6">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Aide, vide, icônes</p>
              <Aide>Une phrase pour lire l&apos;écran, repliée par défaut.</Aide>
              <Vide>Rien ici pour l&apos;instant.</Vide>
              <div className="flex gap-3 text-ink">
                {[ListChecks, CalendarRange, FileText, Bell, Gauge, ArrowRight].map((I, i) => (
                  <span key={i} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream">
                    <I className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-soft">Icônes Lucide, trait 1,6, dans un rond à filet fin.</p>
            </div>
          </div>
        </section>

        {/* Graphiques */}
        <section>
          <EnTete surtitre="06" titre="Graphiques">
            Traits de 2 px, barres de 24 px au plus aux bouts arrondis, filets pleins, une seule échelle, survol sur chaque marque et tableau des chiffres. La saison en
            cours prend l&apos;accent de la maison, l&apos;année précédente le greige.
          </EnTete>
          <div className="grid gap-5 lg:grid-cols-2" data-maison="lodge-park">
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Comparaison de deux saisons</p>
              <Courbes
                ariaLabel="Exemple de comparaison de deux saisons"
                hauteur={200}
                series={[
                  { id: "n1", nom: "Hiver 2024-2025", couleur: COULEUR_N1, points: [120, 300, 330, 810, 860, 430].map((y, x) => ({ x, y })) },
                  { id: "n", nom: "Hiver 2025-2026", couleur: "var(--maison-accent)", aire: true, points: [140, 280, 310, 740, 620, 390].map((y, x) => ({ x, y })) },
                ]}
                ticksX={demoMois.map((libelle, x) => ({ x, libelle }))}
              />
            </div>
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Part par catégorie</p>
              <BarresH
                unite="pourcent"
                items={[
                  { id: "fr", libelle: "France", valeur: 0.3 },
                  { id: "uk", libelle: "Royaume-Uni", valeur: 0.11 },
                  { id: "us", libelle: "États-Unis", valeur: 0.05 },
                  { id: "autres", libelle: "Autres pays", valeur: 0.19, attenue: true },
                ]}
              />
            </div>
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Canaux : palette validée</p>
              <Empile
                categories={CANAUX.map((c) => ({ id: c.id, nom: c.nom, couleur: c.couleur }))}
                lignes={[{ id: "ex", libelle: "Exemple", valeurs: { direct: 46, site: 6, ota: 23, agences: 21, groupes: 4 } }]}
              />
              <p className="mt-2 text-xs text-ink-soft">
                Cinq teintes dans un ordre fixe, contrôlées pour le daltonisme (écart minimal entre voisines au-dessus du seuil recommandé). L&apos;ocre, plus clair,
                s&apos;accompagne toujours de son chiffre.
              </p>
            </div>
            <div className="carte p-6">
              <p className="mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-taupe">Délais (quartiles)</p>
              <Delais
                lignes={[
                  { id: "fr", libelle: "France", q1: 2, med: 10, q3: 31, n: 426 },
                  { id: "uk", libelle: "Royaume-Uni", q1: 6, med: 19, q3: 53, n: 124 },
                  { id: "ch", libelle: "Suisse", q1: 3, med: 6, q3: 22, n: 90 },
                ]}
              />
            </div>
          </div>
        </section>

        {/* Écriture */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="carte p-6">
            <EnTete surtitre="07" titre="Écriture" />
            <ul className="space-y-2 text-sm leading-relaxed text-ink-soft">
              <li>En français, phrases courtes, un verbe d&apos;action pour chaque action : « Envoyer la newsletter aux Britanniques ».</li>
              <li>Pas de tiret long, pas de dièse ni d&apos;astérisque comme marqueur.</li>
              <li>Chiffres sourcés et datés ; hypothèses déclarées comme telles.</li>
              <li>Rien de nominatif : des pays, des dates, des totaux.</li>
            </ul>
          </div>
          <div className="carte p-6">
            <EnTete surtitre="08" titre="Vocabulaire écarté" />
            <div className="flex flex-wrap gap-2">
              {VOCABULAIRE_INTERDIT.map((v) => (
                <span key={v} className="border border-line px-2.5 py-1 text-sm text-ink-soft line-through decoration-brick/70">
                  {v}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-soft">Vérifié automatiquement dans chaque brief produit par l&apos;agent.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
