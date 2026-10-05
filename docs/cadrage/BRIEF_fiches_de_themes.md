AGENT SIBUET, FICHES DE THEMES
Brief de conception, version 0.1 du 17 septembre 2026
Maison pilote : Lodge Park, Megève. Saison pilote : hiver 2026-2027.


1. OBJET

Produire, pour chaque maison et chaque saison, un jeu de fiches de thèmes. Une fiche est un sujet de communication extrait de la saisonnalité (vacances scolaires par marché émetteur, événements de la station, déclencheurs comme la neige, fenêtres B2B), enrichi des signaux de demande et de performance disponibles, et traduit en activations par canal : brief, timing, budget, KPI.

Le système ne publie rien. Il propose, l'équipe marketing valide, la Content Factory et les canaux exécutent. Cadence : détection hebdomadaire, activations mensuelles, plan saisonnier.


2. PRINCIPE DIRECTEUR

Chaque source ne rentre dans le système que sous la forme d'un signal daté, rattaché à une maison, à une semaine de séjour et, quand c'est possible, à un marché émetteur. Rien n'est modélisé en soi, tout est modélisé par rapport à une semaine à remplir. La fiche de thème est une vue compilée de ces signaux, l'activation est un calcul sur cette vue.


3. LES QUATRE OBJETS

Signal. Une observation : source, type (demande, contexte, contrainte, performance, besoin), maison, marché, semaine cible, valeur, date d'observation. Snapshots datés, jamais écrasés.

Sujet. Un thème durable : nom, famille (saisonnier, événementiel, déclencheur, B2B), période de séjour, sémantique (requêtes, vocabulaire de marque, vocabulaire interdit), contenus existants rattachés, historique des activations. Un sujet survit d'une saison à l'autre.

Opportunité. Un sujet croisé avec une maison, une fenêtre de séjour et un marché, à une date de calcul : score, type (offensive, défensive, correctif), besoin, statut. Émise chaque semaine par le détecteur.

Activation. Une opportunité traduite en action sur un canal : brief, dates, déclencheur, budget, KPI cible, résultat mesuré. C'est le registre qui rend possibles la mesure (bloc 4) et l'apprentissage (bloc 5).

Le schéma SQL est dans 01_modele/schema.sql, le dictionnaire dans 01_modele/modele_donnees.md.


4. SOURCES ET SIGNAUX

Registre complet dans 02_sources/registre_sources.md. Résumé :

- Météo, Open-Meteo, hebdomadaire. Contexte. Chutes à J-10 historiques par semaine, prévision 5 et 16 jours. Déclencheur pour les marchés courts, argument dans le brief. Ne pèse pas dans le score.
- Semrush, mensuel. Demande générique. Volume, tendance 12 mois, pic, par base pays. Découverte des sujets, datation du pic, sémantique. Règle : le contenu SEO est en place 6 à 8 semaines avant le pic.
- Search Console, hebdomadaire, déjà branché via la Content Factory. Demande captée. Impressions, clics, position par requête et par page. Écart de visibilité, mise à jour contre création, ligne de base des KPI SEO.
- GA4, hebdomadaire. Performance. Sessions par pays et page d'entrée, passage vers SynXis, conversions. Mix de marchés réel, ligne de base de conversion, proxy de réservation tant qu'Asterio n'est pas branché.
- Blogs et pages des sites, crawl trimestriel Screaming Frog plus Content Factory. Contrainte. Inventaire des contenus par sujet, langue, fraîcheur, performance. Correctifs, maillage, pas de doublon.
- Calendrier newsletters, fichier client, saisonnier. Contrainte. Envois prévus par maison, cible, thème, base, date. Le plan existant, à compléter ou déplacer, jamais ignoré.
- Performance newsletters, export client, mensuel. Performance. Par envoi : volume, ouvertures, clics, réservations J+10 par pays. Taux de réponse par thème et marché, ligne de base CRM.
- Instagram du groupe, API Meta ou export, mensuel. Performance et contexte. Par publication : thème, date, portée, enregistrements, clics. Résonance d'un sujet, calendrier social. Ne prédit pas la réservation.
- Google Ads et Meta Ads, accès lecture ou export, mensuel. Performance et coût. Par campagne : période, budget, clics, conversions, CPA. Marge du canal dans le score, enveloppes, historique par sujet.
- Booking, Asterio OnSite V3, hebdomadaire. Besoin et résultat. Par semaine de séjour et marché : on the books, pickup contre N-1, délais en quartiles, annulations, canal, part spa et restauration. Moteur du timing et mesure finale.
- Agenda de la station, megeve-tourisme.fr, hebdomadaire. Contexte. Événements datés, catégorie, durée. Sujets événementiels, dates confirmées.
- Vacances scolaires par marché, annuel. Contexte. Périodes par pays et zone.


5. SCORE D'UNE OPPORTUNITE

Quatre facteurs ramenés entre 0 et 1, multipliés, affichés sur 100.

- Demande : volume Semrush des requêtes du sujet, pondéré par la proximité du pic, plus impressions GSC de la maison sur ces requêtes.
- Écart de visibilité : position GSC moyenne et part de voix Peec sur les requêtes du sujet, inversées. Une maison déjà première a un écart proche de zéro.
- Besoin : écart entre on the books de la fenêtre et rythme N-1 à la même date, borné par le disponible réel (getRoomsInfos). Besoin négatif : opportunité défensive, brief différent, pas rejetée.
- Marge : coût attendu du canal (CPA Ads observé, coût CRM quasi nul, coût de production contenu) rapporté à la commission OTA évitée sur le panier moyen.

