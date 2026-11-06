import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TableName } from "../types";
import type { ListQuery, NewRow, Row, Store } from "./store";
import { config } from "../config";
import { BASE_AGENTS, BASE_SERVICES, BASE_WORKFLOWS } from "./seed";

/**
 * Cliente Supabase autenticado con el token del usuario (cookie httpOnly).
 * Todas las consultas pasan por RLS: cada fila pertenece a owner_id = auth.uid().
 */
export function supabaseForToken(accessToken: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function supabaseAnon(): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Claves compuestas: en Supabase los ids "de catálogo" (agentes, servicios, workflows) son únicos por owner.
// La columna id es text en esas tablas y la PK es (owner_id, id).

/**
 * ownerId solo se usa con el cliente service-role (webhooks entrantes de n8n), donde no hay auth.uid():
 * fuerza owner_id en inserciones y filtra todas las consultas por ese propietario.
 */
export function createSupabaseStore(sb: SupabaseClient, ownerId?: string): Store {
  const fail = (op: string, table: string, err: { message: string } | null) => {
    if (err) throw new Error(`Supabase ${op} ${table}: ${err.message}`);
  };
  return {
    kind: "supabase",
    async list<T extends TableName>(table: T, q?: ListQuery<T>) {
      let query = sb.from(table).select("*");
      if (ownerId) query = query.eq("owner_id", ownerId);
      if (q?.eq) for (const [k, v] of Object.entries(q.eq)) query = v === null ? query.is(k, null) : query.eq(k, v as string);
      if (q?.since) query = query.gte(q.since.column, q.since.iso);
      const order = q?.order ?? { column: "created_at", ascending: false };
      query = query.order(order.column, { ascending: order.ascending ?? false });
      if (q?.limit) query = query.limit(q.limit);
      const { data, error } = await query;
      fail("list", table, error);
      return (data ?? []) as Row<T>[];
    },
    async get<T extends TableName>(table: T, id: string) {
      let query = sb.from(table).select("*").eq("id", id);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const { data, error } = await query.maybeSingle();
      fail("get", table, error);
      return (data as Row<T>) ?? null;
    },
    async insert<T extends TableName>(table: T, row: NewRow<T>) {
      const { data, error } = await sb.from(table).insert(ownerId ? { ...row, owner_id: ownerId } : row).select("*").single();
      fail("insert", table, error);
      return data as Row<T>;
    },
    async update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
      const { id: _i, created_at: _c, ...safe } = patch as Record<string, unknown>;
      void _i; void _c;
      let query = sb.from(table).update(safe).eq("id", id);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const { data, error } = await query.select("*").single();
      fail("update", table, error);
      return data as Row<T>;
    },
    async remove<T extends TableName>(table: T, id: string) {
      let query = sb.from(table).delete().eq("id", id);
      if (ownerId) query = query.eq("owner_id", ownerId);
      const { error } = await query;
      fail("delete", table, error);
    },
  };
}

/** Crea agentes, catálogo y workflows del usuario si aún no existen (idempotente). */
export async function ensureBaseRows(sb: SupabaseClient) {
  const { count } = await sb.from("agents").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  await sb.from("agents").upsert(BASE_AGENTS, { onConflict: "owner_id,id", ignoreDuplicates: true });
  await sb.from("services").upsert(BASE_SERVICES, { onConflict: "owner_id,id", ignoreDuplicates: true });
  await sb.from("workflows").upsert(BASE_WORKFLOWS, { onConflict: "owner_id,id", ignoreDuplicates: true });
}

/** Cliente con service role SOLO para webhooks entrantes verificados por HMAC. Nunca se expone al navegador. */
export function serviceStoreForWebhooks(): Store | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const owner = process.env.N8N_OWNER_ID;
  if (!key || !owner || !config.supabaseUrl) return null;
  const sb = createClient(config.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return createSupabaseStore(sb, owner);
}
