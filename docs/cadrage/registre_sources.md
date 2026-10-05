REGISTRE DES SOURCES
Version 0.1, 17 septembre 2026. Une entrée par source : ce qu'elle apporte, comment on la lit, à quelle cadence, où elle en est.


1. OPEN-METEO (météo et neige)
Apporte : chutes de neige et températures par jour, historique depuis 1940 (réanalyse) et prévision 16 jours, point Megève 45.857 / 6.617 à 1113 m.
Accès : API publique sans clé. Interdit aux robots d'extraction, donc collecte par script serveur (02_sources/collect_open_meteo.py), pas par outil d'IA.
Cadence : hebdomadaire (lundi). Historique collecté une fois par saison.
Limite : maille 9 à 25 km, sous-estime la neige en montagne. Chutes, pas hauteur au sol. Signal de tendance et de déclenchement, pas de mesure au pied des pistes.
Signaux : snow10_mean, snow_prev_5j, snow_prev_16j, temp_moy_semaine.
État : historique cinq saisons collecté (04_donnees). Cron à installer.

2. SEMRUSH
Apporte : volumes, tendances 12 mois, difficulté, requêtes associées, par base pays (fr, uk, ch, be, nl, us). Concurrents organiques et paid d'un domaine.
Accès : connecteur MCP Semrush, rapports phrase_fullsearch, phrase_these, phrase_related, organic_research. Chaque appel consomme des unités API.
Cadence : mensuel, plus un passage saisonnier pour la découverte de sujets.
Limite : tendance = moyenne 12 mois, pas de multi-annuel. Index du tableau : juin (année N-1) à mai (année N) à la date de septembre 2026, à recaler à chaque collecte.
Signaux : volume, pic_mois, kd, par requête et sujet.
État : branché. Extrait de départ dans 04_donnees/semrush_megeve_tendances_2025-06_2026-05.csv.

3. GOOGLE SEARCH CONSOLE
Apporte : impressions, clics, position, CTR par requête, page, pays, appareil, sur 16 mois.
Accès : connecteur ga4-gsc (gsc_performance, gsc_inspect_url) et Content Factory (alertes CTR, clics perdus et à gagner, maillage).
Cadence : hebdomadaire.
Limite : Gyp Sea sans propriété GSC. Villa Marie a trois propriétés, prendre la bonne (audit GSC/GA4). Données anonymisées sous seuil.
Signaux : impressions, clics, position, ctr, alerte_factory.
État : branché sur 6 sites sur 7. Demande en cours : Gyp Sea.

4. GA4
Apporte : sessions, pays, page d'entrée, événements, passage vers SynXis (suivi inter domaines be.synxis.com), conversions.
Accès : connecteur ga4-gsc (ga4_report).
Cadence : hebdomadaire.
Limite : corporate sans GA4 actif. Doublons de propriétés mortes, voir l'audit. Attribution réservation approximative tant qu'Asterio n'est pas branché.
Signaux : sessions, sessions_synxis, conversions, taux_conv par pays.
État : branché sur 6 sites sur 7.

5. BLOGS ET PAGES DES SITES
Apporte : inventaire des contenus par maison et par langue, fraîcheur, schéma, maillage, performance croisée avec GSC.
Accès : crawl Screaming Frog (règle : Screaming Frog pour tout crawl, Firecrawl seulement sous 5 pages). Export Internal HTML plus Custom Extraction date de mise à jour. Content Factory pour le module d'enrichissement (diff en ligne / proposé).
Cadence : trimestriel, et à chaque nouvelle saison de sujets.
Limite : la version anglaise des sites est une traduction automatique défectueuse, ne jamais l'utiliser comme base de marque.
Signaux : contenu_existant (alimente sujet_contenu).
État : crawl complet Lodge Park disponible dans la factory. À refaire par saison.

6. CALENDRIER NEWSLETTERS (plan client)
Apporte : envois prévus par maison, cible (Indiv, Agences, MICE, Wedding), thème, base visée, dates.
Accès : fichier Excel transmis par Sibuet, une feuille par exercice.
Cadence : saisonnier.
Limite : le fichier 2026-2027 reconduit 2025-2026 sans mettre à jour les dates. Demander la version arrêtée.
Signaux : envoi_prevu.
État : 2025-2026 exploitable, 2026-2027 en intention. Extrait Lodge Park dans 04_donnees/envois_crm_lodge_park_2025-2026_reportes.json.

7. PERFORMANCE NEWSLETTERS
Apporte : par envoi, volume, ouvertures, clics, réservations dans les 10 jours par pays.
Accès : export mensuel de l'outil d'emailing (outil non identifié, question posée dans le mail à Chloé).
Cadence : mensuel.
Limite : agrégé par envoi et par pays, jamais nominatif. Attribution J+10 par rapprochement de dates, pas par lien technique.
Signaux : envois, ouvertures, clics, resa_j10.
État : à demander (flux 28).

