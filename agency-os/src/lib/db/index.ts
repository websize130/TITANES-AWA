import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authSecret, config, supabaseConfigured } from "../config";
import { SB_ACCESS_COOKIE, SESSION_COOKIE, verifySession } from "../session-token";
import { localStore } from "./local";
import { createSupabaseStore, ensureBaseRows, supabaseForToken } from "./supabase";
import type { Store } from "./store";

export interface Session {
  userId: string;
  email: string | null;
  store: Store;
}

/** Devuelve la sesión actual o null. Memoizada por petición. */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  if (config.dataBackend === "supabase") {
    if (!supabaseConfigured()) return null;
    const token = jar.get(SB_ACCESS_COOKIE)?.value;
    if (!token) return null;
    const sb = supabaseForToken(token);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    await ensureBaseRows(sb);
    return { userId: data.user.id, email: data.user.email ?? null, store: createSupabaseStore(sb) };
  }
  if (config.appEnv === "production" && process.env.ALLOW_LOCAL_STORE !== "true") return null;
  const s = await verifySession(authSecret(), jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  return { userId: s.sub, email: null, store: localStore };
});

/** Para páginas y acciones: exige sesión o redirige a /login. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function db(): Promise<Store> {
  return (await requireSession()).store;
}
