MODELE DE DONNEES, DICTIONNAIRE
Version 0.1, 17 septembre 2026. Schéma exécutable dans schema.sql.


PRINCIPES

- Trois couches strictement séparées, comme dans le cadrage : données (signaux, snapshots datés), connaissance (sujets, sémantiques, contenus, marchés, calendriers), décisions (opportunités, activations, résultats).
- Grain commun : maison x semaine de séjour x marché. Tout signal qui peut être rattaché à ce grain l'est. Les autres (Semrush générique, Instagram) sont rattachés au sujet.
- On n'écrase jamais un signal. On insère une nouvelle observation avec sa date. La vue signal_dernier donne l'état courant.
- Un facteur de score absent vaut 0,5 et est listé dans opportunite.facteurs_manquants.


TABLES DE REFERENCE

maison : les huit maisons Sibuet plus corporate, avec leurs identifiants dans chaque outil.
marche : les marchés émetteurs. La correspondance Asterio se fait sur country puis nationality puis language, dans cet ordre. Un marché français est découpé en trois zones scolaires, ce qui suppose de rattacher un client français à sa zone par le département du code postal.
periode_vacances : les vacances par marché et saison. Rechargée chaque année (flux 41).
evenement : l'agenda de la station, clé de récurrence event_key pour reconnaître le même événement d'une année sur l'autre.


SIGNAL, CLES PAR SOURCE

open_meteo, type contexte, grain semaine
- snow10_mean : chutes cumulées sur les 10 jours précédant la semaine, moyenne cinq saisons, cm
- snow10_saison_N : même mesure pour une saison donnée
- snow_prev_5j, snow_prev_16j : prévision cumulée, cm
- temp_moy_semaine : °C

semrush, type demande, grain sujet et marché
- volume : volume mensuel moyen d'une requête (valeur_texte = requête, detail_json = tendance 12 mois)
- pic_mois : mois de pic
- kd : difficulté

gsc, type demande captée, grain maison, sujet, requête ou page
- impressions, clics, position, ctr sur 28 jours et 12 mois
- alerte_factory : alerte reprise telle quelle de la Content Factory (detail_json)

ga4, type performance, grain maison et marché
- sessions, sessions_synxis, conversions, taux_conv par pays et par page d'entrée, 28 jours

crawl, type contrainte, grain maison et sujet
- contenu_existant : URL, langue, fraîcheur (alimente sujet_contenu)

nl_calendrier, type contrainte, grain maison et date
- envoi_prevu : valeur_texte = thème, detail_json = cible, base

nl_perf, type performance, grain maison, marché, sujet
- envois, ouvertures, clics, resa_j10

instagram, type performance et contexte, grain sujet
- portee, enregistrements, clics par publication, detail_json = thème détecté

gads et meta_ads, type performance et coût, grain maison, sujet, marché
- budget, clics, conversions, cpa par campagne et période

asterio, type besoin et résultat, grain maison, marché, semaine de séjour
- otb : nuitées réservées à date pour la semaine
- otb_n1 : même mesure à la même date l'an dernier
- pickup_7j : nuitées prises sur 7 jours
- delai_q1, delai_med, delai_q3 : booking window en semaines
- annulations_7j
- part_direct, part_ota
- part_spa, part_resto : part des séjours avec prestation

agenda_station, type contexte, grain destination et date
- evenement : alimente la table evenement

vacances, type contexte
- periode : alimente periode_vacances


OBJETS DE DECISION

sujet : durable, révisé chaque saison. L'identifiant est stable (fevrier, spa) pour permettre l'historique.
sujet_semantique : quatre types. Les requêtes viennent de Semrush et GSC, le vocabulaire de marque de la base de marque de la maison, le vocabulaire interdit des règles éditoriales (cliché, tiret quadratin), les termes newsletter des objets d'envoi passés.
sujet_contenu : ce qui existe déjà sur le sujet, avec la décision mise à jour ou création.
opportunite : recalculée chaque lundi. Une nouvelle ligne par calcul, l'ancienne garde son statut. Le score est une priorité de travail.
activation : une par canal et par opportunité. Le brief complet est stocké en markdown dans brief_md, produit par le prompt P4, validé par un humain avant statut validee.
resultat : mesures après la période, plusieurs lignes par activation. pickup_vs_n1 est la mesure commune à tous les canaux.


REGLES DE CALCUL

Fenêtre d'achat : achat_debut = fenetre_debut moins delai_q3 semaines, achat_fin = fenetre_debut moins delai_q1 semaines.
Canal : selon le nombre de semaines entre la date de calcul et fenetre_debut (plus de 12 : seo, geo, contenu ; 4 à 12 : contenu, crm, meta, agences ; moins de 4 : sea, push, crm flash ; moins de 10 jours sur marchés courts : déclencheur neige).
Score : f_demande x f_visibilite x f_besoin x f_marge x 100, chaque facteur entre 0 et 1, facteur absent = 0,5.
Type : offensive si otb < otb_n1 x 0,9 ; défensive si otb >= otb_n1 ; correctif si l'opportunité naît d'une alerte de dette (page qui perd des clics, contenu obsolète).
