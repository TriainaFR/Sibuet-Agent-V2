-- Agent Sibuet, fiches de thèmes. SQLite. Version 0.1, 17 septembre 2026.
-- Les signaux bruts vivent en JSON datés (04_donnees et collectes). Cette base tient
-- les signaux normalisés et les objets de décision.

CREATE TABLE maison (
  id TEXT PRIMARY KEY,            -- lodge-park, fermes-de-marie, ...
  nom TEXT NOT NULL,
  destination TEXT,               -- megeve, saint-tropez, ...
  site_url TEXT,
  gsc_property TEXT,
  ga4_property TEXT,
  asterio_hotel_code TEXT
);

CREATE TABLE marche (
  id TEXT PRIMARY KEY,            -- frc, fra, frb, ge, vd, uk, be, nl, us
  nom TEXT NOT NULL,
  pays TEXT NOT NULL,             -- FR, CH, GB, BE, NL, US
  langue TEXT NOT NULL,           -- fr, en, nl
  semrush_db TEXT,                -- fr, uk, ch, be, nl, us
  asterio_country_codes TEXT      -- liste ISO2 séparée par des virgules
);

CREATE TABLE periode_vacances (
  id INTEGER PRIMARY KEY,
  marche_id TEXT REFERENCES marche(id),
  saison TEXT NOT NULL,           -- 2026-2027
  nom TEXT NOT NULL,              -- Noël, Hiver, Half-term
  debut DATE NOT NULL,
  fin DATE NOT NULL,
  source TEXT,
  verifie INTEGER DEFAULT 0
);

CREATE TABLE evenement (
  id INTEGER PRIMARY KEY,
  event_key TEXT,                 -- slug stable megeve-tourisme (clé de récurrence)
  destination TEXT,
  nom TEXT NOT NULL,
  categorie TEXT,
  debut DATE,
  fin DATE,
  confirme INTEGER DEFAULT 0,
  source TEXT,
  collecte_le DATE
);

-- Signal normalisé. Une ligne par observation. Jamais mis à jour, toujours inséré.
CREATE TABLE signal (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,           -- open_meteo, semrush, gsc, ga4, crawl, nl_calendrier, nl_perf, instagram, gads, meta_ads, asterio, agenda_station, vacances
  type TEXT NOT NULL,             -- demande, contexte, contrainte, performance, besoin
  maison_id TEXT REFERENCES maison(id),
  marche_id TEXT REFERENCES marche(id),
  sujet_id TEXT REFERENCES sujet(id),
  semaine_sejour DATE,            -- lundi de la semaine de séjour visée, NULL si non applicable
  cle TEXT NOT NULL,              -- nom de la mesure : snow10_mean, volume, impressions, otb, pickup_vs_n1, ...
  valeur REAL,
  valeur_texte TEXT,              -- pour les signaux non numériques (requête, thème d'envoi)
  observe_le DATE NOT NULL,
  detail_json TEXT                -- charge utile brute
);
CREATE INDEX idx_signal_lookup ON signal(maison_id, sujet_id, semaine_sejour, source, cle);

CREATE TABLE sujet (
  id TEXT PRIMARY KEY,            -- sapin, fetes, neige, janvier, fevrier, spa, printemps, mice, early, ete
  nom TEXT NOT NULL,
  famille TEXT NOT NULL,          -- saisonnier, evenementiel, declencheur, b2b
  destination TEXT,
  theme TEXT,                     -- deux lignes
  sejour_debut DATE,
  sejour_fin DATE,
  actif INTEGER DEFAULT 1,
  cree_le DATE,
  revise_le DATE
);

CREATE TABLE sujet_semantique (
  id INTEGER PRIMARY KEY,
  sujet_id TEXT REFERENCES sujet(id),
  type TEXT NOT NULL,             -- requete, vocabulaire_marque, vocabulaire_interdit, terme_newsletter
  langue TEXT,
  terme TEXT NOT NULL,
  volume INTEGER,
  semrush_db TEXT,
  pic_mois TEXT,                  -- liste de mois
  source TEXT
);

CREATE TABLE sujet_contenu (
  id INTEGER PRIMARY KEY,
  sujet_id TEXT REFERENCES sujet(id),
  maison_id TEXT REFERENCES maison(id),
  url TEXT NOT NULL,
  langue TEXT,
  type TEXT,                      -- page, article, landing
  derniere_maj DATE,
  clics_90j INTEGER,
  impressions_90j INTEGER,
  position_moy REAL,
  decision TEXT                   -- conserver, mettre_a_jour, creer, supprimer
);

CREATE TABLE opportunite (
  id INTEGER PRIMARY KEY,
  sujet_id TEXT REFERENCES sujet(id),
  maison_id TEXT REFERENCES maison(id),
  marche_id TEXT REFERENCES marche(id),
  fenetre_debut DATE NOT NULL,    -- période de séjour visée
  fenetre_fin DATE NOT NULL,
  achat_debut DATE,               -- fenêtre d'achat calculée
  achat_fin DATE,
  calcule_le DATE NOT NULL,
  type TEXT NOT NULL,             -- offensive, defensive, correctif
  f_demande REAL, f_visibilite REAL, f_besoin REAL, f_marge REAL,
  facteurs_manquants TEXT,        -- liste
  score REAL,                     -- 0 à 100
  statut TEXT DEFAULT 'proposee', -- proposee, validee, rejetee, activee, mesuree
  commentaire TEXT
);

CREATE TABLE activation (
  id INTEGER PRIMARY KEY,
  opportunite_id INTEGER REFERENCES opportunite(id),
  canal TEXT NOT NULL,            -- seo, geo, contenu, crm, meta, sea, push, agences, social, presse
  objectif TEXT,
  segment TEXT,
  message_cle TEXT,
  semantique TEXT,
  assets TEXT,                    -- URLs, visuels, offre
  debut DATE,
  fin DATE,
  declencheur TEXT,               -- ex: prévision neige 5 j > 20 cm
  justification_timing TEXT,
  budget REAL,
  effort TEXT,
  kpi_nom TEXT,
  kpi_cible REAL,
  kpi_base REAL,                  -- ligne de base historique, NULL si aucune
  brief_md TEXT,                  -- brief complet, produit par le prompt P4
  statut TEXT DEFAULT 'brouillon', -- brouillon, validee, en_cours, terminee, annulee
  validateur TEXT,
  validee_le DATE
);

CREATE TABLE resultat (
  id INTEGER PRIMARY KEY,
  activation_id INTEGER REFERENCES activation(id),
  mesure_le DATE NOT NULL,
  kpi_nom TEXT NOT NULL,
  valeur REAL,
  pickup_vs_n1 REAL,              -- mesure commune, part relative
  nuitees_attribuees REAL,
  cout REAL,
  commentaire TEXT
);

-- Vue de travail : dernière valeur par signal
CREATE VIEW signal_dernier AS
SELECT s.* FROM signal s
JOIN (SELECT maison_id, marche_id, sujet_id, semaine_sejour, source, cle, MAX(observe_le) AS m
      FROM signal GROUP BY maison_id, marche_id, sujet_id, semaine_sejour, source, cle) d
ON s.maison_id IS d.maison_id AND s.marche_id IS d.marche_id AND s.sujet_id IS d.sujet_id
AND s.semaine_sejour IS d.semaine_sejour AND s.source = d.source AND s.cle = d.cle AND s.observe_le = d.m;
