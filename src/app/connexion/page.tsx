import { Briefcase, Check, Clock, Mail, Search, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { identifiantDemande } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire";

export const metadata = { title: "Connexion" };

// Aperçu illustratif de l'application : aucun chiffre client avant connexion.
const APERCU = [
  { icone: Mail, canal: "Newsletter", marche: "Royaume-Uni", couleur: "#6f7456", titre: "Envoyer la newsletter de janvier aux Britanniques", etat: "valider" },
  { icone: Search, canal: "Référencement", marche: "France", couleur: "#3f6185", titre: "Créer la page des vacances d'hiver", etat: "validee" },
  { icone: Briefcase, canal: "Agences", marche: "États-Unis", couleur: "#7b5f8c", titre: "Écrire aux agences pour les fêtes", etat: "reportee" },
] as const;

const serif = { fontFamily: "var(--font-garamond), Garamond, Georgia, serif" };

export default async function Connexion({ searchParams }: PageProps<"/connexion">) {
  const { suite } = await searchParams;
  const avecIdentifiant = identifiantDemande();
  return (
    <div data-maison="groupe" className="grid min-h-screen bg-[#f6f5f3] lg:grid-cols-[minmax(440px,1fr)_1.2fr]">
      {/* Formulaire, aux couleurs du groupe */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={168} height={47} priority className="h-auto w-[168px]" />
        <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-[#8a7a6c]">Agent Sibuet</p>
          <h1 className="mt-3 text-[2.5rem] leading-[1.05] text-[#251209]" style={serif}>
            Bon retour parmi nous
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#6b5e54]">Ce qu&apos;il faut lancer cette semaine, marché par marché, pour chaque maison.</p>
          <FormulaireConnexion suite={typeof suite === "string" ? suite : "/"} avecIdentifiant={avecIdentifiant} />
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-[#8a7a6c]">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            Accès réservé aux équipes Sibuet, Allin Conseil et Triaina. Chaque connexion est enregistrée.
          </p>
        </div>
        <p className="text-xs text-[#8a7a6c]">Maisons &amp; Hôtels Sibuet · Allin Conseil · Triaina</p>
      </div>

      {/* Photo de maison et aperçu de l'agent. La photo reste sous sa taille d'origine (1 600 px) pour rester nette, même sur écran Retina. */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#251209] px-12 py-12 lg:flex">
        <div aria-hidden className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#a8683f] opacity-[0.18] blur-3xl" />
        <div className="relative w-full max-w-[520px]">
          <p className="text-[2.75rem] leading-[1.04] text-white" style={serif}>
            L&apos;art de vivre, au bon moment.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
            L&apos;agent lit les ventes, Google et l&apos;agenda de la station, puis propose chaque semaine trois priorités. L&apos;équipe valide.
          </p>
          <div className="relative mt-8 pb-16">
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Image src="/lodge/lp-4.jpg" alt="Le salon du Lodge Park à Megève, au coin du feu" fill priority unoptimized sizes="520px" className="object-cover object-[62%_40%]" />
              <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-xs text-white/90 backdrop-blur">Lodge Park · Megève</span>
            </div>
            <div aria-hidden className="absolute -left-8 bottom-0 w-[88%] overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)] ring-1 ring-black/5">
              <p className="border-b border-[#ece7e1] px-4 py-2.5 text-[0.8125rem] font-semibold text-[#251209]">À décider cette semaine</p>
              <ul className="divide-y divide-[#ece7e1]">
                {APERCU.map((a) => {
                  const I = a.icone;
                  return (
                    <li key={a.titre} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#ece7e1] bg-[#f6f5f3] text-[#6b5e54]">
                        <I className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[0.6875rem] text-[#8a7a6c]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.couleur }} />
                          {a.marche} · {a.canal}
                        </span>
                        <span className="block truncate text-[0.8125rem] font-medium text-[#251209]">{a.titre}</span>
                      </span>
                      {a.etat === "valider" ? (
                        <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#4c3327] px-2.5 text-xs font-medium text-white">
                          <Check className="h-3 w-3" /> Valider
                        </span>
                      ) : a.etat === "validee" ? (
                        <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-sage/12 px-2.5 text-xs font-medium text-[#3d6639]">
                          <Check className="h-3 w-3" /> Validée
                        </span>
                      ) : (
                        <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-ochre/14 px-2.5 text-xs font-medium text-[#7c5a17]">
                          <Clock className="h-3 w-3" /> Reportée
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[0.6875rem] text-white/40">Aperçu illustratif.</p>
        </div>
      </div>
    </div>
  );
}
