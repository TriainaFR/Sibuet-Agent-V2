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
| Vos données | Saisie par le client de ce qui manque : ouverture et fermeture, délais par pays, remplissage par sujet, commission et panier moyen, taux des newsletters, accès Ads. Recalcul immédiat, marquage « saisi » ou « estimation », remplacement automatique par un flux. |
| Calendrier | Une ligne par sujet : réservation en pointillés, séjour en plein, newsletters prévues, vacances scolaires, densité d'événements. |
| Sujets | Classés par urgence puis intérêt. Fiche en cinq onglets : l'essentiel, par pays, actions (validation et brief), sur Google, pour aller plus loin. Export texte au gabarit P3. |
| Mesure | Résultat de chaque action, les quatre cas, propositions de recalibrage (délais, CRM, coûts des canaux, seuil neige). |
| Sources | Connecteurs et leur état, routine, historique des calculs, paramètres du calcul. |

Aucun chiffre d'indice n'est affiché au client : urgence élevée, moyenne ou basse ; intérêt haut, moyen ou bas ; visibilité peu visible, visible mais peu cliquée, bien placée.

## La routine du lundi

```bash
npm run routine                    # collecte complète, calcul, alertes (à planifier chaque lundi à 6 h)
npm run routine -- --rapide        # agenda limité aux prochaines semaines
npm run routine -- --sans-collecte # recalcul seul
npm run controle                   # rejoue le calcul du 23 sept. et le compare au calcul n° 5 de Jérôme
```

Chaque collecte produit un relevé daté dans `data/signaux/<source>/<date>.json`, jamais écrasé. Le contrôle donne aujourd'hui 67 fenêtres d'achat identiques sur 67 au calcul de Jérôme.

## Modifier sans galère

| Je veux… | Fichier |
|---|---|
| Ajouter ou réviser un sujet, ses requêtes, ses événements, ses envois liés | `data/reference/sujets/lodge-park_hiver-2026-2027.json` |
| Corriger un marché ou son délai de référence | `data/reference/marches.json` |
| Mettre à jour les vacances scolaires | `data/reference/vacances_scolaires_2026-2027.json` |
| Ajuster une règle du calcul (délais, seuils, vagues, neige) | `src/lib/engine/regles.ts` |
| Modifier les prompts de Jérôme (P0 à P5) | `prompts/` |
| Brancher une source | `src/connecteurs/` (voir `docs/ARCHITECTURE.md`) |
| Couleurs et typographies | `src/app/globals.css` |

## Documentation

- `docs/ARCHITECTURE.md` : les couches, et comment passer en production (base de données, API, connecteurs, authentification, hébergement).
- `docs/donnees-a-obtenir.md` : ce qui manque encore, par ordre d'urgence.
- `docs/cadrage/` : brief, modèle de données, registre des sources et schéma SQL de Jérôme.

## Règles du projet

Français. Pas de tiret long. Pas de dièse ni d'astérisque comme marqueur de texte. Chiffres sourcés et datés. Hypothèses déclarées comme telles. Rien de nominatif dans la base, réservations agrégées avant stockage. Le calendrier existant du client est complété ou déplacé, jamais ignoré. Une maison à la fois pour le pilote.

Stack : Next.js 16, TypeScript, Tailwind CSS 4, SDK Anthropic. Données en fichiers JSON pour la démo.
