"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as z from "zod/v4";
import { authSecret, config, localPassword, supabaseConfigured } from "@/lib/config";
import { requireSession } from "@/lib/db";
import { resetLocalStore } from "@/lib/db/local";
import { supabaseAnon } from "@/lib/db/supabase";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE, SESSION_COOKIE, SESSION_TTL_S, signSession } from "@/lib/session-token";
import { logActivity } from "@/lib/activity";
import { AGENT_IDS, getAgent } from "@/lib/agents";
import { LimitError, nextReadyTask, planWithEminem, requestApproval, runTask } from "@/lib/orchestrator";
import { ClaudeNotConfiguredError, SUPPORTED_MODELS } from "@/lib/claude";
import { triggerWorkflow } from "@/lib/n8n";
import type { AgentId, ProposalItem } from "@/lib/types";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const ok = (message: string): ActionState => ({ ok: true, message });
const fail = (error: string): ActionState => ({ ok: false, error });

function done(message: string) {
  revalidatePath("/", "layout");
  return ok(message);
}

function parse<S extends z.ZodType>(schema: S, fd: FormData): z.infer<S> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$")) continue;
    obj[k] = typeof v === "string" ? v.trim() : v;
  }
  const r = schema.safeParse(obj);
  if (!r.success) throw new ValidationError(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return r.data;
}

class ValidationError extends Error {}

function handle(e: unknown): ActionState {
  if (e instanceof ValidationError || e instanceof LimitError || e instanceof ClaudeNotConfiguredError) return fail(e.message);
  // redirect() lanza un error especial que debe propagarse.
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_")) throw e;
  console.error("[action]", e);
  return fail((e as Error)?.message ?? "Error inesperado");
}

const optStr = z.string().max(2000).optional().transform((v) => (v ? v : null));
const optUrl = z
  .string()
  .max(500)
  .optional()
  .transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null))
  .refine((v) => v === null || URL.canParse(v), "URL no válida");
const optEmail = z.union([z.literal(""), z.email()]).optional().transform((v) => (v ? v : null));
const money = z.coerce.number().min(0).max(1_000_000);

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

// ───────── Autenticación ─────────

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const jar = await cookies();
  try {
    if (config.dataBackend === "supabase") {
      if (!supabaseConfigured()) return fail("Supabase no está configurado.");
      const { email, password } = parse(z.object({ email: z.email(), password: z.string().min(6) }), fd);
      const { data, error } = await supabaseAnon().auth.signInWithPassword({ email, password });
      if (error || !data.session) return fail("Credenciales incorrectas.");
      jar.set(SB_ACCESS_COOKIE, data.session.access_token, { ...cookieOpts, maxAge: data.session.expires_in });
      jar.set(SB_REFRESH_COOKIE, data.session.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
    } else {
      const { password } = parse(z.object({ password: z.string().min(1) }), fd);
      await new Promise((r) => setTimeout(r, 300)); // frena fuerza bruta
      const expected = localPassword();
      if (password.length !== expected.length || password !== expected) return fail("Contraseña incorrecta.");
      jar.set(SESSION_COOKIE, await signSession(authSecret(), "founder"), { ...cookieOpts, maxAge: SESSION_TTL_S });
    }
  } catch (e) {
    return handle(e);
  }
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(SB_ACCESS_COOKIE);
  jar.delete(SB_REFRESH_COOKIE);
  redirect("/login");
}

// ───────── Leads / CRM ─────────

const LeadSchema = z.object({
  business_name: z.string().min(1, "Obligatorio").max(200),
  sector: z.string().max(100).default(""),
  city: z.string().max(100).default(""),
  website: optUrl,
  phone: optStr,
  email: optEmail,
  contact_name: optStr,
  priority: z.enum(["alta", "media", "baja"]).default("media"),
  source: optStr,
  notes: optStr,
  estimated_value: z.union([z.literal(""), money]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
});

export async function createLead(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(LeadSchema, fd);
    if (data.website) {
      const existing = await store.list("leads");
      if (existing.some((l) => l.website?.toLowerCase() === data.website!.toLowerCase())) return fail("Ya existe un lead con esa web.");
    }
    const now = new Date().toISOString();
    const lead = await store.insert("leads", { ...data, status: "nuevo", client_id: null, is_demo: false, updated_at: now });
    await logActivity(store, "usuario", `Lead creado: ${lead.business_name}`, { entity: "leads", entityId: lead.id });
    return done("Lead creado.");
  } catch (e) {
    return handle(e);
  }
}

