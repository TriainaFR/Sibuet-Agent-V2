import type { Metadata } from "next";
import { Cardo, DM_Serif_Display, EB_Garamond, Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "600", "700"] });
// Serifs de titre des maisons (design system) : chargées sans préchargement, utilisées par leur thème.
const cardo = Cardo({ variable: "--font-cardo", subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500"], preload: false });
const dmSerif = DM_Serif_Display({ variable: "--font-dmserif", subsets: ["latin"], weight: ["400"], preload: false });

export const metadata: Metadata = {
  title: { default: "Agent Sibuet", template: "%s · Agent Sibuet" },
  description: "Détecteur d'opportunités marketing multicanal : de quoi parler, quand, à qui, avec quels leviers.",
  icons: { icon: "/brand/favicon.jpg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${garamond.variable} ${sourceSans.variable} ${cardo.variable} ${playfair.variable} ${dmSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
