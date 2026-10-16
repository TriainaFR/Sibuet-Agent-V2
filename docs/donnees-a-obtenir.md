# Ce qu'il reste à obtenir

État au 16 octobre 2026, après le dossier de transfert de Jérôme Hoerlé (Allin Conseil) et les exports Asterio du 14 octobre.

**Reçu le 14 octobre : exports Asterio « nuitées » des sept maisons** (nuits du 14 octobre 2024 au 14 octobre 2026). Ils donnent déjà les délais réels par pays, le rythme de remplissage, les canaux et la clientèle de chaque maison (page Maisons).

## Du poste de Jérôme (pour reprendre son travail sans le refaire)

Le dossier `C:\Users\User\OneDrive\Bureau\SIBUET\AGENT SIBUET\agent-sibuet-themes`, zippé sans le `.venv`. En particulier :

| Élément | Pourquoi |
|---|---|
| `04_donnees/sujets_lodge_park_hiver_2026-2027.json` | Fait foi pour les sujets, leurs requêtes et leurs événements. Le fichier de l'application en est une reconstitution. |
| `02_sources/scorer.py` | Formules exactes des facteurs demande et visibilité, pour aligner les scores (les fenêtres et les urgences le sont déjà). |
| Snapshot Search Console complet (11 Mo, 10 960 requêtes, 723 pages) | L'application n'a que les requêtes citées dans les fiches. Avec le complet : pays par requête, inventaire des pages, nouvelles requêtes (« hotel 5 étoiles megeve », « massage megeve »). |
| Dictionnaire 0.8 et `routine_lundi.md` | Le dossier transmis contient la version 0.1 du 17 septembre. |
| Snapshots de l'agenda (1 274 occurrences au 23 sept.) | Historique pour la détection des nouveautés. |
| `05_fiches/notes_techniques_lodge_park.md` | Dette technique et éditoriale du site, pour les activations correctives. |
| Mail révisé à Chloé | La version transmise date du 16 septembre. |
| Bases de marque Fermes de Marie et Mont-Blanc | Modèle pour produire celle du Lodge Park. |

Les connecteurs Semrush, Peec, ga4-gsc et Firecrawl sont rattachés à son compte Claude : à transférer, ou à recréer avec un compte de service Sibuet.

## Du client, par ordre d'urgence

| Donnée | Ce qu'elle débloque | Repli en attendant |
|---|---|---|
| Accès lecture Google Ads et Meta | 10 actions bloquées dans « À faire » au 5 octobre, dont la fenêtre américaine ouverte depuis le 2 octobre | Aucun |
| Dates d'ouverture et de fermeture du Lodge Park | Coupe ou maintient les sujets d'ouverture, de printemps et de Pâques | Saisie dans Vos données |
| Le même export Asterio « nuitées » que celui du 14 octobre, avec les nuits jusqu'au 30 avril 2027 (et non plus seulement jusqu'au 14 octobre) | Le remplissage à date de l'hiver 2026-2027 contre l'an dernier à la même date : le facteur besoin, sujet par sujet et pays par pays | Rythme de l'an dernier affiché dans chaque fiche |
| La ville d'origine (ou le code postal) dans l'export | La météo au départ ; les zones de vacances françaises et les cantons suisses distingués | Le pays seul |
| Réservations Asterio en flux (interface OnSite V3) | La même chose, mise à jour chaque lundi sans manipulation | Chargement manuel du fichier |
| Performance des newsletters et calendrier 2026-2027 arrêté | Lignes de base CRM, dates réelles des envois | Taux saisis dans Vos données |
| Accès Instagram | Résonance des sujets | Aucun |
| Search Console Gyp Sea et GA4 corporate | Extension aux autres maisons | Sans objet pour le pilote |

## À vérifier

- **Vacances belges** : la saisie (15 au 28 février) ne correspond ni à la Flandre (8 au 14 février) ni à la Fédération Wallonie-Bruxelles (22 février au 7 mars) selon OpenHolidays. Sans doute deux lignes de marché à créer.
- **Vacances néerlandaises** : OpenHolidays donne Noord et Midden du 20 au 28 février ; la période Midden saisie (27 février au 7 mars) n'est pas confirmée.
- **Dates 2027** de la Grande Odyssée (étape Megève) et de L'Élégance a du cœur.
- **Qui valide quoi**, et sous quel délai.