export async function updateLead(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const id = String(fd.get("$id") ?? "");
    const data = parse(LeadSchema.extend({ status: z.enum(["nuevo", "investigando", "auditado", "contactado", "propuesta", "negociacion", "ganado", "perdido"]) }), fd);
    await store.update("leads", id, { ...data, updated_at: new Date().toISOString() });
    await logActivity(store, "usuario", `Lead actualizado: ${data.business_name}`, { entity: "leads", entityId: id });
    return done("Cambios guardados.");
  } catch (e) {
    return handle(e);
  }
}

export async function setLeadStatus(id: string, status: string) {
  const { store } = await requireSession();
  const s = z.enum(["nuevo", "investigando", "auditado", "contactado", "propuesta", "negociacion", "ganado", "perdido"]).parse(status);
  const lead = await store.update("leads", id, { status: s, updated_at: new Date().toISOString() });
  await logActivity(store, "usuario", `Estado de ${lead.business_name} → ${s}`, { entity: "leads", entityId: id });
  revalidatePath("/", "layout");
}

export async function deleteLead(id: string) {
  const { store } = await requireSession();
  const lead = await store.get("leads", id);
  if (!lead) return;
  await store.remove("leads", id);
  await logActivity(store, "usuario", `Lead eliminado: ${lead.business_name}`, { entity: "leads", entityId: id, level: "warn" });
  revalidatePath("/", "layout");
  redirect("/leads");
}

export async function addAudit(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(
      z.object({
        lead_id: z.string().min(1),
        score: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
        summary: z.string().min(3).max(4000),
        verified: z.string().max(4000).optional().default(""),
        hypotheses: z.string().max(4000).optional().default(""),
      }),
      fd,
    );
    const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
    const lead = await store.get("leads", data.lead_id);
    if (!lead) return fail("Lead no encontrado.");
    await store.insert("audits", {
      lead_id: data.lead_id, url: lead.website, score: data.score, summary: data.summary, author: "usuario",
      findings: [
        ...lines(data.verified).map((f) => ({ area: "General", severity: "media" as const, finding: f, verified: true })),
        ...lines(data.hypotheses).map((f) => ({ area: "General", severity: "media" as const, finding: f, verified: false })),
      ],
    });
    if (lead.status === "nuevo" || lead.status === "investigando") await store.update("leads", lead.id, { status: "auditado", updated_at: new Date().toISOString() });
    await logActivity(store, "usuario", `Auditoría registrada: ${lead.business_name}`, { entity: "leads", entityId: lead.id });
    return done("Auditoría registrada.");
  } catch (e) {
    return handle(e);
  }
}

export async function convertLeadToClient(leadId: string) {
  const { store } = await requireSession();
  const lead = await store.get("leads", leadId);
  if (!lead) throw new Error("Lead no encontrado");
  if (lead.client_id) redirect(`/clientes/${lead.client_id}`);
  const client = await store.insert("clients", {
    name: lead.business_name, sector: lead.sector, city: lead.city, website: lead.website, email: lead.email, phone: lead.phone,
    contact_name: lead.contact_name, lead_id: lead.id, status: "onboarding", notes: lead.notes, is_demo: lead.is_demo,
  });
  await store.update("leads", lead.id, { status: "ganado", client_id: client.id, updated_at: new Date().toISOString() });
  await logActivity(store, "usuario", `Lead convertido en cliente: ${lead.business_name}`, { entity: "clients", entityId: client.id });
  revalidatePath("/", "layout");
  redirect(`/clientes/${client.id}`);
}

// ───────── Clientes y proyectos ─────────

export async function createClientAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(z.object({ name: z.string().min(1).max(200), sector: z.string().max(100).default(""), city: z.string().max(100).default(""), website: optUrl, email: optEmail, phone: optStr, contact_name: optStr, notes: optStr }), fd);
    const c = await store.insert("clients", { ...data, lead_id: null, status: "onboarding", is_demo: false });
    await logActivity(store, "usuario", `Cliente creado: ${c.name}`, { entity: "clients", entityId: c.id });
    return done("Cliente creado.");
  } catch (e) {
    return handle(e);
  }
}

