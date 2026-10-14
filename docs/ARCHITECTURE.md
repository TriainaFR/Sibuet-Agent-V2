# Architecture et passage en production

## Les couches

```
connecteurs  →  dépôt (relevés datés)  →  moteur (calcul pur)  →  services  →  pages
src/connecteurs   src/stockage           src/lib/engine          src/services   src/app
```

1. **Connecteurs** (`src/connecteurs/`). Une source = un connecteur qui renvoie un `Releve` : source, date, mode (réel, import, fictif), origine, données, signaux normalisés. Trois états :
   - *branché* : collecte réelle (Open-Meteo, agenda de la station, OpenHolidays) ;
   - *import* : lit un export déposé dans `data/depot/<source>/` (Semrush, Search Console, newsletters, Asterio) ;
   - *à brancher* : accès à obtenir (GA4, Google Ads, Meta, Instagram, performance des newsletters). En démo, certains produisent des données fictives.
2. **Dépôt** (`src/stockage/depot.ts`). Toute lecture et écriture passe par l'interface `Depot`. Trois couches strictement séparées :
   - `data/reference/` : connaissance, une seule version, remplacée (marchés, maisons, sujets, vacances) ;
   - `data/signaux/` : observations datées, jamais écrasées ;
   - `data/etat/` : décisions (saisie client, validations, résultats, calculs, journal).
3. **Moteur** (`src/lib/engine/`). Fonctions pures, sans accès disque : fenêtres d'achat, score à trois facteurs, urgence, verdicts sur le plan d'envois, activations en vagues, liste « À faire », alertes. Paramètres dans `regles.ts`.
4. **Services** (`src/services/`). Assemblent le contexte (dernier relevé de chaque source et saisie), lancent la routine, produisent les briefs et la mesure. `reservations.ts` lit un export de réservations chargé depuis « Vos données » (Excel ou CSV, en-têtes français ou anglais reconnus), l'agrège en mémoire (délais par marché sur les séjours passés, nuitées-chambres à date par sujet et marché contre l'an dernier à la même date) et n'enregistre que ces totaux, comme un relevé `asterio` en mode import. Le fichier n'est jamais écrit sur disque.
5. **Pages** (`src/app/`). Calculées depuis la base à chaque chargement, jamais saisies à la main. Les actions serveur sont dans `src/app/actions.ts`.

## Passer en production

### 1. Base de données

Le schéma de Jérôme est dans `docs/cadrage/schema.sql` (SQLite, compatible PostgreSQL à quelques types près). Il suffit d'écrire une classe qui implémente `Depot` :
- `ecrireReleve` insère le relevé brut (table `releve`, à ajouter) et ses `signaux` dans la table `signal` ;
- `lireReleve` relit le dernier relevé d'une source (ou la vue `signal_dernier`) ;
- `lireReference` et `ecrireReference` portent sur `maison`, `marche`, `sujet`, `sujet_semantique`, `periode_vacances` ;
- `lireEtat` et `ecrireEtat` portent sur `opportunite`, `activation`, `resultat`, plus deux tables simples pour la saisie client et les validations.

Puis renvoyer cette classe dans la fonction `depot()`. Rien d'autre ne change. Choix conseillés : SQLite sur le VPS de la Content Factory (même choix que Jérôme), ou Postgres managé (Supabase, Neon) pour un hébergement serverless.

### 2. Connecteurs et API

