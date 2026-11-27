import { Check, Clock, Globe2, Mail, Search, ShieldCheck, Briefcase } from "lucide-react";
import Image from "next/image";
import { identifiantDemande } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire";

export const metadata = { title: "Connexion" };

// Aperçu illustratif de l'application : aucun chiffre client avant connexion.
const APERCU = [
  { icone: Mail, canal: "Newsletter et CRM", marche: "Royaume-Uni", couleur: "#6f7456", titre: "Envoyer la newsletter de janvier aux clients britanniques", etat: "valider" },
  { icone: Search, canal: "Référencement", marche: "France", couleur: "#3f6185", titre: "Créer la page des vacances d'hiver avant l'ouverture de la fenêtre", etat: "validee" },
  { icone: Briefcase, canal: "Agences", marche: "États-Unis", couleur: "#7b5f8c", titre: "Écrire aux agences pour les fêtes de fin d'année", etat: "reportee" },
] as const;

export default async function Connexion({ searchParams }: PageProps<"/connexion">) {
  const { suite } = await searchParams;
  const avecIdentifiant = identifiantDemande();
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(420px,1fr)_1.15fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Image src="/brand/logo-mhs-color.svg" alt="Maisons & Hôtels Sibuet" width={132} height={37} priority className="h-auto w-[132px]" />
        <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
          <span className="inline-flex self-start rounded-md border border-line bg-cream px-2 py-0.5 text-xs font-medium text-ink-soft">Agent Sibuet</span>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">Bon retour parmi nous</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">Connectez-vous pour voir ce qu&apos;il faut lancer cette semaine, marché par marché.</p>
          <FormulaireConnexion suite={typeof suite === "string" ? suite : "/"} avecIdentifiant={avecIdentifiant} />
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-taupe">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            Accès réservé aux équipes Sibuet, Allin Conseil et Triaina. Chaque connexion est enregistrée.
          </p>
        </div>
        <p className="text-xs text-taupe">Maisons &amp; Hôtels Sibuet · Allin Conseil · Triaina</p>
      </div>

      <div className="relative hidden overflow-hidden bg-nav lg:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div aria-hidden className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[#a8683f] opacity-20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-14 py-16 xl:px-20">
          <p className="max-w-md text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-white">Ce qu&apos;il faut lancer, à qui, et quand.</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
            L&apos;agent lit les ventes, Google et l&apos;agenda de la station, puis propose chaque semaine trois priorités. L&apos;équipe valide.
          </p>

          <div aria-hidden className="mt-10 max-w-[520px] rounded-xl bg-white/[0.06] p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <div className="rounded-lg bg-white">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <p className="text-[0.8125rem] font-semibold">À décider cette semaine</p>
                <span className="inline-flex items-center gap-1 text-xs text-taupe">
                  <Globe2 className="h-3.5 w-3.5" /> Tous les marchés
                </span>
              </div>
              <ul className="divide-y divide-line">
                {APERCU.map((a) => {
                  const I = a.icone;
                  return (
                    <li key={a.titre} className="flex items-center gap-3 px-4 py-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-cream text-ink-soft">
                        <I className="h-4 w-4" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-xs text-taupe">
                          <span className="h-2 w-2 rounded-full" style={{ background: a.couleur }} />
                          {a.marche} · {a.canal}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.8125rem] font-medium text-ink">{a.titre}</span>
                      </span>
                      {a.etat === "valider" ? (
                        <span className="inline-flex h-7 items-center gap-1 rounded-lg bg-nav px-2.5 text-xs font-medium text-white">
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
              <div className="flex items-center gap-3 border-t border-line px-4 py-3">
                <span className="w-24 shrink-0 text-xs text-taupe">Fenêtres d&apos;achat</span>
                <span className="relative h-4 flex-1 rounded bg-cream">
                  <span className="absolute inset-y-0.5 left-[8%] w-[34%] rounded-[4px] bg-[#6f7456]/80" />
                  <span className="absolute inset-y-0.5 left-[30%] w-[40%] rounded-[4px] bg-[#3f6185]/80" />
                  <span className="absolute inset-y-0.5 left-[58%] w-[30%] rounded-[4px] bg-[#7b5f8c]/80" />
                  <span className="absolute inset-y-0 left-[16%] w-0.5 rounded bg-[#a8683f]" />
                </span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/45">Aperçu illustratif.</p>
        </div>
      </div>
    </div>
  );
}