export async function setClientStatus(id: string, status: string) {
  const { store } = await requireSession();
  const s = z.enum(["onboarding", "activo", "mantenimiento", "inactivo"]).parse(status);
  await store.update("clients", id, { status: s });
  await logActivity(store, "usuario", `Cliente → ${s}`, { entity: "clients", entityId: id });
  revalidatePath("/", "layout");
}

const ProjectStatus = z.enum(["planificacion", "diseno", "desarrollo", "qa", "entregado", "mantenimiento"]);

export async function createProject(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(z.object({ name: z.string().min(1).max(200), client_id: z.string().optional().transform((v) => v || null), service: z.string().max(100).default(""), budget: money.default(0), due_date: z.string().optional().transform((v) => v || null) }), fd);
    const p = await store.insert("projects", { ...data, status: "planificacion", progress: 0, paid: 0, qa_passed: false, is_demo: false });
    await logActivity(store, "usuario", `Proyecto creado: ${p.name}`, { entity: "projects", entityId: p.id });
    return done("Proyecto creado.");
  } catch (e) {
    return handle(e);
  }
}

export async function updateProject(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const id = String(fd.get("$id") ?? "");
    const data = parse(z.object({ status: ProjectStatus, progress: z.coerce.number().int().min(0).max(100), paid: money }), fd);
    const project = await store.get("projects", id);
    if (!project) return fail("Proyecto no encontrado.");
    if (data.status === "entregado" && !project.qa_passed) return fail("ICE CUBE: no se puede entregar sin QA superado.");
    await store.update("projects", id, data);
    await logActivity(store, "usuario", `Proyecto actualizado: ${project.name}`, { entity: "projects", entityId: id });
    return done("Proyecto actualizado.");
  } catch (e) {
    return handle(e);
  }
}

// ───────── Tareas y agentes ─────────

export async function createTask(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(4000).default(""),
        agent_id: z.enum(AGENT_IDS as [AgentId, ...AgentId[]]),
        priority: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
        lead_id: z.string().optional().transform((v) => v || null),
        project_id: z.string().optional().transform((v) => v || null),
      }),
      fd,
    );
    const project = data.project_id ? await store.get("projects", data.project_id) : null;
    const t = await store.insert("tasks", {
      ...data, status: "pendiente", plan_id: null, depends_on: [], client_id: project?.client_id ?? null, result: null, error: null, created_by: "usuario", updated_at: new Date().toISOString(),
    });
    await logActivity(store, "usuario", `Tarea asignada a ${getAgent(data.agent_id)?.name}: ${t.title}`, { entity: "tasks", entityId: t.id });
    return done(`Tarea asignada a ${getAgent(data.agent_id)?.name}.`);
  } catch (e) {
    return handle(e);
  }
}

export async function runTaskAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const out = await runTask(store, String(fd.get("$id")));
    return done(`Completada: ${out.summary}`);
  } catch (e) {
    revalidatePath("/", "layout");
    return handle(e);
  }
}

export async function runNextInPlan(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const next = await nextReadyTask(store, String(fd.get("$plan")));
    if (!next) return fail("No hay tareas listas: revisa aprobaciones pendientes, errores o dependencias.");
    const out = await runTask(store, next.id);
    return done(`${getAgent(next.agent_id)?.name} completó "${next.title}": ${out.summary}`);
  } catch (e) {
    revalidatePath("/", "layout");
    return handle(e);
  }
}

export async function cancelTask(id: string) {
  const { store } = await requireSession();
  const t = await store.get("tasks", id);
  if (!t || t.status === "completada" || t.status === "en_curso") return;
  await store.update("tasks", id, { status: "cancelada", updated_at: new Date().toISOString() });
  await logActivity(store, "usuario", `Tarea cancelada: ${t.title}`, { entity: "tasks", entityId: id, level: "warn" });
  revalidatePath("/", "layout");
}

export async function instructEminem(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(z.object({ instruction: z.string().min(10, "Describe la instrucción (mín. 10 caracteres)").max(4000), lead_id: z.string().optional().transform((v) => v || null) }), fd);
    await logActivity(store, "usuario", "Instrucción a EMINEM", { detail: data.instruction });
    const plan = await planWithEminem(store, data.instruction, data.lead_id);
    return done(`EMINEM creó un plan de ${plan.count} tareas: ${plan.summary}`);
  } catch (e) {
    revalidatePath("/", "layout");
    return handle(e);
  }
}

