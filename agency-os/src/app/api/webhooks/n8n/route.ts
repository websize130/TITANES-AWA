import { NextResponse, type NextRequest } from "next/server";
import * as z from "zod/v4";
import { config } from "@/lib/config";
import { localStore } from "@/lib/db/local";
import { serviceStoreForWebhooks } from "@/lib/db/supabase";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "@/lib/n8n";
import { logActivity } from "@/lib/activity";

// Webhook entrante de n8n. Autenticado SOLO por firma HMAC + ventana temporal; idempotente por idempotency_key.

const Event = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("workflow.result"),
    workflow: z.string().max(60),
    idempotency_key: z.string().max(100).optional(),
    status: z.enum(["ok", "error"]).default("ok"),
    data: z.unknown().optional(),
  }),
  z.object({
    event: z.literal("lead.create"),
    idempotency_key: z.string().max(100).optional(),
    lead: z.object({
      business_name: z.string().min(1).max(200),
      sector: z.string().max(100).default(""),
      city: z.string().max(100).default(""),
      website: z.string().max(500).optional(),
      phone: z.string().max(40).optional(),
      email: z.string().max(200).optional(),
      contact_name: z.string().max(120).optional(),
      notes: z.string().max(2000).optional(),
      source: z.string().max(100).default("n8n"),
    }),
  }),
]);

const seen = new Map<string, number>();

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "Demasiado grande" }, { status: 413 });
  if (!verifySignature(raw, req.headers.get(TIMESTAMP_HEADER), req.headers.get(SIGNATURE_HEADER))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  const store = config.dataBackend === "supabase" ? serviceStoreForWebhooks() : localStore;
  if (!store) return NextResponse.json({ error: "Webhooks entrantes no configurados" }, { status: 503 });

  let parsed;
  try {
    parsed = Event.parse(JSON.parse(raw));
  } catch (e) {
    return NextResponse.json({ error: "Payload inválido", detail: (e as Error).message.slice(0, 300) }, { status: 400 });
  }

  // Protección contra ejecuciones duplicadas (reintentos de n8n).
  if (parsed.idempotency_key) {
    const k = `${parsed.event}:${parsed.idempotency_key}`;
    const now = Date.now();
    for (const [key, t] of seen) if (now - t > 3600_000) seen.delete(key);
    if (seen.has(k)) return NextResponse.json({ ok: true, duplicate: true });
    seen.set(k, now);
  }

  if (parsed.event === "workflow.result") {
    const wf = await store.get("workflows", parsed.workflow);
    if (!wf) return NextResponse.json({ error: "Workflow desconocido" }, { status: 404 });
    await store.update("workflows", wf.id, { last_status: parsed.status, last_run_at: new Date().toISOString() });
    await logActivity(store, "n8n", `Resultado de ${wf.name}: ${parsed.status}`, { entity: "workflows", entityId: wf.id, detail: JSON.stringify(parsed.data ?? null).slice(0, 2000), level: parsed.status === "ok" ? "info" : "error" });
    return NextResponse.json({ ok: true });
  }

  const l = parsed.lead;
  const website = l.website ? (/^https?:\/\//i.test(l.website) ? l.website : `https://${l.website}`) : null;
  const existing = await store.list("leads");
  const dup = existing.find((x) => (website && x.website?.toLowerCase() === website.toLowerCase()) || (l.email && x.email?.toLowerCase() === l.email.toLowerCase()));
  if (dup) return NextResponse.json({ ok: true, duplicate: true, lead_id: dup.id });
  const lead = await store.insert("leads", {
    business_name: l.business_name, sector: l.sector, city: l.city, website, phone: l.phone ?? null, email: l.email ?? null,
    contact_name: l.contact_name ?? null, status: "nuevo", priority: "media", source: l.source, notes: l.notes ?? null,
    estimated_value: null, client_id: null, is_demo: false, updated_at: new Date().toISOString(),
  });
  await logActivity(store, "n8n", `Lead registrado automáticamente: ${lead.business_name}`, { entity: "leads", entityId: lead.id });
  return NextResponse.json({ ok: true, lead_id: lead.id }, { status: 201 });
}
