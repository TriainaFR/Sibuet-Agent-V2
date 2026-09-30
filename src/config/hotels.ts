import type { Destination, Hotel } from "@/lib/types";

// Source : https://www.maisonsethotels-sibuet.com (pages Hôtels et Destinations, sept. 2026).
// ⚠️ Les dates de saison, les prix moyens et les répartitions de nationalités sont des
// hypothèses de démo : à remplacer par les données du booking engine.

export const destinations: Destination[] = [
  {
    id: "megeve",
    name: "Megève",
    region: "Haute-Savoie · Pays du Mont-Blanc",
    lat: 45.8567,
    lon: 6.6175,
    image: "/hotels/megeve.jpg",
    tourismOffice: { name: "Office de tourisme de Megève", url: "https://megeve.com" },
  },
  {
    id: "menerbes",
    name: "Ménerbes",
    region: "Vaucluse · Parc naturel régional du Luberon",
    lat: 43.832,
    lon: 5.206,
    image: "/hotels/menerbes.jpg",
    tourismOffice: {
      name: "Office de tourisme Luberon Cœur de Provence",
      url: "https://www.luberoncoeurdeprovence.com",
    },
  },
  {
    id: "saint-tropez",
    name: "Saint-Tropez",
    region: "Var · Ramatuelle, baie de Pampelonne",
    lat: 43.216,
    lon: 6.64,
    image: "/hotels/saint-tropez.jpg",
    tourismOffice: { name: "Office de tourisme de Saint-Tropez", url: "https://www.sainttropeztourisme.com" },
  },
  {
    id: "saint-barth",
    name: "Saint-Barth",
    region: "Antilles · Baie de Saint-Jean",
    lat: 17.902,
    lon: -62.838,
    image: "/hotels/saint-barth.jpg",
    tourismOffice: { name: "Comité territorial du tourisme de Saint-Barthélemy", url: "https://www.saintbarth-tourisme.com" },
  },
];