export async function updateAgentSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(
      z.object({
        id: z.enum(AGENT_IDS as [AgentId, ...AgentId[]]),
        enabled: z.string().optional().transform((v) => v === "on"),
        model: z.string().optional().transform((v) => v || null).refine((v) => v === null || SUPPORTED_MODELS.includes(v), "Modelo no soportado"),
        max_runs_per_day: z.coerce.number().int().min(0).max(200),
        instructions_override: z.string().max(4000).optional().transform((v) => v || null),
      }),
      fd,
    );
    const { id, ...patch } = data;
    await store.update("agents", id, patch);
    await logActivity(store, "usuario", `Configuración de ${getAgent(id)?.name} actualizada`, { entity: "agents", entityId: id });
    return done("Configuración guardada.");
  } catch (e) {
    return handle(e);
  }
}

// ───────── Aprobaciones ─────────

export async function decideApproval(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const id = String(fd.get("$id"));
    const decision = z.enum(["aprobada", "rechazada"]).parse(fd.get("$decision"));
    const note = String(fd.get("note") ?? "").slice(0, 1000) || null;
    const a = await store.get("approvals", id);
    if (!a) return fail("Aprobación no encontrada.");
    if (a.status !== "pendiente") return fail("Esta solicitud ya fue decidida.");
    await store.update("approvals", id, { status: decision, decided_at: new Date().toISOString(), decided_note: note });

    if (a.related_table === "tasks" && a.related_id && a.type === "accion_agente") {
      const t = await store.get("tasks", a.related_id);
      if (t?.status === "pendiente_aprobacion") await store.update("tasks", t.id, { status: decision === "aprobada" ? "pendiente" : "cancelada", updated_at: new Date().toISOString() });
    }
    if (a.related_table === "proposals" && a.related_id) {
      const p = await store.get("proposals", a.related_id);
      if (p?.status === "pendiente_aprobacion") await store.update("proposals", p.id, { status: decision === "aprobada" ? "aprobada" : "borrador" });
    }
    await logActivity(store, "usuario", `${decision === "aprobada" ? "Aprobado" : "Rechazado"}: ${a.title}`, { entity: "approvals", entityId: id });
    return done(decision === "aprobada" ? "Aprobado." : "Rechazado.");
  } catch (e) {
    return handle(e);
  }
}

/** Ejecuta una aprobación ya concedida que lleva asociado un workflow n8n. */
export async function executeApproval(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const a = await store.get("approvals", String(fd.get("$id")));
    if (!a || a.status !== "aprobada") return fail("Solo se pueden ejecutar solicitudes aprobadas.");
    const wfId = typeof a.payload.workflow_id === "string" ? a.payload.workflow_id : null;
    if (!wfId) return fail("Esta aprobación no tiene un workflow asociado: ejecútala manualmente y márcala como ejecutada.");
    const wf = await store.get("workflows", wfId);
    if (!wf || !wf.enabled) return fail("Workflow no disponible o desactivado.");
    const res = await triggerWorkflow(wf, { ...(a.payload.input as object), approval_id: a.id });
    await store.update("workflows", wf.id, { last_run_at: new Date().toISOString(), last_status: res.ok ? "pendiente" : "error", run_count: wf.run_count + 1 });
    if (!res.ok) {
      await logActivity(store, "sistema", `Fallo al disparar ${wf.name}`, { entity: "workflows", entityId: wf.id, detail: res.error, level: "error" });
      return fail(`n8n respondió con error (${res.status}): ${res.error?.slice(0, 200)}`);
    }
    await store.update("approvals", a.id, { status: "ejecutada" });
    if (a.related_table === "proposals" && a.related_id) await store.update("proposals", a.related_id, { status: "enviada" });
    await logActivity(store, "sistema", `Workflow disparado tras aprobación: ${wf.name}`, { entity: "workflows", entityId: wf.id });
    return done("Workflow disparado en n8n.");
  } catch (e) {
    return handle(e);
  }
}

