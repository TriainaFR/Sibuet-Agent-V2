"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";

// Panneau « Rédiger avec Claude » : génère les textes prêts à l'emploi de la fiche.

export function DraftPanel({ ficheId }: { ficheId: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setState("loading");
    setText("");
    setError("");
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ficheId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erreur ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + decoder.decode(value, { stream: true }));
      }
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  return (
    <section className="rounded-md border border-brown/25 bg-white">
      <div className="flex flex-wrap items-center gap-4 border-b border-line p-5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brown text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight">Rédiger avec Claude</h2>
          <p className="text-sm text-ink-soft">Carrousel, annonces, articles, newsletters… dans le ton Sibuet et dans la langue de chaque marché.</p>
        </div>
        <div className="flex gap-2">
          {state === "done" && (
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-greige"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copier
            </button>
          )}
          <button
            onClick={generate}
            disabled={state === "loading"}
            className="rounded-full bg-brown px-5 py-2 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-60"
          >
            {state === "loading" ? "Rédaction…" : state === "done" ? "Régénérer" : "Rédiger les contenus"}
          </button>
        </div>
      </div>
      {state === "error" && <p className="p-5 text-sm text-brick">{error}</p>}
      {(state === "loading" || state === "done") && (
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {text ? <Markdown text={text} /> : <p className="animate-pulse text-sm text-taupe">Claude lit la fiche et prépare les contenus…</p>}
        </div>
      )}
    </section>
  );
}

/** Rendu Markdown minimal (titres, listes, gras, italique). */
function Markdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g).map((part, i) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (/^(_[^_]+_|\*[^*]+\*)$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (/^#{1,2} /.test(line)) return <h3 key={i} className="pt-4 font-display text-xl text-brown first:pt-0">{inline(line.replace(/^#+ /, ""))}</h3>;
        if (/^#{3,} /.test(line)) return <h4 key={i} className="pt-2 font-semibold">{inline(line.replace(/^#+ /, ""))}</h4>;
        if (/^\s*[-*] /.test(line)) return <p key={i} className="pl-4 -indent-3">• {inline(line.replace(/^\s*[-*] /, ""))}</p>;
        if (/^\s*\d+[.)] /.test(line)) return <p key={i} className="pl-4">{inline(line.trim())}</p>;
        if (/^\|/.test(line)) return <p key={i} className="font-mono text-xs">{line}</p>;
        if (line.trim() === "---") return <hr key={i} className="border-line" />;
        if (!line.trim()) return null;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
