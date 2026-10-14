// Session de connexion : un jeton signé (HMAC SHA-256) gardé dans un cookie httpOnly.
// Le jeton contient sa date d'expiration et l'identifiant du compte ; la signature empêche de le fabriquer.
// Web Crypto : fonctionne dans le proxy comme dans les actions serveur.
//
// Variables d'environnement (Railway > Variables) :
//   APP_USER / APP_PASSWORD        premier compte (APP_USER facultatif s'il n'y a qu'un compte)
//   APP_USER_2 / APP_PASSWORD_2    comptes supplémentaires, numérotés de 2 à 20
//   SESSION_SECRET                 clé de signature des sessions (recommandée, 32 caractères ou plus)
//
// Retirer un compte, ou changer son mot de passe, déconnecte immédiatement ses sessions ouvertes.

export const COOKIE_SESSION = "sibuet_session";
export const DUREE_SESSION_JOURS = 7;

export interface Compte {
  identifiant: string;
  motDePasse: string;
}

/** Comptes déclarés dans les variables d'environnement. */
export function comptes(): Compte[] {
  const liste: Compte[] = [];
  for (let n = 1; n <= 20; n++) {
    const suffixe = n === 1 ? "" : `_${n}`;
    const motDePasse = process.env[`APP_PASSWORD${suffixe}`];
    if (motDePasse) liste.push({ identifiant: (process.env[`APP_USER${suffixe}`] ?? "").trim().toLowerCase(), motDePasse });
  }
  return liste;
}

/** La protection n'est active que si au moins un mot de passe est défini (en local, l'app reste ouverte). */
export const protectionActive = () => comptes().length > 0;

/** Identifiant demandé dès qu'un compte en a un (forcément le cas avec plusieurs comptes). */
export const identifiantDemande = () => comptes().some((c) => c.identifiant);

const encodeur = new TextEncoder();

function base64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function cle() {
  const secret = process.env.SESSION_SECRET || `sibuet:${comptes().map((c) => c.motDePasse).join("|")}`;
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

/** Compte correspondant à l'identifiant et au mot de passe saisis, ou null. Chaque compte est comparé, en temps constant. */
export function verifier(identifiant: string, motDePasse: string): Compte | null {
  const id = identifiant.trim().toLowerCase();
  let trouve: Compte | null = null;
  for (const c of comptes()) {
    const ok = egal(motDePasse, c.motDePasse) && (!c.identifiant || egal(id, c.identifiant));
    if (ok && !trouve) trouve = c;
  }
  return trouve;
}

// La signature couvre le mot de passe du compte : le changer invalide les sessions de ce compte.
const charge = (expire: string, compte: Compte) => `${expire}.${compte.identifiant}.${compte.motDePasse}`;
const enc = (s: string) => base64url(encodeur.encode(s).buffer as ArrayBuffer);
const dec = (s: string) => {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
};

export async function creerJeton(compte: Compte) {
  const expire = String(Date.now() + DUREE_SESSION_JOURS * 86_400_000);
  return `${expire}.${enc(compte.identifiant)}.${await signer(charge(expire, compte))}`;
}

export async function jetonValide(jeton: string | undefined) {
  if (!jeton) return false;
  const [expire, idEncode, signature] = jeton.split(".");
  if (!expire || idEncode === undefined || !signature || Number(expire) < Date.now()) return false;
  const identifiant = dec(idEncode);
  const compte = comptes().find((c) => c.identifiant === identifiant);
  if (!compte) return false;
  return egal(signature, await signer(charge(expire, compte)));
}
