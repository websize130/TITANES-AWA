import "server-only";
import { randomUUID } from "node:crypto";
import { AGENTS, buildSystemPrompt, getAgent } from "./agents";
import { callClaudeStructured, ClaudeNotConfiguredError, PlanSchema, TaskOutputSchema, type TaskOutput } from "./claude";
import { config } from "./config";
import { logActivity } from "./activity";
import type { Store } from "./db/store";
import type { AgentId, AgentRunRow, ApprovalType, ProposalItem, TaskRow } from "./types";

export class LimitError extends Error {}

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** Límites de ejecución: diarios globales, por agente, presupuesto y concurrencia. */
export async function checkLimits(store: Store, agentId: AgentId) {
  const today = await store.list("agent_runs", { since: { column: "created_at", iso: startOfDay() } });
  if (today.length >= config.maxRunsPerDay) throw new LimitError(`Límite diario global alcanzado (${config.maxRunsPerDay} ejecuciones).`);
  const spent = today.reduce((s, r) => s + Number(r.cost_usd || 0), 0);
  if (spent >= config.dailyBudgetUsd) throw new LimitError(`Presupuesto diario de IA agotado (${spent.toFixed(2)} / ${config.dailyBudgetUsd} USD).`);
  const agentRow = await store.get("agents", agentId);
  if (!agentRow?.enabled) throw new LimitError(`${getAgent(agentId)?.name} está desactivado.`);
  const mine = today.filter((r) => r.agent_id === agentId);
  if (mine.length >= agentRow.max_runs_per_day) throw new LimitError(`${getAgent(agentId)?.name} alcanzó su límite diario (${agentRow.max_runs_per_day}).`);
  const busy = mine.find((r) => (r.status === "thinking" || r.status === "running") && Date.now() - Date.parse(r.created_at) < 10 * 60_000);
  if (busy) throw new LimitError(`${getAgent(agentId)?.name} ya tiene una ejecución en curso.`);
  return agentRow;
}

async function startRun(store: Store, agentId: AgentId, taskId: string | null, kind: AgentRunRow["kind"], model: string) {
  return store.insert("agent_runs", {
    agent_id: agentId, task_id: taskId, kind, status: kind === "plan" ? "thinking" : "running",
    model, input_tokens: 0, output_tokens: 0, cost_usd: 0, error: null, finished_at: null,
  });
}

async function finishRun(store: Store, runId: string, patch: Partial<AgentRunRow>) {
  await store.update("agent_runs", runId, { ...patch, finished_at: new Date().toISOString() });
}

function errorUsage(e: unknown) {
  const x = e as { inputTokens?: number; outputTokens?: number; cost?: number };
  return { input_tokens: x.inputTokens ?? 0, output_tokens: x.outputTokens ?? 0, cost_usd: x.cost ?? 0 };
}

async function serviceCatalogText(store: Store) {
  const services = await store.list("services", { eq: { active: true }, order: { column: "sort", ascending: true } });
  return services.map((s) => `- ${s.id}: ${s.name} — ${s.price_min}${s.price_max ? `-${s.price_max}` : ""} € (${s.deliverables.join(", ")})`).join("\n");
}

// ───────── EMINEM: planificación ─────────

