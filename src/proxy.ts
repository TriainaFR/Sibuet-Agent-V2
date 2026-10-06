import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSION, jetonValide, protectionActive } from "@/lib/session";

// Protège toute l'application derrière la page de connexion, y compris les actions serveur
// et les routes /api. Sans APP_PASSWORD défini (développement local), tout reste ouvert.

export async function proxy(request: NextRequest) {
  if (!protectionActive()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (pathname === "/connexion") return NextResponse.next();
  if (await jetonValide(request.cookies.get(COOKIE_SESSION)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const url = new URL("/connexion", request.url);
  if (pathname !== "/") url.searchParams.set("suite", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Tout sauf les fichiers statiques (images, polices, logo).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|hotels/|lodge/).*)"],
};
