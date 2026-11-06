import { NextResponse, type NextRequest } from "next/server";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE, SESSION_COOKIE, jwtExp, verifySession } from "./lib/session-token";

// Comprobación optimista de sesión. La autorización real se repite en servidor (getSession) y en Supabase (RLS).

const PUBLIC = ["/login", "/api/webhooks/n8n"];

function devSecret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  return process.env.APP_ENV === "production" ? null : "dev-only-insecure-secret-change-me-0000000000";
}

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const toLogin = () => {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  };

  if (process.env.DATA_BACKEND === "supabase") {
    const access = req.cookies.get(SB_ACCESS_COOKIE)?.value;
    const refresh = req.cookies.get(SB_REFRESH_COOKIE)?.value;
    if (!access && !refresh) return toLogin();
    // Refresca el token si caduca en menos de 60 s.
    if ((!access || jwtExp(access) - 60 < Date.now() / 1000) && refresh) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return toLogin();
      const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!r.ok) return toLogin();
      const t = (await r.json()) as { access_token: string; refresh_token: string; expires_in: number };
      // Propaga el token nuevo a esta misma petición y al navegador.
      req.cookies.set(SB_ACCESS_COOKIE, t.access_token);
      const res = NextResponse.next({ request: { headers: req.headers } });
      res.cookies.set(SB_ACCESS_COOKIE, t.access_token, { ...cookieOpts, maxAge: t.expires_in });
      res.cookies.set(SB_REFRESH_COOKIE, t.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
      return res;
    }
    return NextResponse.next();
  }

  const secret = devSecret();
  if (!secret) return toLogin();
  const session = await verifySession(secret, req.cookies.get(SESSION_COOKIE)?.value);
  return session ? NextResponse.next() : toLogin();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sprites/).*)"],
};
