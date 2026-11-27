import Image from "next/image";
import { identifiantDemande } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire";

export const metadata = { title: "Connexion" };

export default async function Connexion({ searchParams }: PageProps<"/connexion">) {
  const { suite } = await searchParams;
  const avecIdentifiant = identifiantDemande();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="apparition w-full max-w-[380px]">
        <div className="flex justify-center">
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={150} height={42} priority />
        </div>
        <div className="panneau mt-8 p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">Connexion à Agent Sibuet</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-soft">Le détecteur d&apos;opportunités marketing des maisons Sibuet.</p>
          <FormulaireConnexion suite={typeof suite === "string" ? suite : "/"} avecIdentifiant={avecIdentifiant} />
        </div>
        <p className="mt-6 text-center text-xs text-taupe">Accès réservé aux équipes Sibuet, Allin Conseil et Triaina.</p>
      </div>
    </div>
  );
}
