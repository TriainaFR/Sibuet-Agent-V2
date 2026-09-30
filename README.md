# Calendrier d'activation · Maisons & Hôtels Sibuet

Outil d'aide à la décision marketing : **de quoi parler, quand, à qui, avec quels leviers**, pour chaque maison du groupe.
Prototype Triaina. La démo porte sur Les Fermes de Marie (Megève) et La Bastide de Marie (Ménerbes).

## Lancer

```bash
npm install
cp .env.example .env.local   # ajouter ANTHROPIC_API_KEY pour « Rédiger avec Claude »
npm run dev                  # http://localhost:3000
```

## Ce que fait l'outil

1. **Calendrier** (`/`) : une timeline de 12 mois avec des fiches thématiques, filtrables par maison, marché et levier. Deux vues : « Quand agir » (date de lancement) et « Quand ça se passe » (date de l'événement).
2. **Fiche** (`/fiches/[id]`) : objectif, message, frise des fenêtres de décision par nationalité, plan d'actions daté par levier (RP, SEO/GEO, CRM, newsletter, Instagram, Google Ads, LinkedIn), données qui justifient la fiche, indicateurs à suivre. Le bouton **Rédiger avec Claude** génère les contenus (carrousel, annonces, articles, newsletters) dans le ton Sibuet et dans la langue de chaque marché.
3. **Fenêtres de réservation** (`/fenetres`) : délai médian entre la réservation et l'arrivée, par nationalité × mois, plus le rythme des réservations comparé à l'an dernier.
4. **Sources de données** (`/sources`) : statut de chaque source (réelle, simulée, en attente) et colonnes attendues.

## Comment la date de lancement est calculée

Pour chaque moment × maison, le moteur (`src/lib/engine/plan.ts`) :

- prend les nationalités présentes sur la même période les années précédentes (booking engine) ;
- calcule leur **fenêtre de réservation** (médiane, 25e et 75e centiles) : c'est la période où chaque marché prend sa décision ;
- fixe le lancement 14 jours avant que la moitié du volume (en nuitées) entre en décision. Les marchés précoces (long-courrier) sont adressés plus tôt via Ads et CRM ;
- cale chaque levier : RP 100 jours avant, SEO 6 semaines avant le pic de recherche (Search Console), newsletter par langue, Ads par pays pendant la fenêtre de chaque marché ;
- calcule une **priorité** à partir du volume des marchés, du retard de réservation vs N-1, de l'occupation de l'an dernier, de la résonance, de la demande de recherche et de l'urgence.

Toutes les règles (délais, seuils) sont regroupées dans `RULES`, en haut de `plan.ts`.

## Modifier sans galère

| Je veux… | Fichier |
|---|---|
| Ajouter ou modifier un événement, un marronnier ou un temps fort | `src/config/moments.ts` (copier un bloc) |
| Corriger une maison (saisons, description, répartition des nationalités) | `src/config/hotels.ts` |
| Ajouter une nationalité ou modifier un levier | `src/config/markets.ts` |
| Vacances scolaires GB / US / BR | `src/config/holidays-manual.ts` |
| Ajuster les délais et les seuils du moteur | `RULES` dans `src/lib/engine/plan.ts` |
| Changer le ton de Claude | `BRAND_VOICE` dans `src/app/api/draft/route.ts` |
| Couleurs et typographies de la charte | `src/app/globals.css` |

## Données

```bash
npm run data:fetch   # met à jour la météo, les vacances scolaires et les jours fériés (APIs gratuites)
npm run data:demo    # régénère les réservations et la Search Console simulées
npm run plan:check   # affiche toutes les fiches calculées dans le terminal
```

- `data/external/` : données réelles (Open-Meteo, OpenHolidays, Nager.Date).
- `data/imports/` : exports clients. **Déposer les vrais fichiers à la place des simulés** (voir `data/imports/README.md`).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · SDK Anthropic (Claude Opus 5.5). Pas de base de données : les fichiers de `data/` suffisent pour la démo. Déployable tel quel sur Vercel.
