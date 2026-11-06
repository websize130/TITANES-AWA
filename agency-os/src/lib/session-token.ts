// Firma/verificación HMAC de la cookie de sesión local con Web Crypto (válido en proxy y en servidor).

export const SESSION_COOKIE = "aos_session";
export const SB_ACCESS_COOKIE = "aos_sb_access";
export const SB_REFRESH_COOKIE = "aos_sb_refresh";
export const SESSION_TTL_S = 60 * 60 * 12;

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signSession(secret: string, sub: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S })));
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifySession(secret: string, token: string | undefined): Promise<{ sub: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(secret, payload))) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as { sub: string; exp: number };
    if (data.exp < Date.now() / 1000) return null;
    return { sub: data.sub };
  } catch {
    return null;
  }
}

/** Lee `exp` de un JWT sin verificar (solo para decidir si refrescar; Supabase verifica en cada consulta). */
export function jwtExp(token: string): number {
  try {
    const part = token.split(".")[1];
    return (JSON.parse(fromB64url(part)) as { exp?: number }).exp ?? 0;
  } catch {
    return 0;
  }
}