export async function markApprovalExecuted(id: string) {
  const { store } = await requireSession();
  const a = await store.get("approvals", id);
  if (!a || a.status !== "aprobada") return;
  await store.update("approvals", id, { status: "ejecutada" });
  if (a.type === "enviar_propuesta" && a.related_table === "proposals" && a.related_id) await store.update("proposals", a.related_id, { status: "enviada" });
  await logActivity(store, "usuario", `Marcado como ejecutado: ${a.title}`, { entity: "approvals", entityId: id });
  revalidatePath("/", "layout");
}

// ───────── Workflows n8n ─────────

export async function requestWorkflowRun(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const wf = await store.get("workflows", String(fd.get("$id")));
    if (!wf) return fail("Workflow no encontrado.");
    if (!wf.enabled) return fail("Workflow desactivado.");
    const input = String(fd.get("input") ?? "").slice(0, 4000);
    let payload: Record<string, unknown> = {};
    if (input) {
      try { payload = JSON.parse(input); } catch { return fail("La entrada debe ser JSON válido."); }
    }
    if (wf.sensitive) {
      await requestApproval(store, "ejecutar_workflow", `Ejecutar workflow: ${wf.name}`, wf.description, "usuario", "workflows", wf.id, { workflow_id: wf.id, input: payload });
      return done("Workflow sensible: solicitud enviada al Centro de aprobaciones.");
    }
    const res = await triggerWorkflow(wf, payload);
    await store.update("workflows", wf.id, { last_run_at: new Date().toISOString(), last_status: res.ok ? "pendiente" : "error", run_count: wf.run_count + 1 });
    await logActivity(store, "usuario", `Workflow ${res.ok ? "disparado" : "falló"}: ${wf.name}`, { entity: "workflows", entityId: wf.id, level: res.ok ? "info" : "error", detail: res.ok ? res.idempotencyKey : res.error });
    if (!res.ok) return fail(`n8n respondió con error (${res.status}): ${res.error?.slice(0, 200)}`);
    return done("Workflow disparado. El resultado llegará por callback.");
  } catch (e) {
    return handle(e);
  }
}

export async function toggleWorkflow(id: string) {
  const { store } = await requireSession();
  const wf = await store.get("workflows", id);
  if (!wf) return;
  await store.update("workflows", id, { enabled: !wf.enabled });
  await logActivity(store, "usuario", `Workflow ${wf.enabled ? "desactivado" : "activado"}: ${wf.name}`, { entity: "workflows", entityId: id });
  revalidatePath("/", "layout");
}

// ───────── Catálogo y presupuestos ─────────

export async function saveService(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const data = parse(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{2,40}$/, "id: minúsculas, números y guiones"),
        name: z.string().min(1).max(100),
        description: z.string().max(500).default(""),
        price_min: money,
        price_max: z.union([z.literal(""), money]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
        cost: money,
        deliverables: z.string().max(2000).default("").transform((s) => s.split("\n").map((x) => x.trim()).filter(Boolean)),
        active: z.string().optional().transform((v) => v === "on"),
      }),
      fd,
    );
    if (data.price_max !== null && data.price_max < data.price_min) return fail("El precio máximo debe ser ≥ mínimo.");
    const existing = await store.get("services", data.id);
    if (existing) await store.update("services", data.id, data);
    else {
      const all = await store.list("services");
      await store.insert("services", { ...data, sort: all.length + 1 });
    }
    await logActivity(store, "usuario", `Servicio guardado: ${data.name}`, { entity: "services", entityId: data.id });
    return done("Servicio guardado.");
  } catch (e) {
    return handle(e);
  }
}

