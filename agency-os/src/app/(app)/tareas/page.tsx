import Link from "next/link";
import { requireSession } from "@/lib/db";
import { AGENTS, getAgent } from "@/lib/agents";
import { config } from "@/lib/config";
import { TASK_STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import { AgentAvatar } from "@/components/PixelSprite";
import { AssignTaskForm } from "@/components/AssignTaskForm";
import { EminemConsole } from "@/components/EminemConsole";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { cancelTask, runNextInPlan, runTaskAction } from "@/app/actions";
import type { TaskRow } from "@/lib/types";

export const metadata = { title: "Tareas" };

function TaskLine({ t }: { t: TaskRow }) {
  const agent = getAgent(t.agent_id)!;
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <AgentAvatar agentId={t.agent_id} size={30} />
      <div className="min-w-0 flex-1">
        <Link href={`/tareas/${t.id}`} className="block truncate text-sm font-medium hover:text-brand">{t.title}</Link>
        <div className="text-[11px] text-muted">{agent.name} · prioridad {t.priority} · {timeAgo(t.updated_at)}{t.error ? ` · ${t.error.slice(0, 80)}` : ""}</div>
      </div>
      <Badge value={t.status} label={TASK_STATUS_LABEL[t.status]} />
      {(t.status === "pendiente" || t.status === "error") && (
        <ActionForm action={runTaskAction} hidden={{ $id: t.id }}><SubmitButton variant="ghost" pendingText={`${agent.name}…`}>▶ {t.status === "error" ? "Reintentar" : "Ejecutar"}</SubmitButton></ActionForm>
      )}
      {(t.status === "pendiente" || t.status === "pendiente_aprobacion" || t.status === "error") && <ActionButton onAction={cancelTask.bind(null, t.id)} confirm="¿Cancelar la tarea?">✕</ActionButton>}
    </li>
  );
}

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ agent?: string; status?: string }> }) {
  const { agent, status } = await searchParams;
  const { store } = await requireSession();
  const [tasks, leads, projects] = await Promise.all([store.list("tasks", { limit: 500 }), store.list("leads"), store.list("projects")]);
  const filtered = tasks.filter((t) => (!agent || t.agent_id === agent) && (!status || t.status === status));
  const planIds = [...new Set(filtered.filter((t) => t.plan_id).map((t) => t.plan_id!))];
  const loose = filtered.filter((t) => !t.plan_id);

  return (
    <div>
      <PageHeader title="Tareas" subtitle="Flujo: tú → EMINEM → agentes. Cada ejecución es explícita, limitada y registrada." />
      {!config.anthropicKeyPresent && <div className="mb-4"><Notice tone="warn">Sin ANTHROPIC_API_KEY las tareas pueden crearse y asignarse, pero no ejecutarse. No se simulan resultados.</Notice></div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <form className="flex flex-wrap gap-2">
            <select name="agent" defaultValue={agent ?? ""} className="input !w-auto"><option value="">Todos los agentes</option>{AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            <select name="status" defaultValue={status ?? ""} className="input !w-auto"><option value="">Todos los estados</option>{Object.entries(TASK_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="btn btn-ghost">Filtrar</button>
          </form>
          {planIds.map((pid) => {
            const items = filtered.filter((t) => t.plan_id === pid).sort((a, b) => a.created_at.localeCompare(b.created_at));
            const doneCount = items.filter((t) => t.status === "completada").length;
            return (
              <Card key={pid} title={<span>Plan de EMINEM · {doneCount}/{items.length} completadas</span>} action={
                <ActionForm action={runNextInPlan} hidden={{ $plan: pid }}><SubmitButton pendingText="Ejecutando…">▶ Ejecutar siguiente paso</SubmitButton></ActionForm>
              }>
                <ol className="divide-y divide-line">{items.map((t) => <TaskLine key={t.id} t={t} />)}</ol>
              </Card>
            );
          })}
          <Card title={`Tareas sueltas (${loose.length})`}>
            {loose.length ? <ul className="divide-y divide-line">{loose.map((t) => <TaskLine key={t.id} t={t} />)}</ul> : <Empty>Sin tareas sueltas.</Empty>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Instrucción a EMINEM"><EminemConsole leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} /></Card>
          <Card title="Asignar tarea directa"><AssignTaskForm leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} /></Card>
        </div>
      </div>
    </div>
  );
}
