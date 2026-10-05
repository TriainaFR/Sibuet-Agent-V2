import Anthropic from "@anthropic-ai/sdk";
import { calculerSaison } from "@/lib/engine/calcul";
import { briefGabarit, contexteBrief, lirePrompt } from "@/services/briefs";
import { construireContexte } from "@/services/contexte";
import { lireDecisions } from "@/services/reference";

// Brief exécutable par canal (prompt P4), produit après validation de l'activation.
// Avec ANTHROPIC_API_KEY : rédigé par Claude à partir des prompts P0 et P4 de Jérôme.
// Sans clé : brief au gabarit P4, construit sans modèle de langage. Les deux fonctionnent en démo.

export const maxDuration = 300;

export async function POST(request: Request) {
  const { sujetId, activationCle } = (await request.json()) as { sujetId?: string; activationCle?: string };
  const ctx = construireContexte();
  const s = calculerSaison(ctx).find((x) => x.def.id === sujetId);
  const a = s?.activations.find((x) => x.cle === activationCle);
  if (!s || !a) return Response.json({ error: "Activation introuvable." }, { status: 404 });
  if (lireDecisions()[a.cle]?.etat !== "validee") return Response.json({ error: "Le brief est produit après validation de l'activation." }, { status: 409 });

  const entetes = (source: string) => ({ "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-brief-source": encodeURIComponent(source) });
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return new Response(briefGabarit(ctx, s, a), { headers: entetes("Gabarit P4, sans IA (aucune clé Claude configurée)") });
  }

  const client = new Anthropic();
  const flux = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: `${lirePrompt("P0_regles_transverses.md")}\n\n${lirePrompt("P4_brief_par_canal.md")}`,
    messages: [
      {
        role: "user",
        content: `Voici l'activation validée et sa fiche de thème, avec les données du calcul du jour. Rédige le brief de ce canal au gabarit P4 (gabarit commun puis section du canal), en texte simple : titres en capitales, listes avec un tiret simple, sans dièse, sans astérisque, sans tiret long. Cite la source et la date de chaque chiffre. Ce qui manque est dit en une ligne.\n\n${contexteBrief(ctx, s, a)}`,
      },
    ],
  });

  const enc = new TextEncoder();
  const corps = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        for await (const ev of flux) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") c.enqueue(enc.encode(ev.delta.text));
        }
        const fin = await flux.finalMessage();
        if (fin.stop_reason === "refusal") c.enqueue(enc.encode("\n\nRédaction interrompue par le modèle."));
        if (fin.stop_reason === "max_tokens") c.enqueue(enc.encode("\n\nTexte tronqué (limite de longueur)."));
      } catch (e) {
        const msg =
          e instanceof Anthropic.AuthenticationError
            ? "Clé Claude invalide."
            : e instanceof Anthropic.RateLimitError
              ? "Trop de requêtes, réessayez dans une minute."
              : e instanceof Anthropic.APIError
                ? `Erreur de l'API Claude (${e.status}).`
                : "Erreur inattendue.";
        c.enqueue(enc.encode(`\n\n${msg} Voici le brief au gabarit :\n\n${briefGabarit(ctx, s, a)}`));
      } finally {
        c.close();
      }
    },
  });
  return new Response(corps, { headers: entetes("Rédigé par Claude (P0 et P4)") });
}
