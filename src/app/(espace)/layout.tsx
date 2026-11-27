import { Entete } from "@/components/entete";

// Espace connecté : la coquille de l'application (barre latérale, bandeau de rejeu, panneau de contenu).
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return <Entete>{children}</Entete>;
}
