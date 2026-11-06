import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/db";
import { getAgent } from "@/lib/agents";
import { dateEs, TASK_STATUS_LABEL, usd } from "@/lib/format";
import { Badge, Card, Empty, Notice } from "@/components/ui";
import { AgentAvatar } from "@/components/PixelSprite";
import { Markdown } from "@/components/Markdown";
import { ActionForm, SubmitButton } from "@/components/forms";
import { runTaskAction } from "@/app/actions";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireSession();
  const task = await store.get("tasks", id);
  if (!task) notFound();
  const agent = getAgent(task.agent_id)!;
  const [runs, deps, lead] = await Promise.all([
    store.list("agent_runs", { eq: { task_id: id } }),
    Promise.all(task.depends_on.map((d) => store.get("tasks", d))),
    task.lead_id ? store.get("leads", task.lead_id) : null,
  ]);
  const r = task.result;
  return (
    <div className="space-y-5">
      <Link href="/tareas" className="text-xs text-muted hover:text-ink">← Tareas</Link>
      <div className="flex flex-wrap items-center gap-4">
        <AgentAvatar agentId={agent.id} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{task.title}</h1>
          <div className="text-sm text-muted">{agent.name} · {agent.role} · creada por {getAgent(task.created_by)?.name ?? task.created_by} · {dateEs(task.created_at)}</div>
        </div>
        <Badge value={task.status} label={TASK_STATUS_LABEL[task.status]} />
        {(task.status === "pendiente" || task.status === "error") && <ActionForm action={runTaskAction} hidden={{ $id: task.id }}><SubmitButton pendingText={`${agent.name} trabajando…`}>▶ Ejecutar con Claude</SubmitButton></ActionForm>}
      </div>
      {task.error && <Notice tone="error">{task.error}</Notice>}
      {task.status === "pendiente_aprobacion" && <Notice tone="warn">Requiere tu aprobación en el <Link href="/aprobaciones" className="underline">Centro de aprobaciones</Link> antes de ejecutarse.</Notice>}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card title="Instrucciones"><p className="whitespace-pre-wrap text-sm text-ink/80">{task.description || "—"}</p></Card>
          {r ? (
            <>
              <Card title="Resultado"><p className="mb-3 text-sm font-medium">{r.summary}</p><Markdown source={r.deliverable_markdown} /></Card>
              <div className="grid gap-5 md:grid-cols-2">
                <Card title="✓ Datos verificados">{r.verified_facts.length ? <ul className="list-disc space-y-1 pl-4 text-sm">{r.verified_facts.map((f, i) => <li key={i}>{f}</li>)}</ul> : <Empty>Ninguno.</Empty>}</Card>
                <Card title="? Hipótesis por verificar">{r.hypotheses.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-yellow-200/90">{r.hypotheses.map((f, i) => <li key={i}>{f}</li>)}</ul> : <Empty>Ninguna.</Empty>}</Card>
              </div>
              <Card title="Siguientes pasos">{r.next_steps.length ? <ul className="list-disc space-y-1 pl-4 text-sm">{r.next_steps.map((f, i) => <li key={i}>{f}</li>)}</ul> : <Empty>—</Empty>}{r.qa_verdict !== "no_aplica" && <div className="mt-3"><Badge color={r.qa_verdict === "aprobado" ? "#22c55e" : "#ef4444"} label={`Veredicto QA: ${r.qa_verdict}`} /></div>}</Card>
            </>
          ) : <Card title="Resultado"><Empty>Sin resultado: la tarea no se ha ejecutado.</Empty></Card>}
        </div>
        <div className="space-y-5">
          <Card title="Contexto">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Prioridad</dt><dd>{task.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Lead</dt><dd>{lead ? <Link href={`/leads/${lead.id}`} className="text-brand">{lead.business_name}</Link> : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Plan</dt><dd>{task.plan_id ? task.plan_id.slice(0, 8) : "—"}</dd></div>
            </dl>
            {deps.length > 0 && <div className="mt-3 text-xs"><div className="mb-1 text-muted">Depende de:</div>{deps.map((d) => d && <div key={d.id} className="flex justify-between"><Link href={`/tareas/${d.id}`} className="truncate hover:text-brand">{getAgent(d.agent_id)?.name}: {d.title}</Link><span>{TASK_STATUS_LABEL[d.status]}</span></div>)}</div>}
          </Card>
          <Card title="Ejecuciones">
            {runs.length ? <ul className="space-y-2 text-xs">{runs.map((x) => <li key={x.id} className="rounded-md bg-black/20 p-2"><div className="flex justify-between"><span className={x.status === "succeeded" ? "text-green-400" : "text-red-400"}>{x.status}</span><span>{dateEs(x.created_at)}</span></div><div className="text-muted">{x.model} · {x.input_tokens}+{x.output_tokens} tok · {usd(x.cost_usd, 4)}</div>{x.error && <div className="mt-1 text-red-400">{x.error}</div>}</li>)}</ul> : <Empty>Sin ejecuciones.</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}
