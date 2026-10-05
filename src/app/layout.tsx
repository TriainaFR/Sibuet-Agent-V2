import type { Metadata } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import { Entete } from "@/components/entete";
import "./globals.css";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "Agent Sibuet · Lodge Park",
  description: "Détecteur d'opportunités marketing multicanal : de quoi parler, quand, à qui, avec quels leviers.",
  icons: { icon: "/brand/favicon.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${garamond.variable} ${sourceSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Entete />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 bg-greige text-white">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-6 py-8">
            <div>
              <p className="font-display text-2xl">L&apos;art de vivre, au bon moment.</p>
              <p className="eyebrow mt-1 text-white/80">Le système propose, l&apos;équipe valide</p>
            </div>
            <p className="text-xs text-white/85">Agent Sibuet · Allin Conseil et Triaina · démonstration</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