export async function planWithEminem(store: Store, instruction: string, leadId: string | null) {
  if (!config.anthropicKeyPresent) throw new ClaudeNotConfiguredError();
  const agentRow = await checkLimits(store, "eminem");
  const eminem = getAgent("eminem")!;
  const model = agentRow.model || config.claudeModel;
  const lead = leadId ? await store.get("leads", leadId) : null;
  const run = await startRun(store, "eminem", null, "plan", model);
  await logActivity(store, "eminem", "Analizando instrucción", { detail: instruction });

  const roster = AGENTS.filter((a) => a.id !== "eminem").map((a) => `- ${a.id} (${a.name}): ${a.role}. ${a.specialty}`).join("\n");
  const prompt = `Instrucción del fundador:\n"""${instruction}"""\n\n${lead ? `Lead asociado (datos del CRM):\n${JSON.stringify(lead, null, 2)}\n\n` : ""}Equipo disponible:\n${roster}\n\nCatálogo:\n${await serviceCatalogText(store)}\n\nCrea un plan de como máximo ${config.maxPlanTasks} tareas. Orden típico cuando aplique: investigación (tupac) → diseño (nas) → desarrollo (canserbero) → automatizaciones (biggie) → QA (ice-cube) → oferta (fifty-cent). Incluye solo las tareas necesarias. No incluyas una tarea final de consolidación: la añade el sistema.`;

  try {
    const res = await callClaudeStructured({ model, system: buildSystemPrompt(eminem, agentRow.instructions_override), prompt, schema: PlanSchema, effort: "medium" });
    const planId = randomUUID();
    const planned = res.data.tasks.slice(0, config.maxPlanTasks);
    const ids = planned.map(() => randomUUID());
    for (let i = 0; i < planned.length; i++) {
      const t = planned[i];
      await store.insert("tasks", {
        id: ids[i], title: t.title, description: t.description, agent_id: t.agent_id,
        status: t.requires_approval ? "pendiente_aprobacion" : "pendiente", priority: t.priority, plan_id: planId,
        depends_on: t.depends_on.filter((d) => d >= 0 && d < i).map((d) => ids[d]),
        lead_id: leadId, client_id: lead?.client_id ?? null, project_id: null, result: null, error: null,
        created_by: "eminem", updated_at: new Date().toISOString(),
      });
      if (t.requires_approval) {
        await requestApproval(store, "accion_agente", `Ejecutar: ${t.title}`, `EMINEM solicita aprobación antes de que ${getAgent(t.agent_id)?.name} ejecute esta tarea.\n\n${t.description}`, "eminem", "tasks", ids[i]);
      }
    }
    await store.insert("tasks", {
      title: "Consolidar resultados e informar al fundador", description: `Revisa los resultados del plan y presenta un informe final.\nInstrucción original: ${instruction}`,
      agent_id: "eminem", status: "pendiente", priority: "media", plan_id: planId, depends_on: ids, lead_id: leadId,
      client_id: lead?.client_id ?? null, project_id: null, result: null, error: null, created_by: "eminem", updated_at: new Date().toISOString(),
    });
    await finishRun(store, run.id, { status: "succeeded", model: res.model, input_tokens: res.inputTokens, output_tokens: res.outputTokens, cost_usd: res.costUsd });
    await logActivity(store, "eminem", `Plan creado: ${planned.length + 1} tareas`, { entity: "plan", entityId: planId, detail: res.data.summary });
    return { planId, summary: res.data.summary, count: planned.length + 1 };
  } catch (e) {
    await finishRun(store, run.id, { status: "failed", error: String((e as Error).message), ...errorUsage(e) });
    await logActivity(store, "eminem", "Error al planificar", { detail: (e as Error).message, level: "error" });
    throw e;
  }
}

// ───────── Ejecución de una tarea por su agente ─────────