Un facteur absent vaut 0,5 et la fiche l'affiche comme manquant, avec la source qui le fournira. Le score est une priorité, pas une vérité.


6. TIMING ET CANAL, PAR MARCHE

Fenêtre d'achat d'un marché pour une période de séjour = début de la période moins le troisième quart du délai de réservation, jusqu'à début de la période moins le premier quart. Délais issus d'Asterio par marché et par saison. Tant qu'ils manquent : hypothèses de 04_donnees/delais_reservation_hypotheses.json.

Canal déduit du temps restant à la date du calcul :
- plus de 12 semaines : SEO, GEO, contenu de fond
- 4 à 12 semaines : contenu, CRM, Meta, agences
- moins de 4 semaines : SEA, push, CRM flash
- moins de 10 jours, marchés courts (Genève, Vaud, zone A) : déclencheur neige, SEA et push activés sur prévision

Contraintes qui coupent ou modifient une activation :
- maison fermée sur la fenêtre (Asterio getRoomsInfos)
- envoi CRM déjà prévu dans la fenêtre : compléter ou déplacer, ne pas doubler
- contenu existant sur le sujet : mise à jour plutôt que création
- aucune publication autonome en production, validation humaine obligatoire


7. GABARIT DE LA FICHE DE THEME

En tête
- nom du sujet, famille, maison, saison
- période de séjour, marchés et cibles
- résumé en deux lignes : pourquoi ce sujet, pourquoi maintenant

Signaux
- demande : requêtes Semrush avec volume, tendance, pic ; requêtes GSC captées
- contexte : vacances par marché, événements rattachés, neige historique et prévision
- contraintes : envois CRM prévus, contenus existants, ouverture de la maison
- performance passée : envois, campagnes, publications sur ce sujet, avec résultats
- besoin : on the books et pickup de la fenêtre contre N-1 (ou mention "non disponible")

Grille
- semaine par semaine, une ligne par marché : vacances, fenêtre d'achat, envois prévus, neige

Activations, une par canal, même gabarit pour toutes
- objectif et type : offensive, défensive, correctif
- marché et segment
- message clé, sémantique cible (requêtes, vocabulaire de marque autorisé, cliché interdit)
- assets : page ou article à produire ou à mettre à jour (URL existante), visuels, offre
- timing : début, fin, déclencheur, justification (délai du marché, pic Semrush, événement)
- budget ou effort
- KPI cible avec ligne de base (ou "pas de référence")
- statut et validateur

KPI par canal
- SEO et GEO : impressions, clics, position sur les requêtes cibles ; présence dans les réponses IA (Peec)
- CRM : ouvertures, clics, réservations directes J+10 par pays
- Ads : CPA, réservations attribuées, ROAS
- social : portée, enregistrements, clics sortants
- commun à tous : pickup de la semaine visée contre N-1, seule mesure partagée

Un exemple rempli est dans 05_fiches/exemple_fiche_vacances_hiver.md.


8. BOUCLE ET CADENCE

- Lundi : collecte (météo, GSC, GA4, Asterio, agenda station), détection, mise à jour des scores, alertes sur les changements (événement daté, fenêtre qui s'ouvre, période qui se vide).
- Mensuel : Semrush, Ads, newsletters, Instagram ; production des activations du mois M+1, validation.
- Saisonnier : calendrier newsletters, crawl des sites, révision des sujets et de leurs sémantiques.
- Après chaque période de séjour : résultat écrit dans l'activation ; recalibrage des délais, des taux de réponse par thème et des poids des canaux.


9. STOCKAGE ET ARCHITECTURE

- Signaux : fichiers JSON datés par source et par collecte (ce que fait déjà le collecteur d'agenda). Jamais écrasés.
- Sujets, opportunités, activations, résultats : une base SQLite, même choix que la Content Factory.
- Pas de temps réel, pas d'entrepôt.
- La Content Factory reste l'outil de production. Ses alertes GSC sont consommées comme signaux, jamais recalculées. Elle devient un canal d'activation alimenté par les briefs.


10. ETAT DES SOURCES AU 17 SEPTEMBRE 2026

Branché ou en main : GSC (6 sites sur 7, Gyp Sea manquant), GA4 (6 sur 7, corporate manquant), Semrush, calendrier newsletters 2025-2026 (2026-2027 non mis à jour), Open-Meteo (historique cinq saisons collecté, prévision à brancher en cron), agenda station (collecteur écrit, à lancer), vacances scolaires 2026-2027 (FR, UK, GE, VD vérifiées ; BE, NL à vérifier).

À demander : interface Asterio OnSite V3 en lecture (ou export XLS mensuel en attendant), commissions OTA, accès lecture Google Ads et Meta, performance newsletters, accès Instagram, Search Console Gyp Sea, GA4 corporate, calendrier newsletters 2026-2027 arrêté.

Non couvert en v1 : CRM, metasearch, prescripteurs.


11. PROCHAINES ETAPES

1. Lancer le collecteur d'agenda et le cron météo sur le VPS, vérifier les sorties.
2. Mettre à jour le mail à Chloé avec les quatre demandes prioritaires révisées (Asterio, commissions, GSC Gyp Sea, calendrier éditorial hors newsletters).
3. Créer la base SQLite depuis 01_modele/schema.sql, charger les sujets de 05_fiches/lodge-park-sujets-saison.html comme premiers enregistrements.
4. Exécuter les prompts P1 à P4 sur Lodge Park hiver 2026-2027 pour produire les dix fiches complètes.
5. Présenter les fiches à l'équipe Sibuet, recueillir qui valide quoi et sous quel délai.