export async function createProposal(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { store } = await requireSession();
    const leadId = String(fd.get("lead_id") ?? "") || null;
    const clientId = String(fd.get("client_id") ?? "") || null;
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return fail("Título obligatorio.");
    if (!leadId && !clientId) return fail("Selecciona un lead o un cliente.");
    const services = await store.list("services");
    const items: ProposalItem[] = [];
    for (const s of services) {
      if (fd.get(`svc_${s.id}`) !== "on") continue;
      const price = Number(fd.get(`price_${s.id}`) || s.price_min);
      if (!Number.isFinite(price) || price < 0) return fail(`Precio no válido en ${s.name}.`);
      items.push({ service_id: s.id, name: s.name, price, cost: s.cost });
    }
    if (!items.length) return fail("Selecciona al menos un servicio.");
    const p = await store.insert("proposals", {
      lead_id: leadId, client_id: clientId, title, items, total: items.reduce((a, i) => a + i.price, 0), cost_total: items.reduce((a, i) => a + i.cost, 0),
      status: "borrador", notes: String(fd.get("notes") ?? "") || null, created_by: "usuario", is_demo: false,
    });
    if (leadId) {
      const lead = await store.get("leads", leadId);
      if (lead && ["nuevo", "investigando", "auditado", "contactado"].includes(lead.status)) await store.update("leads", leadId, { status: "propuesta", updated_at: new Date().toISOString() });
    }
    await logActivity(store, "usuario", `Presupuesto creado: ${title}`, { entity: "proposals", entityId: p.id });
    return done("Presupuesto creado en borrador.");
  } catch (e) {
    return handle(e);
  }
}

export async function proposalTransition(id: string, to: "solicitar_envio" | "aceptada" | "rechazada") {
  const { store } = await requireSession();
  const p = await store.get("proposals", id);
  if (!p) return;
  if (to === "solicitar_envio") {
    if (p.status !== "borrador") return;
    await store.update("proposals", id, { status: "pendiente_aprobacion" });
    const wf = await store.get("workflows", "propuestas");
    await requestApproval(store, "enviar_propuesta", `Enviar propuesta: ${p.title}`, `Total ${p.total} €. Al aprobar, podrás enviarla vía n8n (workflow "propuestas") o marcarla como enviada.`, "usuario", "proposals", id, wf ? { workflow_id: wf.id, input: { proposal_id: id, title: p.title, total: p.total, items: p.items } } : {});
  } else {
    if (p.status !== "enviada" && p.status !== "aprobada") return;
    await store.update("proposals", id, { status: to });
    if (to === "aceptada" && p.lead_id) await store.update("leads", p.lead_id, { status: "negociacion", updated_at: new Date().toISOString() });
    await logActivity(store, "usuario", `Propuesta ${to}: ${p.title}`, { entity: "proposals", entityId: id });
  }
  revalidatePath("/", "layout");
}

// ───────── Sistema ─────────

export async function resetDemo() {
  const { store } = await requireSession();
  if (store.kind !== "local" || config.appEnv === "production") return;
  await resetLocalStore();
  revalidatePath("/", "layout");
}

/** Encargos rápidos desde la ficha de un lead (crean tareas; no ejecutan nada). */
export async function quickLeadTask(leadId: string, kind: "auditoria" | "presupuesto" | "diseno") {
  const { store } = await requireSession();
  const lead = await store.get("leads", leadId);
  if (!lead) return;
  const presets = {
    auditoria: { agent_id: "tupac" as const, title: `Auditoría digital: ${lead.business_name}`, description: `Audita la presencia digital de ${lead.business_name} (${lead.sector}, ${lead.city}). Web: ${lead.website ?? "sin web conocida"}. Devuelve audit_score, audit_findings (marca verified solo si el dato está en el contexto) y servicios recomendados del catálogo.` },
    presupuesto: { agent_id: "fifty-cent" as const, title: `Presupuesto para ${lead.business_name}`, description: `Prepara una oferta rentable para ${lead.business_name} usando el catálogo (proposal_items con service_id y precio), un mensaje de primer contacto listo para revisión y las objeciones previsibles. El envío es una acción sensible.` },
    diseno: { agent_id: "nas" as const, title: `Propuesta visual para ${lead.business_name}`, description: `Propón estructura de la web, paleta, tipografía y copy orientado a conversión para ${lead.business_name} (${lead.sector}, ${lead.city}).` },
  }[kind];
  const t = await store.insert("tasks", { ...presets, status: "pendiente", priority: lead.priority === "alta" ? "alta" : "media", plan_id: null, depends_on: [], lead_id: lead.id, client_id: lead.client_id, project_id: null, result: null, error: null, created_by: "usuario", updated_at: new Date().toISOString() });
  if (kind === "auditoria" && lead.status === "nuevo") await store.update("leads", lead.id, { status: "investigando", updated_at: new Date().toISOString() });
  await logActivity(store, "usuario", `Tarea asignada a ${getAgent(presets.agent_id)?.name}: ${t.title}`, { entity: "tasks", entityId: t.id });
  revalidatePath("/", "layout");
}