export async function runTask(store: Store, taskId: string) {
  // Sin conexión real no se registra ninguna ejecución ni se altera la tarea.
  if (!config.anthropicKeyPresent) throw new ClaudeNotConfiguredError();
  const task = await store.get("tasks", taskId);
  if (!task) throw new Error("Tarea no encontrada.");
  if (task.status !== "pendiente" && task.status !== "error")
    throw new LimitError(`La tarea está en estado "${task.status}" y no se puede ejecutar (protección contra ejecuciones duplicadas).`);

  const deps = await Promise.all(task.depends_on.map((id) => store.get("tasks", id)));
  const blocked = deps.filter((d) => d && d.status !== "completada" && d.status !== "cancelada");
  if (blocked.length) throw new LimitError(`Dependencias sin completar: ${blocked.map((d) => d!.title).join(", ")}.`);

  const agentRow = await checkLimits(store, task.agent_id);
  const agent = getAgent(task.agent_id)!;
  const model = agentRow.model || config.claudeModel;

  // Marca en curso antes de llamar (bloquea dobles clics).
  await store.update("tasks", task.id, { status: "en_curso", error: null, updated_at: new Date().toISOString() });
  const run = await startRun(store, task.agent_id, task.id, "task", model);
  await logActivity(store, task.agent_id, `Empieza: ${task.title}`, { entity: "tasks", entityId: task.id });

  try {
    const context = await buildTaskContext(store, task, deps.filter(Boolean) as TaskRow[]);
    const res = await callClaudeStructured({
      model, system: buildSystemPrompt(agent, agentRow.instructions_override), schema: TaskOutputSchema,
      prompt: `TAREA: ${task.title}\n\n${task.description}\n\n${context}`, effort: task.agent_id === "canserbero" ? "high" : "medium",
    });
    const out = res.data;
    await store.update("tasks", task.id, {
      status: "completada", updated_at: new Date().toISOString(),
      result: { summary: out.summary, deliverable_markdown: out.deliverable_markdown, verified_facts: out.verified_facts, hypotheses: out.hypotheses, next_steps: out.next_steps, qa_verdict: out.qa_verdict },
    });
    await finishRun(store, run.id, { status: "succeeded", model: res.model, input_tokens: res.inputTokens, output_tokens: res.outputTokens, cost_usd: res.costUsd });
    await applySideEffects(store, task, out);
    await logActivity(store, task.agent_id, `Completada: ${task.title}`, { entity: "tasks", entityId: task.id, detail: out.summary });
    return out;
  } catch (e) {
    const msg = (e as Error).message;
    await store.update("tasks", task.id, { status: "error", error: msg, updated_at: new Date().toISOString() });
    await finishRun(store, run.id, { status: (e as Error).name === "ClaudeRefusalError" ? "refused" : "failed", error: msg, ...errorUsage(e) });
    await logActivity(store, task.agent_id, `Error en: ${task.title}`, { entity: "tasks", entityId: task.id, detail: msg, level: "error" });
    throw e;
  }
}

