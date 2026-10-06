import Image from "next/image";
import { FormulaireConnexion } from "./formulaire";

export const metadata = { title: "Connexion · Agent Sibuet" };

export default async function Connexion({ searchParams }: PageProps<"/connexion">) {
  const { suite } = await searchParams;
  const avecIdentifiant = Boolean(process.env.APP_USER);
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-greige lg:block">
        <Image src="/lodge/lp-4.jpg" alt="" fill priority className="object-cover" sizes="55vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 text-white">
          <p className="eyebrow text-white/85">Lodge Park · hiver 2026-2027</p>
          <p className="mt-3 max-w-md font-display text-5xl leading-[1.05]">L&apos;art de vivre, au bon moment.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-cream px-6 py-16">
        <div className="apparition w-full max-w-sm">
          <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={190} height={53} priority className="mx-auto" />
          <h1 className="mt-10 text-center font-display text-4xl">Agent Sibuet</h1>
          <p className="eyebrow mt-2 text-center text-taupe">Espace réservé</p>
          <FormulaireConnexion suite={typeof suite === "string" ? suite : "/"} avecIdentifiant={avecIdentifiant} />
          <p className="mt-10 text-center text-xs text-ink-soft">Accès réservé aux équipes Sibuet, Allin Conseil et Triaina.</p>
        </div>
      </div>
    </div>
  );
}
