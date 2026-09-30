# Calendrier d'activation Sibuet — Données à obtenir de Jérôme

_Réunion du 30/09/2026 · Jérôme Hoerlé ↔ Lucas Lecoq_
_Jérôme a prévu d'envoyer un mail avec les données de base « demain » (01/10/2026)._

**Périmètre de la démo :** 2 maisons.
- **Les Fermes de Marie** (Megève)
- **La Bastide de Marie** (Ménerbes, Luberon)

Pour ces deux maisons, des exports CSV/Excel suffisent (données figées). Pas besoin de donner d'accès pour l'instant.

---

## 1. À envoyer par Jérôme (il y a déjà accès)

| # | Donnée | Détail attendu | Période | Format |
|---|---|---|---|---|
| 1 | **Google Search Console** | Requêtes + pages, avec clics, impressions, CTR, position. **Détail par mois** : c'est indispensable pour voir la saisonnalité, par exemple « marché de Noël Megève ». Idéalement aussi par pays. | 16 derniers mois (le maximum de GSC) | CSV (export ou Looker Studio) |
| 2 | **Google Analytics 4** | Sessions et conversions par **pays**, par **mois**, par **source/support** et par **page de destination**. Si possible : les clics vers le moteur de réservation (événement « réserver »). | 24 mois si possible | CSV |
| 3 | **Google Ads** | Campagnes, groupes d'annonces, mots-clés : impressions, clics, coût, conversions, **par mois et par pays ciblé**. | 24 mois | CSV |
| 4 | **Newsletters** | Les mails envoyés (contenu, date, cible, langue) et le **programme d'envoi** (fréquence, planning). | 12 à 24 mois | PDF/HTML des mails + tableau récapitulatif |
| 5 | **Ce qu'il a déjà récupéré** | Le résultat de son crawl de l'office de tourisme de Megève (événements, dates), plus l'API météo qu'il avait repérée. | — | Fichier brut |
| 6 | **Le brief client** | Si Chloé ou Clara ont écrit quelque chose (mail, doc), en plus de ce qui a été dit en réunion. | — | Transfert de mail |

> Accès : les comptes GA4 et GSC sont sur **le compte personnel de Jérôme**, pas sur celui de Triaina. Pour la démo, des exports suffisent. Pour la version en production, il faudra un accès en lecture (ajout d'un utilisateur ou compte de service).

## 2. À obtenir des clientes (Chloé / Clara), via Jérôme

| # | Donnée | Pourquoi c'est critique | Statut |
|---|---|---|---|
| 7 | **Export du moteur de réservation, 24 derniers mois** | C'est la donnée centrale. Elle sert à calculer la **fenêtre de réservation** (délai entre la réservation et l'arrivée) par nationalité et par mois. C'est ce qui fixe **quand** lancer chaque action. | ❌ Pas encore reçu. **Simulé** dans la démo. |
| 8 | **Performances des newsletters** | Taux d'ouverture et de clic, désinscriptions, CA attribué, par envoi et par langue. | ❌ Pas encore reçu |
| 9 | **Calendrier d'ouverture et de fermeture** de chaque maison (saisons 2026-27) | Pour ne pas pousser une maison fermée. | À demander |
| 10 | **Temps forts internes** déjà prévus | Offres, séminaires, événements, lancements (Pure Altitude, Domaine de Marie…). | À demander |
| 11 | **Marchés prioritaires** par maison | Les nationalités qu'elles veulent développer, en plus de celles qu'elles ont déjà. | À demander |

### Colonnes minimales pour l'export du moteur de réservation

Si l'export complet est compliqué, ces colonnes suffisent. Les données peuvent être anonymisées, aucun nom n'est nécessaire.

```
id_reservation · maison · date_reservation · date_arrivee · date_depart (ou nb_nuits)
· pays / nationalité du client · nb_adultes · nb_enfants · canal (direct, OTA, agence…)
· montant · statut (confirmée / annulée)
```

## 3. Questions à trancher avec Jérôme

- **Contrat** : en direct avec Sibuet, ou via Jérôme qui refacture ? Jérôme préfère le direct.
- **Hébergement de la démo** : cloud (OK pour les clientes), avec le nom de domaine de Triaina ?
- **Date de la démo** avec Chloé et Clara.
- **Meta Ads** est exclu du premier trimestre. À reconfirmer.

---

### Ce qui est déjà en place côté Lucas (sans attendre les données)

- Fiches des 6 maisons récupérées sur maisonsethotels-sibuet.com
- Météo : données réelles (Open-Meteo, gratuit, sans clé)
- Jours fériés et vacances scolaires par pays : données réelles (OpenHolidays / Nager.Date)
- Réservations **simulées** sur 24 mois (fenêtre de réservation par nationalité), à remplacer par l'export réel
- Fichiers d'import prêts à recevoir les CSV GSC, GA4, Ads et newsletters dès leur arrivée