| Source | Ce qu'il faut | Où l'écrire |
|---|---|---|
| Search Console | Compte de service Google en lecture sur `sc-domain:lodgepark.com`, API Search Analytics (requête × page × pays, 16 mois) | `src/connecteurs/imports.ts`, connecteur `gsc` |
| GA4 | Propriété 281196949 en lecture, Data API (sessions par pays et page d'entrée, passage SynXis) | nouveau connecteur `ga4` |
| Semrush | Clé API, rapports `phrase_fullsearch` et `phrase_these` par base pays | connecteur `semrush` |
| Asterio | Interface OnSite V3 (Septeo), `getReservationFileInformation` et `getRoomsInfos`. L'agrégation existe déjà (`src/services/reservations.ts`, utilisée par le chargement manuel) : il suffit de lui passer les lignes de l'API | connecteur `asterio` |
| Google Ads, Meta | Accès lecture, API Google Ads et Marketing API | connecteurs `google_ads`, `meta_ads` |
| Newsletters | Export ou API de l'outil d'emailing (à identifier) | connecteur `newsletters_perf` |

Chaque connecteur renvoie un `Releve` au même format : le moteur et l'interface ne changent pas.

### 3. Routine

`npm run routine` en tâche planifiée chaque lundi à 6 h (cron sur le VPS, ou tâche planifiée de l'hébergeur). La routine collecte, enregistre les relevés, recalcule et écrit les alertes.

### 4. Sécurité et accès

- Connexion par mot de passe déjà en place (`src/proxy.ts`, `src/lib/session.ts`, page `/connexion`) : elle s'active dès que `APP_PASSWORD` est défini, et protège les pages, les actions serveur et les routes `/api`. Variables : `APP_USER` et `APP_PASSWORD` pour le premier compte, `APP_USER_2` et `APP_PASSWORD_2` (jusqu'à 20) pour les suivants, `SESSION_SECRET`. Retirer un compte ou changer son mot de passe déconnecte ses sessions. Au-delà de quelques comptes, passer à un SSO Google ou à des liens magiques.
- Clé Claude côté serveur uniquement (`ANTHROPIC_API_KEY`).
- Rien de nominatif : agréger les réservations Asterio avant stockage.
- Le dépôt GitHub doit être privé : il contient des données du client.

### 5. Autres maisons

Une maison = un fichier de sujets (`data/reference/sujets/<maison>_<saison>.json`), un point météo et une URL d'agenda dans `maisons.json`. Le moteur est déjà générique.

## Ce que fait le calcul

- **Fenêtre d'achat** : début du séjour moins 1,6 fois le délai médian du marché, jusqu'au début moins 0,6 fois. Délai issu d'Asterio, sinon de la saisie, sinon de l'hypothèse.
- **Score** : demande × reste à gagner sur Google × besoin de remplissage. Un facteur non mesuré vaut 0,5 et est déclaré manquant. (Le facteur marge, commission évitée sur les plateformes, a été retiré le 6 oct. 2026 : l'outil est centré sur la vente directe dès le départ.)
  - Demande : volume Semrush des requêtes d'achat du sujet sur la base du marché, normalisé en logarithme sur le maximum de la maison, pondéré par la proximité du pic. 0,2 si aucune requête d'achat.
  - Reste à gagner : position Search Console des requêtes d'achat, de 0,2 (position 1) à 1 (position 30 ou absente).
  - Besoin : 1 moins nuitées réservées sur nuitées N-1 à la même date (fichier de réservations chargé ou Asterio), sinon remplissage saisi.
- **Urgence** : 1 si la fenêtre est ouverte, 0 si elle est passée, sinon décroissante sur 26 semaines (plancher 0,3). L'ordre de travail est le score multiplié par l'urgence.
- **Activations** : CRM au premier tiers de la fenêtre, marchés à moins de 10 jours regroupés en vagues ; référencement en ligne 6 semaines avant le pic ; Google Ads pour les marchés proches, Meta pour les lointains, à l'ouverture de leur fenêtre ; Instagram autour des événements ; déclencheur neige à 20 cm prévus sur 5 jours.
- **Contraintes** : maison fermée, envoi déjà prévu (verdict par marché et par langue), page existante à mettre à jour plutôt qu'à créer, sujet déjà bien vendu, accès manquant.

Les formules exactes de demande et de visibilité de Jérôme (`scorer.py`) ne sont pas dans le dossier de transfert : elles sont approchées et documentées dans `src/lib/engine/calcul.ts`. Les fenêtres d'achat et les urgences sont identiques à son calcul n° 5, les scores en sont proches.