8. INSTAGRAM DU GROUPE
Apporte : publications par compte, date, portée, enregistrements, clics, thème détecté.
Accès : API Meta Graph (compte professionnel, jeton longue durée) ou export mensuel Meta Business Suite.
Cadence : mensuel.
Limite : mesure la résonance d'un sujet, pas la réservation. Le thème est déduit du texte et des hashtags, à contrôler.
Signaux : portee, enregistrements, clics par publication.
État : à demander (flux 34, stats réseaux sociaux).

9. GOOGLE ADS ET META ADS
Apporte : campagnes, périodes, budgets, mots clés et termes de recherche (Google), audiences (Meta), clics, conversions, CPA.
Accès : accès en lecture aux comptes (préféré) ou export mensuel.
Cadence : mensuel.
Limite : CPA en conversions site, pas en nuitées, tant qu'Asterio ne permet pas le rapprochement.
Signaux : budget, clics, conversions, cpa par campagne et sujet.
État : à demander (flux 21 à 23).

10. ASTERIO ONSITE V3 (PMS, booking)
Apporte : réservations avec creationDate, startDate, endDate, channel, country, nationality, language, segmentation, rateCode, forfaitCode, cancelled, montant, prestations classées hébergement, restauration, spa (getReservationFileInformation) ; état des chambres à une date, fermetures avec motif (getRoomsInfos) ; produits et tarifs (getProductsAndRates).
Accès : interface OnSite V3 à créer par Septeo dans Asterio (Paramétrage, Super administrateur, Interfaces), login dédié. Fenêtre 365 jours par appel, pagination 100, filtre changeSince pour le delta.
Cadence : hebdomadaire (delta), historique 24 mois une fois.
Limite : flux nominatif. Une brique d'agrégation est obligatoire entre l'API et le socle : on ne stocke que des comptages par mois, maison, semaine, marché, canal, typologie. Aucune donnée nominative conservée. Coût et délai Septeo à confirmer. En attendant : export XLS mensuel agrégé.
Signaux : otb, otb_n1, pickup_7j, delai_q1/med/q3, annulations_7j, part_direct, part_ota, part_spa, part_resto, fermetures.
État : PMS identifié, documentation en main (04_donnees/sources_client). Interface à demander.

11. AGENDA DE LA STATION (megeve-tourisme.fr)
Apporte : 1 173 occurrences d'événements, une par date, avec catégorie, lieu, prix, période ; pages temps forts pour les grands rendez-vous.
Accès : collecteur 02_sources/collect_agenda_megeve.py, 118 pages de listing, une seconde entre chaque. Les dates ne sont ni dans les titres ni dans les H1, un crawl standard ne suffit pas.
Cadence : hebdomadaire.
Limite : beaucoup de bruit (marché hebdomadaire, expositions longues, ateliers en 50 occurrences). Filtrer par catégorie et par durée : occurrence unique ou événement de 2 à 4 jours = sujet ; période de plusieurs mois = décor.
Signaux : evenement (alimente la table evenement).
État : collecteur écrit, à lancer. Saisie manuelle de départ dans 04_donnees/evenements_megeve_2026-2027.json.

12. VACANCES SCOLAIRES PAR MARCHE
Apporte : périodes de vacances par pays et zone.
Accès : France data.education.gouv.fr (API), Angleterre gov.uk et conseils locaux, Genève ge.ch, Vaud vd.ch, Belgique enseignement.be, Pays-Bas rijksoverheid.nl, États-Unis calendrier fédéral.
Cadence : annuel, dès publication des arrêtés (France : octobre de l'année précédente).
Limite : Angleterre non uniforme (par conseil), Pays-Bas en trois régions.
Signaux : periode (alimente periode_vacances).
État : 2026-2027 dans 04_donnees/vacances_scolaires_2026-2027.json, FR, UK, GE, VD vérifiées, BE et NL à vérifier.

13. PEEC AI (visibilité dans les moteurs IA)
Apporte : part de voix et citations par prompt suivi, par moteur.
Accès : connecteur MCP Peec.
Cadence : mensuel.
Signaux : part_voix_ia par sujet.
État : branché, projets à configurer sur les sujets Lodge Park.


SOURCES NON RETENUES EN V1
CRM client, metasearch (Google Hotel Ads, Trivago), prescripteurs (Virtuoso, Amex FHR), rate shopping concurrents, avis clients. Listées dans le fichier des flux, à reconsidérer en v2.
