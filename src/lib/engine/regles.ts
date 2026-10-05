// Paramètres du calcul, regroupés pour être ajustés sans toucher au moteur.
// Les règles viennent du brief de Jérôme (docs/cadrage/BRIEF_fiches_de_themes.md, sections 5 et 6)
// et des prompts P2 et P3. Ce qui n'y est pas précisé est marqué "paramètre de reprise".

export const REGLES = {
  /** Quartiles de délai dérivés de la médiane tant qu'Asterio manque (hypothèses de Jérôme). */
  q1SurMediane: 0.6,
  q3SurMediane: 1.6,

  /** Facteur absent : vaut 0,5 et est déclaré manquant (P2). */
  facteurAbsent: 0.5,
  /** Demande non détectée sur la base Semrush du marché (calcul n° 5 : 0,20). */
  demandePlancher: 0.2,
  /** Pic de recherche dans les 8 semaines qui suivent la date de calcul : pondération 1 (P2). */
  picSemaines: 8,
  /** Au-delà, pondération dégressive jusqu'à ce plancher (paramètre de reprise). */
  picPlancher: 0.75,
  /** Seuil de pic : mois où la tendance Semrush atteint 80 % du maximum (paramètre de reprise). */
  seuilPic: 0.8,

  /** Écart de visibilité : position 1 → plancher, position 30 ou absente → 1 (P2). */
  ecartPlancher: 0.2,
  positionMax: 30,

  /** Besoin : 1 − otb / otb_n1, borné (P2). Plancher pour qu'une opportunité défensive reste visible. */
  besoinPlancher: 0.1,
  /** Besoin saisi par le client faute d'Asterio (formulaire « Vos données »). */
  besoinSaisi: { bas: 0.9, normal: 0.5, plein: 0.1 } as Record<string, number>,

  /** Marge : coût attendu par canal, en euros par réservation (hypothèses de reprise, à remplacer par les CPA observés). */
  coutCanal: { crm: 15, seo: 60, sea: 180, meta: 220 } as Record<string, number>,

  /** Urgence : 1 si la fenêtre d'achat est ouverte, 0 si elle est fermée, sinon décroît sur 26 semaines avec un plancher (maquette UX). */
  urgenceHorizonSemaines: 26,
  urgencePlancher: 0.3,

  /** Activations : date au premier tiers de la fenêtre d'achat, vagues regroupant les marchés à moins de 10 jours (fiche fevrier). */
  partFenetre: 1 / 3,
  ecartVagueJours: 10,
  /** SEO : en ligne au plus tard 6 semaines avant le pic de recherche (brief, section 4). */
  seoAvantPicJours: 42,
  maxActivations: 5,

  /** Canal déduit du temps restant avant le séjour (brief, section 6). */
  canalParDelai: [
    { auDela: 12 * 7, canal: "SEO, GEO, contenu de fond" },
    { auDela: 4 * 7, canal: "contenu, CRM, Meta, agences" },
    { auDela: 10, canal: "SEA, push, CRM flash" },
    { auDela: -1, canal: "déclencheur neige (marchés courts), SEA" },
  ],

  /** Déclencheur neige : seuil de chutes prévues sur 5 jours (à calibrer avec Asterio, P5). */
  seuilNeige5jCm: 20,

  /** « À faire » : horizon de la liste d'actions (maquette : six semaines). */
  horizonAFaireJours: 42,
};

/** Vocabulaire interdit (P0, à compléter depuis les bases de marque). */
export const VOCABULAIRE_INTERDIT = [
  "écrin",
  "cocon",
  "havre de paix",
  "luxe ultime",
  "expérience unique",
  "sublimer",
  "sublime",
  "magique",
  "féerique",
];
