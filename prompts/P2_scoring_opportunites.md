P2. SCORING DES OPPORTUNITES
Cadence : hebdomadaire (lundi).
Entrées : sujets actifs, signal_dernier (toutes sources), periode_vacances, delais (Asterio ou hypothèses), date de calcul.
Sortie : lignes de la table opportunite, une par sujet x maison x marché x fenêtre, en JSON, triées par score.

Instructions
1. Pour chaque sujet actif et chaque marché, prends la ou les périodes de séjour du sujet. Pour un sujet vacances, la période est celle du marché (les vacances de la zone C ne sont pas celles de Vaud).
2. Calcule la fenêtre d'achat : début de période moins delai_q3 semaines, jusqu'à début de période moins delai_q1. Si le délai vient d'une hypothèse, marque-le.
3. Calcule les quatre facteurs, chacun entre 0 et 1 :
   - demande : volume des requêtes du sujet sur la base du marché, normalisé sur le maximum observé pour la maison, pondéré par la proximité du pic (1 si le pic tombe dans les 8 semaines suivant la date de calcul, dégressif ensuite), plus impressions GSC de la maison sur ces requêtes, normalisées.
   - visibilité : 1 moins la position GSC moyenne ramenée entre 0 (position 1) et 1 (position 30 ou absente), moyennée avec 1 moins la part de voix Peec. Absent = 0,5.
   - besoin : si otb et otb_n1 existent, 1 moins otb / otb_n1 borné entre 0 et 1, puis 0 si la maison est fermée ou complète. Absent = 0,5.
   - marge : commission OTA évitée sur le panier moyen, rapportée au coût attendu du canal principal (CPA Ads observé, coût CRM proche de 0, coût contenu forfaitaire). Absent = 0,5.
4. Score = produit des quatre x 100. Liste facteurs_manquants.
5. Type : offensive si otb < 0,9 x otb_n1 ; défensive si otb >= otb_n1 ; correctif si l'opportunité est née d'une alerte de dette (clics perdus, contenu obsolète) et non d'une période.
6. Applique les contraintes : fenêtre d'achat déjà passée à la date de calcul = opportunité close ; maison fermée = rejetée ; envoi CRM déjà prévu dans la fenêtre = signalé, pas rejeté.
7. Rends les opportunités triées par score, avec pour chacune une phrase de justification qui cite les valeurs utilisées et leur date.

Contrôle
- Aucune opportunité sans fenêtre d'achat calculée.
- Aucun score sans la liste des facteurs manquants, même vide.
- Ne pas produire deux opportunités qui recommandent des actions contradictoires sur la même semaine et le même marché ; en cas de conflit, garder la mieux scorée et citer l'autre.
