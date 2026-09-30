import type { LeverId, Market, MarketCode } from "@/lib/types";

// Nationalités suivies. `baseWindowDays` ne sert qu'à générer les réservations simulées :
// dans l'outil, les fenêtres sont toujours recalculées à partir du fichier de réservations.

export const markets: Market[] = [
  { code: "FR", name: "France", adjective: "Français", flag: "🇫🇷", language: "fr", baseWindowDays: 32, profile: "Plutôt dernière minute, sensibles aux ponts et vacances scolaires par zone." },
  { code: "GB", name: "Royaume-Uni", adjective: "Britanniques", flag: "🇬🇧", language: "en", baseWindowDays: 88, profile: "Réservent tôt, calés sur les half-terms. Sensibles aux événements à résonance internationale." },
  { code: "NL", name: "Pays-Bas", adjective: "Néerlandais", flag: "🇳🇱", language: "nl", baseWindowDays: 78, profile: "Très planificateurs, vacances scolaires par région (Nord / Centre / Sud)." },
  { code: "BE", name: "Belgique", adjective: "Belges", flag: "🇧🇪", language: "fr", baseWindowDays: 58, profile: "Vacances de Carnaval (Krokus) et de Pâques très structurantes." },
  { code: "CH", name: "Suisse", adjective: "Suisses", flag: "🇨🇭", language: "fr", baseWindowDays: 38, profile: "Proximité, courts séjours, décision rapide selon la météo." },
  { code: "DE", name: "Allemagne", adjective: "Allemands", flag: "🇩🇪", language: "de", baseWindowDays: 70, profile: "Anticipent, vacances par Land étalées." },
  { code: "IT", name: "Italie", adjective: "Italiens", flag: "🇮🇹", language: "it", baseWindowDays: 30, profile: "Courts séjours, dernière minute, ponts." },
  { code: "US", name: "États-Unis", adjective: "Américains", flag: "🇺🇸", language: "en", baseWindowDays: 115, profile: "Long-courrier : réservent très tôt, séjours longs, Thanksgiving et fêtes de fin d'année." },
  { code: "BR", name: "Brésil", adjective: "Brésiliens", flag: "🇧🇷", language: "pt", baseWindowDays: 125, profile: "Long-courrier : vacances d'été austral (déc.–fév.), Carnaval et vacances de juillet." },
];

export const marketByCode = Object.fromEntries(markets.map((m) => [m.code, m])) as Record<MarketCode, Market>;

export const levers: Record<LeverId, { label: string; short: string; description: string }> = {
  instagram: { label: "Instagram", short: "IG", description: "Carrousels, reels et stories sur les comptes de la maison et du groupe." },
  "google-ads": { label: "Google Ads", short: "Ads", description: "Campagnes Search ciblées par pays et par langue." },
  seo: { label: "SEO / GEO", short: "SEO", description: "Articles du Magazine Sibuet, maillage interne vers la page de la maison." },
  newsletter: { label: "Newsletter", short: "NL", description: "Envoi à la base abonnés, segmenté par langue." },
  crm: { label: "CRM", short: "CRM", description: "Message personnalisé aux anciens clients ayant séjourné à la même période." },
  rp: { label: "Relations presse", short: "RP", description: "Communiqué et pitch presse / influence, avec un délai long." },
  linkedin: { label: "LinkedIn", short: "in", description: "Recrutement, séminaires et incentives." },
};

export const leverOrder: LeverId[] = ["rp", "seo", "crm", "newsletter", "instagram", "google-ads", "linkedin"];
