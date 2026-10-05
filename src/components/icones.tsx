import { Briefcase, Camera, Mail, Megaphone, MousePointerClick, Search, Snowflake, type LucideIcon } from "lucide-react";
import type { Canal } from "@/lib/types";

export const iconeCanal: Record<Canal, LucideIcon> = {
  crm: Mail,
  seo: Search,
  sea: MousePointerClick,
  meta: Megaphone,
  social: Camera,
  agences: Briefcase,
  declencheur: Snowflake,
};

export function IconeCanal({ canal, taille = "h-9 w-9" }: { canal: Canal; taille?: string }) {
  const I = iconeCanal[canal];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-cream text-ink ${taille}`}>
      <I className="h-4 w-4" strokeWidth={1.5} />
    </span>
  );
}
