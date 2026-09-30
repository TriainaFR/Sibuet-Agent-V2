# Imports : déposer ici les exports réels

Les fichiers `bookings.csv` et `gsc.csv` présents sont **simulés** (`npm run data:demo`).
Dès réception des vrais exports, il suffit de les remplacer, **avec les mêmes noms de colonnes** (séparateur virgule, UTF-8).
Le calendrier se recalcule au prochain chargement de page.

## bookings.csv : export du booking engine (Chloé / Clara)

| Colonne | Exemple | Remarque |
|---|---|---|
| id_reservation | R000123 | anonyme |
| maison | les-fermes-de-marie | id de `src/config/hotels.ts` |
| date_reservation | 2025-11-02 | AAAA-MM-JJ |
| date_arrivee | 2026-02-14 | AAAA-MM-JJ |
| nb_nuits | 5 | |
| pays | GB | code ISO à 2 lettres (FR, GB, NL, BE, CH, DE, IT, US, BR) |
| nb_adultes | 2 | |
| nb_enfants | 1 | |
| canal | direct-site | direct-site / telephone / ota / agence-voyage |
| montant_eur | 5400 | |
| statut | confirmee | `annulee` = ignorée |

## gsc.csv : Search Console (Jérôme)

| Colonne | Exemple |
|---|---|
| mois | 2025-11 |
| requete | marche de noel megeve |
| page | https://www.maisonsethotels-sibuet.com/... |
| pays | FR |
| clics | 42 |
| impressions | 1830 |
| position | 6.4 |

Les requêtes sont rapprochées des `keywords` de chaque moment (`src/config/moments.ts`) : penser à y ajouter les vraies requêtes qui ressortent de la Search Console.

## À venir

`ga4.csv`, `google-ads.csv`, `newsletters.csv` : les colonnes attendues sont listées sur la page **Sources de données** de l'outil.
