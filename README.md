# Agent Sibuet

Détecteur d'opportunités marketing multicanal pour Maisons & Hôtels Sibuet.
Maison pilote : **Lodge Park, Megève, hiver 2026-2027**. Construit sur le cadrage et les données d'Allin Conseil (Jérôme Hoerlé), dossier de transfert du 5 octobre 2026.

Le système croise trois choses : ce que les gens cherchent, ce que la maison est en train de remplir, ce que ça coûte. Il produit des fiches de thèmes : un sujet, sa période, le moment où chaque marché réserve, les actions par canal en vagues, datées, avec indicateur et ligne de base. **Le système propose, l'équipe valide. Aucune publication autonome.**

## Lancer la démo

```bash
npm install
npm run dev          # http://localhost:3000
```

Tout fonctionne sans base de données ni clé :
- les données réelles collectées (Semrush, Search Console, agenda, neige, vacances, plan newsletters) sont dans `data/signaux/` ;
- les briefs par canal sont produits au gabarit P4 sans IA, ou par Claude si `ANTHROPIC_API_KEY` est renseignée dans `.env.local` ;
- un interrupteur « données fictives » (page Sources) invente réservations, performance des newsletters et Google Ads pour montrer la boucle complète. Ces données sont marquées « fictif » partout.

## Les pages

| Page | Rôle |
|---|---|
| À faire | Les actions des six prochaines semaines, datées, avec ce qui les bloque. Ce qui a changé depuis le calcul précédent. |
| Vos données | Chargement d'un fichier de réservations (Excel ou CSV : date de réservation, pays et ville d'origine, dates de séjour, guests, chambres, type de chambre), agrégé à la lecture et jamais conservé : il fournit les délais par pays et le remplissage de chaque sujet contre l'an dernier. Puis saisie de ce qui manque : ouverture et fermeture, délais, remplissage, taux des newsletters, accès Ads. Recalcul immédiat, marquage « saisi » ou « estimation », remplacement automatique par un flux. |
| Maisons | Portrait de chaque maison du groupe tiré des exports Asterio (nuits du 14 oct. 2024 au 14 oct. 2026) : saison contre saison, pays, délais de réservation, calendrier d'achat, canaux, rythme de remplissage, six constats rédigés. Vue groupe et comparaison des sept maisons. Chaque portrait prend la charte de sa maison. |
| Charte graphique | Le design system : principes, identité de chaque maison relevée sur son site, typographie, couleurs fonctionnelles, composants et graphiques. |
| Calendrier | Une ligne par sujet : réservation en pointillés, séjour en plein, newsletters prévues, vacances scolaires, densité d'événements. |
| Sujets | Classés par urgence puis intérêt. Fiche en cinq onglets : l'essentiel, par pays, actions (validation et brief), sur Google, pour aller plus loin. Export texte au gabarit P3. |
| Mesure | Résultat de chaque action, les quatre cas, propositions de recalibrage (délais, CRM, coûts des canaux, seuil neige). |
| Sources | Connecteurs et leur état, routine, historique des calculs, paramètres du calcul. |

Aucun chiffre d'indice n'est affiché au client : urgence élevée, moyenne ou basse ; intérêt haut, moyen ou bas ; visibilité peu visible, visible mais peu cliquée, bien placée.

## Rejouer une saison passée

Les exports Asterio s'arrêtent aux nuits déjà passées : pas encore de réservations à date pour l'hiver qui vient. La démonstration rejoue donc l'**hiver 2025-2026** : l'agent recalculé à une date passée (16 octobre 2025 par défaut, autres dates au choix dans l'en-tête), avec les seules réservations enregistrées à cette date, comparées à l'an dernier au même moment, le plan d'envois 2025-2026 et les vacances de la saison. La page Mesure montre ensuite ce qui s'est réellement passé, sujet par sujet.

Réel en rejeu : réservations à date, délais mesurés sur l'hiver précédent, plan d'envois, vacances, ouverture et fermeture lues dans les réservations. Approché : demande Google (relevés de septembre 2026). Non rejoués : agenda de la station, prévision neige. La saison en cours (hiver 2026-2027) reste un clic plus loin, et la routine du lundi travaille toujours sur elle.

Saisons et dates proposées : `data/reference/saisons.json` ; sujets et vacances par saison : `data/reference/sujets/`, `data/reference/vacances_scolaires_<saison>.json`.

## La routine du lundi

```bash
npm run routine                    # collecte complète, calcul, alertes (à planifier chaque lundi à 6 h)
npm run routine -- --rapide        # agenda limité aux prochaines semaines
npm run routine -- --sans-collecte # recalcul seul
npm run controle                   # rejoue le calcul et le compare au calcul n° 5 de Jérôme
npm run asterio                    # importe les exports Asterio déposés dans data/depot/asterio-historique/
```

Chaque collecte produit un relevé daté dans `data/signaux/<source>/<date>.json`, jamais écrasé. Avant l'historique Asterio, le contrôle donnait 67 fenêtres d'achat identiques sur 67 au calcul de Jérôme ; depuis, les délais sont mesurés par période et par pays sur les deux hivers précédents, et les fenêtres s'en écartent logiquement.

Les exports Asterio bruts ne sont jamais versionnés (`.gitignore`) : seuls leurs agrégats le sont (`data/signaux/asterio_historique/`).

## Modifier sans galère

| Je veux… | Fichier |
|---|---|
| Ajouter ou réviser un sujet, ses requêtes, ses événements, ses envois liés | `data/reference/sujets/lodge-park_hiver-2026-2027.json` |
| Corriger un marché ou son délai de référence | `data/reference/marches.json` |
| Mettre à jour les vacances scolaires | `data/reference/vacances_scolaires_2026-2027.json` |
| Ajuster une règle du calcul (délais, seuils, vagues, neige) | `src/lib/engine/regles.ts` |
| Modifier les prompts de Jérôme (P0 à P5) | `prompts/` |
| Brancher une source | `src/connecteurs/` (voir `docs/ARCHITECTURE.md`) |
| Couleurs et typographies (groupe et thèmes de maison) | `src/app/globals.css`, décrits dans `src/lib/da.ts` et sur la page /charte |
| Saisons, chambres et nom Asterio d'une maison | `data/reference/maisons.json` |

## Documentation

- `docs/ARCHITECTURE.md` : les couches, et comment passer en production (base de données, API, connecteurs, authentification, hébergement).
- `docs/donnees-a-obtenir.md` : ce qui manque encore, par ordre d'urgence.
- `docs/cadrage/` : brief, modèle de données, registre des sources et schéma SQL de Jérôme.

## Règles du projet

Français. Pas de tiret long. Pas de dièse ni d'astérisque comme marqueur de texte. Chiffres sourcés et datés. Hypothèses déclarées comme telles. Rien de nominatif dans la base, réservations agrégées avant stockage. Le calendrier existant du client est complété ou déplacé, jamais ignoré. Une maison à la fois pour le pilote.

Stack : Next.js 16, TypeScript, Tailwind CSS 4, SDK Anthropic. Données en fichiers JSON pour la démo.
