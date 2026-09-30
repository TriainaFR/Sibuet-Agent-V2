import type { MarketCode } from "@/lib/types";

// Vacances scolaires des pays que l'API OpenHolidays ne couvre pas (Royaume-Uni, États-Unis, Brésil).
// Dates indicatives pour 2026-27 : elles varient selon les comtés, districts et États.
// Les autres pays (FR, BE, NL, DE, CH, IT) sont récupérés automatiquement par `npm run data:fetch`.

export interface ManualHoliday {
  country: MarketCode;
  name: string;
  start: string;
  end: string;
}

export const manualSchoolHolidays: ManualHoliday[] = [
  { country: "GB", name: "October half-term", start: "2026-10-24", end: "2026-11-01" },
  { country: "GB", name: "Christmas holidays", start: "2026-12-19", end: "2027-01-03" },
  { country: "GB", name: "February half-term", start: "2027-02-13", end: "2027-02-21" },
  { country: "GB", name: "Easter holidays", start: "2027-03-27", end: "2027-04-11" },
  { country: "GB", name: "May half-term", start: "2027-05-29", end: "2027-06-06" },
  { country: "GB", name: "Summer holidays", start: "2027-07-22", end: "2027-09-01" },

  { country: "US", name: "Thanksgiving break", start: "2026-11-25", end: "2026-11-29" },
  { country: "US", name: "Winter break", start: "2026-12-19", end: "2027-01-03" },
  { country: "US", name: "Presidents' Day week", start: "2027-02-13", end: "2027-02-21" },
  { country: "US", name: "Spring break", start: "2027-03-06", end: "2027-03-28" },
  { country: "US", name: "Summer vacation", start: "2027-06-12", end: "2027-08-29" },

  { country: "BR", name: "Férias de verão", start: "2026-12-18", end: "2027-02-05" },
  { country: "BR", name: "Carnaval", start: "2027-02-06", end: "2027-02-10" },
  { country: "BR", name: "Férias de julho", start: "2027-07-03", end: "2027-07-31" },
];
