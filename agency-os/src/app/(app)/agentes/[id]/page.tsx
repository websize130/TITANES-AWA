import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/db";
import { loadAgentsData } from "@/lib/queries";
import { buildSystemPrompt, getAgent, TOOL_LABELS } from "@/lib/agents";
import { STATE_META } from "@/lib/agent-state";
import { SUPPORTED_MODELS } from "@/lib/claude";
import { config } from "@/lib/config";
import { TASK_STATUS_LABEL, dateEs, usd } from "@/lib/format";
import { Badge, Card, Empty } from "@/components/ui";
import { PixelSprite } from "@/components/PixelSprite";
import { AssignTaskForm } from "@/components/AssignTaskForm";
import { ActionForm, SubmitButton } from "@/components/forms";
import { updateAgentSettings } from "@/app/actions";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getAgent(id);
  if (!profile) notFound();
  const { store } = await requireSession();
  const [all, tasks, leads, projects] = await Promise.all([loadAgentsData(store), store.list("tasks", { eq: { agent_id: profile.id }, limit: 30 }), store.list("leads"), store.list("projects")]);
  const a = all.find((x) => x.id === profile.id)!;
  const m = STATE_META[a.state];

  return (
    <div className="space-y-5">
      <Link href="/agentes" className="text-xs text-muted hover:text-ink">← Agentes</Link>
      <div className="panel flex flex-wrap items-center gap-6 p-5" style={{ borderColor: `${profile.color}55` }}>
        <div className="grid h-44 w-36 place-items-center rounded-2xl border border-line" style={{ background: `linear-gradient(160deg, ${profile.color}55, #0d0d14)` }}>
          <PixelSprite agentId={profile.id} size={150} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black">{profile.name}</h1>
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `${m.color}22`, color: m.color }}>{m.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${a.operational ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{a.operational ? "Operativo" : "Configurado (no operativo)"}</span>
            {a.verified && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">Con ejecuciones reales</span>}
          </div>
          <div className="mt-1" style={{ color: profile.color }}>{profile.role} · {profile.department}</div>
          <p className="mt-2 max-w-2xl text-sm text-ink/80">{profile.description}</p>
          <p className="mt-1 text-xs italic text-muted">Personalidad operativa: {profile.personality}</p>
          <p className="mt-1 text-xs text-muted">Especialidad: {profile.specialty}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-black/25 p-3"><div className="text-lg font-bold">{usd(a.totalCostUsd)}</div><div className="text-muted">coste acumulado</div></div>
          <div className="rounded-lg bg-black/25 p-3"><div className="text-lg font-bold">{a.runsToday}/{a.maxRunsPerDay}</div><div className="text-muted">ejecuciones hoy</div></div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Tareas">
            {tasks.length ? (
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/tareas/${t.id}`} className="truncate hover:text-brand">{t.title}</Link>
                    <Badge value={t.status} label={TASK_STATUS_LABEL[t.status]} />
                  </li>
                ))}
              </ul>
            ) : <Empty>Sin tareas.</Empty>}
          </Card>
          <Card title="Últimas ejecuciones (reales)">
            {a.recentRuns.length ? (
              <table className="w-full text-xs">
                <thead className="text-left text-muted"><tr><th className="py-1">Fecha</th><th>Tipo</th><th>Estado</th><th>Modelo</th><th>Tokens</th><th className="text-right">Coste</th></tr></thead>
                <tbody>
                  {a.recentRuns.map((r) => (
                    <tr key={r.id} className="border-t border-line" title={r.error ?? ""}>
                      <td className="py-1.5">{dateEs(r.created_at)}</td><td>{r.kind}</td>
                      <td className={r.status === "succeeded" ? "text-green-400" : r.status === "failed" || r.status === "refused" ? "text-red-400" : "text-orange-400"}>{r.status}</td>
                      <td>{r.model}</td><td>{r.input_tokens} / {r.output_tokens}</td><td className="text-right">{usd(r.cost_usd, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Empty>Sin ejecuciones. No se simula actividad.</Empty>}
          </Card>
          <Card title="Historial de actividad">
            {a.history.length ? <ul className="space-y-1 text-xs">{a.history.map((h) => <li key={h.id} className="flex justify-between"><span className={h.level === "error" ? "text-red-400" : ""}>{h.action}</span><span className="text-muted">{dateEs(h.created_at)}</span></li>)}</ul> : <Empty>Sin actividad.</Empty>}
          </Card>
          <Card title="Instrucciones del agente (system prompt efectivo)">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-ink/80">{buildSystemPrompt(profile, a.instructionsOverride)}</pre>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Asignar tarea">
            <AssignTaskForm agentId={profile.id} leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
          </Card>
          <Card title="Responsabilidades">
            <ul className="list-disc space-y-1 pl-4 text-sm text-ink/80">{profile.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
          </Card>
          <Card title="Herramientas y permisos">
            <ul className="space-y-1 text-sm">{profile.tools.map((t) => <li key={t}>✓ {TOOL_LABELS[t]}</li>)}</ul>
            <p className="mt-2 text-[11px] text-muted">Acciones sensibles (enviar, publicar, pagar, producción) siempre pasan por el Centro de aprobaciones.</p>
          </Card>
          <Card title="Configuración">
            <ActionForm action={updateAgentSettings} hidden={{ id: profile.id }} className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={a.enabled} /> Agente activado</label>
              <div>
                <label className="label">Modelo</label>
                <select name="model" defaultValue={a.model === config.claudeModel ? "" : a.model} className="input">
                  <option value="">Por defecto ({config.claudeModel})</option>
                  {SUPPORTED_MODELS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Máx. ejecuciones al día</label>
                <input type="number" name="max_runs_per_day" min={0} max={200} defaultValue={a.maxRunsPerDay} className="input" />
              </div>
              <div>
                <label className="label">Instrucciones propias adicionales</label>
                <textarea name="instructions_override" rows={4} maxLength={4000} defaultValue={a.instructionsOverride ?? ""} className="input" placeholder="Tono, servicios a priorizar, restricciones…" />
              </div>
              <SubmitButton>Guardar</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
