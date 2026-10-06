// Session de connexion : un jeton signé (HMAC SHA-256) gardé dans un cookie httpOnly.
// Le jeton contient seulement sa date d'expiration ; la signature empêche de le fabriquer.
// Web Crypto : fonctionne dans le proxy comme dans les actions serveur.
//
// Variables d'environnement (Railway > Variables) :
//   APP_PASSWORD    mot de passe d'accès (obligatoire pour activer la protection)
//   APP_USER        identifiant (facultatif ; si vide, seul le mot de passe est demandé)
//   SESSION_SECRET  clé de signature des sessions (facultative mais recommandée, 32 caractères ou plus)

export const COOKIE_SESSION = "sibuet_session";
export const DUREE_SESSION_JOURS = 7;

/** La protection n'est active que si un mot de passe est défini (en local, l'app reste ouverte). */
export const protectionActive = () => Boolean(process.env.APP_PASSWORD);

const encodeur = new TextEncoder();

function base64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function cle() {
  const secret = process.env.SESSION_SECRET || `sibuet:${process.env.APP_PASSWORD ?? ""}`;
  return crypto.subtle.importKey("raw", encodeur.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function signer(valeur: string) {
  return base64url(await crypto.subtle.sign("HMAC", await cle(), encodeur.encode(valeur)));
}

/** Comparaison en temps constant, pour ne rien laisser deviner par le temps de réponse. */
export function egal(a: string, b: string) {
  const x = encodeur.encode(a);
  const y = encodeur.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function creerJeton() {
  const expire = Date.now() + DUREE_SESSION_JOURS * 86_400_000;
  return `${expire}.${await signer(String(expire))}`;
}

export async function jetonValide(jeton: string | undefined) {
  if (!jeton) return false;
  const [expire, signature] = jeton.split(".");
  if (!expire || !signature || Number(expire) < Date.now()) return false;
  return egal(signature, await signer(expire));
}