export const hotels: Hotel[] = [
  {
    id: "les-fermes-de-marie",
    name: "Les Fermes de Marie",
    shortName: "Fermes de Marie",
    destination: "megeve",
    tagline: "Plus qu'un hôtel, un lieu",
    rooms: 70,
    roomsLabel: "70 chambres dont 10 suites et 5 chambres enfants",
    description:
      "Un hameau de fermes d'alpage plusieurs fois centenaires, imaginé et construit pierre par pierre par Jean-Louis Sibuet il y a 30 ans. La chaleur du vieux bois, un accueil toujours personnalisé, et le premier spa Pure Altitude créé par Jocelyne Sibuet.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/les-fermes-de-marie",
    image: "/hotels/les-fermes-de-marie.jpg",
    color: "#8a6f5a",
    demo: true,
    seasons: [
      { label: "Hiver 2026-27", start: "2026-12-11", end: "2027-04-05" },
      { label: "Été 2027", start: "2027-06-25", end: "2027-09-12" },
    ],
    avgNightlyRate: 950,
    marketMix: { FR: 36, GB: 16, CH: 10, BE: 8, NL: 7, US: 8, BR: 7, IT: 4, DE: 4 },
    highlights: [
      "Restaurant des Fermes de Marie — cuisine gastronomique de montagne",
      "Le Carnotzet — restaurant à fromages",
      "L'Alpage d'été — table d'hôtes à 1 800 m sur le massif de Rochebrune",
      "Spa des Fermes — Pure Altitude, 100 % alpin",
      "Kids friendly : 5 chambres enfants",
    ],
  },
  {
    id: "lodge-park",
    name: "Lodge Park",
    shortName: "Lodge Park",
    destination: "megeve",
    tagline: "Repaire chic du centre de Megève",
    rooms: 35,
    roomsLabel: "35 chambres & suites",
    description:
      "Hôtel 5 étoiles au cœur d'un parc en plein centre de Megève, à deux pas des remontées mécaniques. L'élégance sophistiquée rencontre l'esprit sauvage des Alpes, façon club d'explorateurs.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/lodge-park",
    image: "/hotels/lodge-park.jpg",
    color: "#4c3327",
    demo: false,
    seasons: [
      { label: "Hiver 2026-27", start: "2026-12-11", end: "2027-04-05" },
      { label: "Été 2027", start: "2027-06-25", end: "2027-09-05" },
    ],
    avgNightlyRate: 1100,
    marketMix: { FR: 30, GB: 20, CH: 10, BE: 7, NL: 6, US: 12, BR: 9, IT: 3, DE: 3 },
    highlights: [
      "Le Beef Lodge — steak house",
      "Le Bar du Lodge — les apéros incontournables de Megève",
      "Spa Pure Altitude Longevity — parcours thermal, grotte de glace",
    ],
  },
  {
    id: "hotel-mont-blanc",
    name: "Hôtel Mont-Blanc",
    shortName: "Mont-Blanc",
    destination: "megeve",
    tagline: "Terriblement élégant",
    rooms: 38,
    roomsLabel: "38 chambres dont 11 suites",
    description:
      "Hôtel mythique sur la place du village, qui a vu défiler le gotha des arts et du cinéma depuis plus d'un siècle. Décor contemporain élégant, un brin extravagant, à deux pas du clocher.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/hotel-mont-blanc",
    image: "/hotels/hotel-mont-blanc.jpg",
    color: "#6b6f78",
    demo: false,
    seasons: [
      { label: "Hiver 2026-27", start: "2026-12-11", end: "2027-04-11" },
      { label: "Été 2027", start: "2027-06-18", end: "2027-09-19" },
    ],
    avgNightlyRate: 850,
    marketMix: { FR: 40, GB: 15, CH: 11, BE: 8, NL: 5, US: 8, BR: 5, IT: 5, DE: 3 },
    highlights: [
      "Le Relais Mont-Blanc — cuisine de l'arc alpin",
      "Salon de thé du Mont-Blanc",
      "Le Bar des Enfants Terribles — cocktails et champagne",
      "Spa du Mont-Blanc — blancheur polaire façon couture",
    ],
  },
  {
    id: "la-bastide-de-marie",
    name: "La Bastide de Marie",
    shortName: "Bastide de Marie",
    destination: "menerbes",
    tagline: "Une bastide les pieds dans la vigne",
    rooms: 11,
    roomsLabel: "11 chambres dont 6 suites",
    description:
      "Bâtisse du XVIIIe siècle au cœur du Parc naturel du Luberon, entre Gordes et Bonnieux, nichée dans les vignes du Domaine de Marie. L'accord ultime entre paysage, gastronomie et œnologie.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/la-bastide-de-marie",
    image: "/hotels/la-bastide-de-marie.jpg",
    color: "#9a8a5c",
    demo: true,
    seasons: [
      { label: "Arrière-saison 2026", start: "2026-09-01", end: "2026-10-25" },
      { label: "Saison 2027", start: "2027-03-26", end: "2027-10-24" },
    ],
    avgNightlyRate: 780,
    marketMix: { FR: 30, US: 20, GB: 15, BE: 8, NL: 7, DE: 7, CH: 7, IT: 3, BR: 3 },
    highlights: [
      "La Salle à Manger — côté terrasse ou côté bastide",
      "Spa Pure Altitude — soins aromathérapie",
      "Domaine de Marie — vins de Provence, 23 ha de vignes",
      "Villa Grenache et Le Mas — propriétés à louer avec services",
    ],
  },
  {
    id: "villa-marie-saint-tropez",
    name: "Villa Marie Saint-Tropez",
    shortName: "Villa Marie",
    destination: "saint-tropez",
    tagline: "Une douce ambiance de Riviera",
    rooms: 45,
    roomsLabel: "45 chambres dont 5 suites",
    description:
      "Villa aux allures italiennes nichée dans une pinède de 4 hectares dominant la baie de Pampelonne. Farniente chic, jardins de pins centenaires, rosiers et citronniers, restaurant Dolce Vita.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/villa-marie-saint-tropez",
    image: "/hotels/villa-marie-saint-tropez.jpg",
    color: "#c07a5a",
    demo: false,
    seasons: [{ label: "Saison 2027", start: "2027-04-23", end: "2027-10-10" }],
    avgNightlyRate: 900,
    marketMix: { FR: 34, IT: 12, GB: 12, US: 12, CH: 9, BE: 6, DE: 7, NL: 4, BR: 4 },
    highlights: [
      "Dolce Vita — cuisine méditerranéenne",
      "Spa Pure Altitude — pin, rose et jasmin",
      "Vue sur la baie de Pampelonne",
    ],
  },
  {
    id: "gyp-sea-hotel",
    name: "Gyp Sea Hotel",
    shortName: "Gyp Sea",
    destination: "saint-barth",
    tagline: "Tropical chic boutique hotel",
    rooms: 20,
    roomsLabel: "20 bungalows et villas",
    description:
      "Un écrin luxuriant entre palmiers et cocotiers, des varangues créoles, 20 bungalows et villas aux teintes turquoise, rose bougainvillier et jaune canari. Beach club sur la plage de Saint-Jean.",
    url: "https://www.maisonsethotels-sibuet.com/hotels/gyp-sea-hotel",
    image: "/hotels/gyp-sea-hotel.jpg",
    color: "#3f8f8a",
    demo: false,
    seasons: [{ label: "Saison 2026-27", start: "2026-11-01", end: "2027-08-22" }],
    avgNightlyRate: 1050,
    marketMix: { US: 45, FR: 28, BR: 9, GB: 6, CH: 5, IT: 3, BE: 2, DE: 1, NL: 1 },
    highlights: [
      "Gyp Sea Beach Club — plage de Saint-Jean",
      "Spa Pure Altitude — soins après-soleil",
      "Gyp Sea Beach Houses — 4 villas pieds dans le sable",
    ],
  },
];

export const hotelById = Object.fromEntries(hotels.map((h) => [h.id, h])) as Record<
  Hotel["id"],
  Hotel
>;

export const destinationById = Object.fromEntries(destinations.map((d) => [d.id, d])) as Record<
  Destination["id"],
  Destination
>;
