import type { Metadata } from "next";
import { EB_Garamond, Source_Sans_3 } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "Calendrier d'activation · Maisons & Hôtels Sibuet",
  description: "Outil d'aide à la décision marketing : quand parler de quoi, à qui, avec quels leviers.",
  icons: { icon: "/brand/favicon.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${garamond.variable} ${sourceSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-white px-6 py-5 text-xs text-ink-soft">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>Maisons & Hôtels Sibuet · L&apos;art de vivre à la française</span>
            <span>Outil d&apos;activation marketing · prototype Triaina</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
