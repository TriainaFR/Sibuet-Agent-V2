import Anthropic from "@anthropic-ai/sdk";
import { destinationById, hotelById } from "@/config/hotels";
import { levers, marketByCode } from "@/config/markets";
import { formatDate, formatRange } from "@/lib/dates";
import { getFiche } from "@/lib/engine/plan";

// Rédaction des contenus d'une fiche par Claude (réponse en streaming, texte Markdown).
// Nécessite ANTHROPIC_API_KEY dans .env.local.

export const maxDuration = 300;

const BRAND_VOICE = `Tu écris pour Maisons & Hôtels Sibuet (Megève, Ménerbes, Saint-Tropez, Saint-Barth), groupe familial fondé par Jocelyne et Jean-Louis Sibuet.
Ton de la marque, tiré de leur site :
- « L'art de vivre à la française » : chaleureux, familial, « simples et chic, intimes et conviviaux ».
- Jamais guindé : « moins petit doigt levé que petit-dej au lit, plutôt saveurs éprouvées que serveurs en queue de pie ».
- Du concret et des sensations : le vieux bois, le feu dans l'âtre, la fondue qui bouillonne, les vignes, les pins centenaires, le lagon turquoise.
- Une pointe d'esprit, parfois une rime, jamais de superlatifs creux (« luxueux », « exceptionnel », « incontournable »).
- Pas d'émojis dans les annonces Google. Au plus un ou deux dans les légendes Instagram.
Écris directement dans chaque langue demandée (pas de traduction mot à mot).`;

export async function POST(request: Request) {
  const { ficheId } = (await request.json()) as { ficheId?: string };
  const fiche = ficheId ? getFiche(ficheId) : null;
  if (!fiche) return Response.json({ error: "Fiche introuvable" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "Clé API manquante : ajoutez ANTHROPIC_API_KEY dans calendrier-activation/.env.local puis relancez le serveur." },
      { status: 501 },
    );
  }

  const hotel = hotelById[fiche.hotelId];
  const dest = destinationById[hotel.destination];
  const leverList = [...new Set(fiche.actions.map((a) => a.lever))];
  const languages = [...new Set(fiche.markets.map((m) => marketByCode[m.market].language))];

  const brief = `# Fiche : ${fiche.moment.title}
Maison : ${hotel.name} (${dest.name}, ${dest.region}) · ${hotel.tagline}
${hotel.description}
Points forts : ${hotel.highlights.join(" ; ")}
${fiche.moment.timing === "communication" ? "Opération" : "Séjours visés"} : ${formatRange(fiche.eventStart, fiche.eventEnd)}
Objectif : ${fiche.moment.objective}
Angle proposé : ${fiche.moment.angle}
Marchés ciblés : ${fiche.markets.map((m) => `${marketByCode[m.market].name} (${m.share} % des nuitées, réservent ~${m.windowMedian} j avant)`).join(", ")}
Langues à couvrir : ${languages.join(", ")}
Mots-clés : ${fiche.moment.keywords.join(", ") || "aucun"}

## Plan d'actions calculé
${fiche.actions.map((a) => `- ${levers[a.lever].label} · ${a.title} · ${a.endDate ? formatRange(a.date, a.endDate) : formatDate(a.date, true)}`).join("\n")}`;

  const sections = [
    leverList.includes("instagram") && "## Instagram : carrousel de 5 slides (texte et idée de photo pour chaque slide) + légende en FR et, si besoin, dans la langue principale des marchés étrangers",
    leverList.includes("google-ads") && "## Google Ads : pour chaque langue, 5 titres (≤ 30 caractères), 2 descriptions (≤ 90 caractères), 10 mots-clés et 5 mots-clés négatifs",
    leverList.includes("seo") && "## SEO / GEO : 2 articles (titre, méta-description ≤ 155 caractères, plan en H2, 3 questions de FAQ, liens internes à poser)",
    leverList.includes("newsletter") && "## Newsletter : par langue, 3 objets, 1 pré-header et un texte court (≤ 120 mots)",
    leverList.includes("crm") && "## Message CRM aux anciens clients : un texte personnel, signé de la maison (≤ 90 mots), en FR et EN",
    leverList.includes("rp") && "## Relations presse : pitch de 5 lignes et 3 angles de sujets pour journalistes",
    leverList.includes("linkedin") && "## LinkedIn : 1 post (≤ 120 mots)",
  ].filter(Boolean);

  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: BRAND_VOICE,
    messages: [
      {
        role: "user",
        content: `${brief}\n\nRédige les contenus prêts à l'emploi pour cette fiche, en Markdown, avec exactement ces sections :\n${sections.join("\n")}\n\nPas d'introduction ni de conclusion : commence directement par la première section.`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(encoder.encode("\n\n_La rédaction a été interrompue par le modèle._"));
        if (final.stop_reason === "max_tokens") controller.enqueue(encoder.encode("\n\n_Texte tronqué (limite de longueur atteinte)._"));
      } catch (error) {
        const message =
          error instanceof Anthropic.AuthenticationError
            ? "Clé API invalide."
            : error instanceof Anthropic.RateLimitError
              ? "Trop de requêtes : réessayez dans une minute."
              : error instanceof Anthropic.APIError
                ? `Erreur de l'API (${error.status}).`
                : "Erreur inattendue.";
        controller.enqueue(encoder.encode(`\n\n_${message}_`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
