P1. DECOUVERTE DES SUJETS
Cadence : saisonnier, et à chaque nouvel événement daté.
Entrées : semrush_*.csv (tendances par requête et par base), evenements_*.json, vacances_scolaires_*.json, envois_crm_*.json, neige_*_semaines_*.json, liste des contenus existants (sujet_contenu), sujets déjà en base.
Sortie : liste de sujets au format de la table sujet, avec sujet_semantique, en JSON.

Instructions
1. Pars de la saisonnalité, pas des mots clés : une période de vacances par marché, un événement de 1 à 4 jours, un déclencheur (neige), une fenêtre B2B sont des candidats. Une exposition de six mois ou un marché hebdomadaire ne le sont pas.
2. Pour chaque candidat, cherche dans Semrush les requêtes qui montent sur les mois qui précèdent la période. Une requête est rattachée si son pic tombe dans la fenêtre d'achat du marché ou juste avant. Note le volume, la base, le pic.
3. Cherche dans les objets d'envoi passés le vocabulaire déjà utilisé sur ce candidat. Note-le comme terme_newsletter. Note aussi ce qui manque : un champ lexical présent dans la demande et absent des envois est une trouvaille, dis-le.
4. Fusionne les candidats qui partagent période de séjour et cible (Saint-Valentin rejoint spa et couples ; L'Élégance et la Grande Odyssée rejoignent janvier). Sépare ceux qui partagent une période mais pas une cible (février familles et février couples).
5. Attribue une famille : saisonnier, événementiel, déclencheur, B2B.
6. Vérifie l'ouverture de la maison sur la période. Un sujet hors ouverture est marqué pour les autres maisons de la destination.
7. Pour chaque sujet, écris le thème en deux lignes, dans la voix de marque, sans vocabulaire interdit.
8. Rends dix à quinze sujets par maison et par saison. Au delà, fusionne. En deçà, cherche ce que la demande montre et que personne ne traite.

Contrôle
- Chaque sujet a au moins une requête avec volume et pic, ou un événement daté, ou une période de vacances. Sinon, il sort.
- Chaque sujet a une période de séjour bornée.
