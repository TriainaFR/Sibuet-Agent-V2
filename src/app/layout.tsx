import type { Metadata } from "next";
import { Cardo, DM_Serif_Display, EB_Garamond, Inter, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], preload: false });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "600", "700"], preload: false });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Serifs de titre des maisons (design system) : chargées sans préchargement, utilisées par leur thème.
const cardo = Cardo({ variable: "--font-cardo", subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500"], preload: false });
const dmSerif = DM_Serif_Display({ variable: "--font-dmserif", subsets: ["latin"], weight: ["400"], preload: false });

const domaine = process.env.RAILWAY_PUBLIC_DOMAIN || "sibuet-agent-v2-production.up.railway.app";
const description = "Ce qu'il faut lancer, à qui, et quand : les opportunités marketing des maisons Sibuet, marché par marché.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${domaine}`),
  title: { default: "Agent Sibuet", template: "%s · Agent Sibuet" },
  description,
  applicationName: "Agent Sibuet",
  // Aperçu de partage (WhatsApp, iMessage, Slack, LinkedIn) : image publique, hors connexion.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Agent Sibuet · Maisons & Hôtels Sibuet",
    title: "Agent Sibuet",
    description,
    images: [{ url: "/brand/partage.jpg", width: 1200, height: 630, alt: "Agent Sibuet, Maisons & Hôtels Sibuet" }],
  },
  twitter: { card: "summary_large_image", title: "Agent Sibuet", description, images: ["/brand/partage.jpg"] },
  icons: { icon: "/brand/favicon.jpg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${garamond.variable} ${sourceSans.variable} ${cardo.variable} ${playfair.variable} ${dmSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
