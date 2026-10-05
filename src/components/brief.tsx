"use client";

import { Check, Copy, FileText, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { controlerTexte } from "@/lib/format";

/** Brief exécutable par canal (prompt P4), produit après validation de l'activation. */
export function Brief({ sujetId, activationCle, actif }: { sujetId: string; activationCle: string; actif: boolean }) {
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<"repos" | "encours" | "fini" | "erreur">("repos");
  const [source, setSource] = useState("");
  const [copie, setCopie] = useState(false);

  async function produire() {
    setEtat("encours");
    setTexte("");
    try {
      const res = await fetch("/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sujetId, activationCle }) });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Erreur ${res.status}`);
      setSource(decodeURIComponent(res.headers.get("x-brief-source") ?? ""));
      const lecteur = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        setTexte((t) => t + dec.decode(value, { stream: true }));
      }
      setEtat("fini");
    } catch (e) {
      setTexte(e instanceof Error ? e.message : String(e));
      setEtat("erreur");
    }
  }

  const problemes = etat === "fini" ? controlerTexte(texte) : [];
  return (
    <div className="border border-line bg-cream/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-taupe" /> Brief exécutable du canal
        </p>
        <div className="flex gap-2">
          {etat === "fini" && (
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(texte);
                setCopie(true);
                setTimeout(() => setCopie(false), 1500);
              }}
              className="inline-flex items-center gap-1 border border-line bg-white px-3 py-1.5 text-xs hover:border-ink"
            >
              {copie ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copier
            </button>
          )}
          <button
            disabled={!actif || etat === "encours"}
            onClick={produire}
            title={actif ? "" : "Le brief est produit après validation de l'activation"}
            className="bouton !px-4 !py-2"
          >
            {etat === "encours" ? "Rédaction…" : etat === "fini" ? "Refaire le brief" : "Produire le brief"}
          </button>
        </div>
      </div>
      {!actif && etat === "repos" && <p className="mt-2 text-xs text-ink-soft">Disponible après validation de l&apos;activation.</p>}
      {texte && (
        <div className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap border border-line bg-white p-4 text-sm leading-relaxed">{texte}</div>
      )}
      {etat === "fini" && (
        <p className={`mt-2 flex items-center gap-1.5 text-xs ${problemes.length ? "text-brick" : "text-sage"}`}>
          {problemes.length ? <ShieldAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {problemes.length ? `Contrôle des règles de forme : ${problemes.join(", ")}.` : "Contrôle des règles de forme : rien à signaler."}
          {source && <span className="text-ink-soft"> · {source}</span>}
        </p>
      )}
    </div>
  );
}
