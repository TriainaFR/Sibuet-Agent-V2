import { connection } from "next/server";
import { fileInfo } from "@/lib/data";
import { formatDate } from "@/lib/dates";

type Status = "réel" | "simulé" | "en attente" | "éditorial";

interface Source {
  name: string;
  status: Status;
  from: string;
  file: string;
  usage: string;
  columns?: string;
}

const sources: Source[] = [
  {
    name: "Booking engine · réservations",
    status: "simulé",
    from: "Chloé / Clara (via Jérôme) · export des 24 derniers mois",
    file: "data/imports/bookings.csv",
    usage: "Fenêtres de réservation par nationalité et par période, répartition des marchés, rythme de réservation vs N-1, anciens clients à recontacter.",
    columns: "id_reservation, maison, date_reservation, date_arrivee, nb_nuits, pays, nb_adultes, nb_enfants, canal, montant_eur, statut",
  },
  {
    name: "Google Search Console",
    status: "simulé",
    from: "Jérôme · export requêtes × mois × pays (16 mois)",
    file: "data/imports/gsc.csv",
    usage: "Pic de recherche de chaque sujet, pour caler la publication des articles ~6 semaines avant ; volume de demande pour la priorité.",
    columns: "mois (AAAA-MM), requete, page, pays, clics, impressions, position",
  },
  {
    name: "Google Analytics 4",
    status: "en attente",
    from: "Jérôme · sessions et conversions par pays, mois, source et page",
    file: "data/imports/ga4.csv",
    usage: "Prévu : pondérer les marchés selon leur conversion réelle et repérer les pages saisonnières qui performent.",
    columns: "mois, pays, source_support, page_destination, sessions, conversions",
  },
  {
    name: "Google Ads",
    status: "en attente",
    from: "Jérôme · campagnes et mots-clés par mois et par pays",
    file: "data/imports/google-ads.csv",
    usage: "Prévu : calibrer les budgets, reprendre les mots-clés qui convertissent, CPA par marché.",
    columns: "mois, campagne, groupe, mot_cle, pays, impressions, clics, cout, conversions",
  },
  {
    name: "Newsletters",
    status: "en attente",
    from: "Jérôme (mails) + Chloé / Clara (performances)",
    file: "data/imports/newsletters.csv",
    usage: "Prévu : meilleur jour et heure d'envoi par langue, rythme d'envoi à respecter, sujets qui performent.",
    columns: "date_envoi, langue, objet, cible, envois, ouvertures, clics, desinscriptions",
  },
  {
    name: "Météo · normales et prévisions",
    status: "réel",
    from: "Open-Meteo (gratuit, sans clé) · archive 2019-2025 + prévisions à 7 jours",
    file: "data/external/weather-normals.json",
    usage: "Premières neiges, ensoleillement, météo habituelle de la période ; alertes « neige annoncée » en page d'accueil.",
  },
  {
    name: "Vacances scolaires",
    status: "réel",
    from: "OpenHolidays API (FR, BE, NL, DE, CH) + saisie manuelle (GB, US, BR)",
    file: "data/external/school-holidays.json",
    usage: "Génère automatiquement les fiches « vacances » par marché et les rapproche des moments éditoriaux.",
  },
  {
    name: "Jours fériés",
    status: "réel",
    from: "Nager.Date · 9 pays",
    file: "data/external/public-holidays.json",
    usage: "Ponts et longs week-ends par marché (Ascension, Pentecôte, Thanksgiving…).",
  },
  {
    name: "Temps forts locaux",
    status: "éditorial",
    from: "Offices de tourisme (Megève, Luberon, Saint-Tropez, Saint-Barth) · à alimenter par le crawler de Jérôme",
    file: "src/config/moments.ts",
    usage: "Catalogue des événements et marronniers : dates, angle, marchés concernés, mots-clés.",
  },
  {
    name: "Maisons",
    status: "réel",
    from: "maisonsethotels-sibuet.com",
    file: "src/config/hotels.ts",
    usage: "Descriptions, capacités, restaurants et spas, visuels. Saisons et prix moyens à confirmer.",
  },
];

const badge: Record<Status, string> = {
  réel: "bg-olive/15 text-olive",
  simulé: "bg-ochre/15 text-ochre",
  "en attente": "bg-brick/10 text-brick",
  éditorial: "bg-sand text-ink-soft",
};

export default async function SourcesPage() {
  await connection();
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
      <p className="eyebrow text-taupe">Transparence des données</p>
      <h1 className="mt-2 font-display text-4xl">Sources de données</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Pour passer d&apos;une donnée simulée à une donnée réelle, il suffit de déposer l&apos;export dans le fichier indiqué, avec les mêmes colonnes. Le
        calendrier se recalcule seul.
      </p>
      <div className="mt-8 space-y-3">
        {sources.map((s) => {
          const info = fileInfo(s.file.replace(/^data\//, ""));
          return (
            <div key={s.name} className="grid gap-3 rounded-md border border-line bg-white p-5 md:grid-cols-[1fr_1.3fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl">{s.name}</h2>
                  <span className={`eyebrow rounded px-2 py-0.5 text-[0.58rem] ${badge[s.status]}`}>{s.status}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{s.from}</p>
                <p className="mt-2 font-mono text-[0.7rem] text-taupe">
                  {s.file}
                  {s.file.startsWith("data/") && (info ? ` · ${info.sizeKb} ko · ${formatDate(info.updatedAt.slice(0, 10), true)}` : " · fichier absent")}
                </p>
              </div>
              <div className="text-sm">
                <p>{s.usage}</p>
                {s.columns && (
                  <p className="mt-2 text-[0.75rem] text-ink-soft">
                    <span className="font-semibold text-ink">Colonnes : </span>
                    {s.columns}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