async function buildTaskContext(store: Store, task: TaskRow, deps: TaskRow[]) {
  const parts: string[] = [];
  if (task.lead_id) {
    const lead = await store.get("leads", task.lead_id);
    if (lead) parts.push(`LEAD (CRM, datos verificados por el fundador salvo is_demo):\n${JSON.stringify(lead, null, 2)}`);
    const audits = await store.list("audits", { eq: { lead_id: task.lead_id }, limit: 3 });
    if (audits.length) parts.push(`AUDITORÍAS PREVIAS:\n${audits.map((a) => `- ${a.created_at.slice(0, 10)} [${a.score ?? "?"}] ${a.summary}`).join("\n")}`);
  }
  if (task.client_id) {
    const client = await store.get("clients", task.client_id);
    if (client) parts.push(`CLIENTE:\n${JSON.stringify(client, null, 2)}`);
  }
  if (task.project_id) {
    const project = await store.get("projects", task.project_id);
    if (project) parts.push(`PROYECTO:\n${JSON.stringify(project, null, 2)}`);
  }
  // Para la consolidación de EMINEM y para cadenas de trabajo: resultados de las dependencias.
  if (deps.length) {
    parts.push(
      `RESULTADOS PREVIOS DEL EQUIPO:\n${deps
        .map((d) => `### ${getAgent(d.agent_id)?.name} — ${d.title}\n${d.result ? `${d.result.summary}\n\n${d.result.deliverable_markdown.slice(0, 6000)}` : `(estado: ${d.status}, sin resultado)`}`)
        .join("\n\n")}`,
    );
  }
  if (task.agent_id === "fifty-cent" || task.agent_id === "eminem") parts.push(`CATÁLOGO DE SERVICIOS:\n${await serviceCatalogText(store)}`);
  return parts.length ? parts.join("\n\n") : "No hay datos adicionales en el CRM para esta tarea.";
}

/** Efectos permitidos (no sensibles) según el agente; lo sensible se convierte en aprobaciones. */
async function applySideEffects(store: Store, task: TaskRow, out: TaskOutput) {
  const agent = getAgent(task.agent_id)!;

  if (agent.tools.includes("audits.write") && task.lead_id && (out.audit_findings.length || out.audit_score !== null)) {
    const lead = await store.get("leads", task.lead_id);
    await store.insert("audits", { lead_id: task.lead_id, url: lead?.website ?? null, score: out.audit_score, summary: out.summary, findings: out.audit_findings, author: task.agent_id });
    if (lead && (lead.status === "nuevo" || lead.status === "investigando"))
      await store.update("leads", lead.id, { status: "auditado", updated_at: new Date().toISOString() });
  }

  if (agent.tools.includes("proposals.draft") && out.proposal_items.length && (task.lead_id || task.client_id)) {
    const services = await store.list("services");
    const items: ProposalItem[] = out.proposal_items
      .map((p) => {
        const s = services.find((x) => x.id === p.service_id);
        return s ? { service_id: s.id, name: s.name, price: Math.max(0, Math.round(p.price)), cost: s.cost } : null;
      })
      .filter((x): x is ProposalItem => x !== null);
    if (items.length) {
      const lead = task.lead_id ? await store.get("leads", task.lead_id) : null;
      const proposal = await store.insert("proposals", {
        lead_id: task.lead_id, client_id: task.client_id, title: `Propuesta — ${lead?.business_name ?? "cliente"}`, items,
        total: items.reduce((s, i) => s + i.price, 0), cost_total: items.reduce((s, i) => s + i.cost, 0),
        status: "borrador", notes: out.summary, created_by: task.agent_id, is_demo: false,
      });
      await logActivity(store, task.agent_id, "Presupuesto en borrador", { entity: "proposals", entityId: proposal.id });
    }
  }

  if (agent.tools.includes("qa.verdict") && task.project_id && out.qa_verdict !== "no_aplica") {
    await store.update("projects", task.project_id, { qa_passed: out.qa_verdict === "aprobado" });
  }

  for (const a of out.sensitive_actions.slice(0, 5)) {
    await requestApproval(store, a.type, a.title, a.description, task.agent_id, "tasks", task.id);
  }
}

export async function requestApproval(store: Store, type: ApprovalType, title: string, description: string, requestedBy: AgentId | "sistema" | "usuario", relatedTable: string | null, relatedId: string | null, payload: Record<string, unknown> = {}) {
  // Deduplicación: no repetir una solicitud idéntica pendiente.
  const pending = await store.list("approvals", { eq: { status: "pendiente" } });
  const dup = pending.find((p) => p.type === type && p.title === title && p.related_id === relatedId);
  if (dup) return dup;
  const row = await store.insert("approvals", { type, title, description, payload, requested_by: requestedBy, status: "pendiente", related_table: relatedTable, related_id: relatedId, decided_at: null, decided_note: null });
  await logActivity(store, requestedBy, `Solicita aprobación: ${title}`, { entity: "approvals", entityId: row.id });
  return row;
}

/** Siguiente tarea ejecutable (pendiente y con dependencias completas) de un plan. */
export async function nextReadyTask(store: Store, planId: string) {
  const tasks = await store.list("tasks", { eq: { plan_id: planId }, order: { column: "created_at", ascending: true } });
  const done = new Set(tasks.filter((t) => t.status === "completada" || t.status === "cancelada").map((t) => t.id));
  return tasks.find((t) => t.status === "pendiente" && t.depends_on.every((d) => done.has(d))) ?? null;
}
