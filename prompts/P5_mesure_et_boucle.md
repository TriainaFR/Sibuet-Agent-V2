P5. MESURE ET BOUCLE
Cadence : après chaque période de séjour, et mensuel pour les activations en cours.
Entrées : activations en statut en_cours ou terminee, signal_dernier (GSC, GA4, nl_perf, gads, meta_ads, instagram, asterio), fenêtres et KPI cibles.
Sortie : lignes de la table resultat, puis un compte rendu court par sujet, et des propositions de recalibrage.

Instructions
1. Pour chaque activation, mesure le KPI du canal à la date prévue, puis la mesure commune : pickup de la semaine visée contre N-1, en nuitées si Asterio est branché, sinon en sessions SynXis GA4 par pays avec la mention "proxy".
2. Compare à la cible et à la ligne de base. Écris trois lignes : ce qui s'est passé, ce qui l'explique d'après les signaux (neige, événement, concurrence, retard de mise en ligne), ce qu'on en retient.
3. Distingue les cas : activation faite et fenêtre remplie, faite et fenêtre vide, non faite et fenêtre remplie (le sujet ne méritait pas l'effort), non faite et fenêtre vide (occasion manquée).
4. Propose les recalibrages, chacun avec la donnée qui le justifie :
   - délais de réservation par marché (quartiles observés contre hypothèses)
   - taux de réponse CRM par thème et par marché
   - poids de la marge par canal (CPA observés)
   - seuil du déclencheur neige (corrélation chutes J-10 et pickup J-7 sur les marchés courts)
   - sujets à fusionner, à séparer, à retirer
5. Rends les propositions en JSON exploitable (clé, ancienne valeur, nouvelle valeur, preuve, date), plus le compte rendu en texte.

Contrôle
- Une mesure sans date de mesure n'est pas une mesure.
- Ne jamais attribuer une réservation à un canal sans dire par quelle méthode (lien, fenêtre de dates, proxy).
- Un recalibrage n'est appliqué qu'après validation humaine.
