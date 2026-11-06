import Link from "next/link";
import { requireSession } from "@/lib/db";
import { getAgent } from "@/lib/agents";
import { APPROVAL_TYPE_LABEL, dateEs } from "@/lib/format";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { ApprovalButtons } from "@/components/ApprovalButtons";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { executeApproval, markApprovalExecuted } from "@/app/actions";

export const metadata = { title: "Aprobaciones" };

export default async function AprobacionesPage() {
  const { store } = await requireSession();
  const all = await store.list("approvals", { limit: 200 });
  const pending = all.filter((a) => a.status === "pendiente");
  const approved = all.filter((a) => a.status === "aprobada");
  const history = all.filter((a) => a.status === "rechazada" || a.status === "ejecutada");
  return (
    <div>
      <PageHeader title="Centro de aprobaciones" subtitle="Ningún agente envía mensajes u ofertas, publica webs, paga ni toca producción sin tu autorización." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title={`Pendientes (${pending.length})`}>
          {pending.length ? <div className="space-y-3">{pending.map((a) => (
            <div key={a.id} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
              <div className="flex items-start justify-between gap-2"><div className="font-medium">{a.title}</div><Badge color="#eab308" label={APPROVAL_TYPE_LABEL[a.type]} /></div>
              <div className="mb-2 text-[11px] text-muted">Solicita {getAgent(a.requested_by)?.name ?? a.requested_by} · {dateEs(a.created_at)}{a.related_table === "tasks" && a.related_id && <> · <Link href={`/tareas/${a.related_id}`} className="text-brand">ver tarea</Link></>}</div>
              <p className="mb-3 whitespace-pre-wrap text-sm text-ink/80">{a.description}</p>
              <ApprovalButtons id={a.id} withNote />
            </div>
          ))}</div> : <Empty>Nada pendiente.</Empty>}
        </Card>
        <div className="space-y-5">
          <Card title={`Aprobadas sin ejecutar (${approved.length})`}>
            {approved.length ? <div className="space-y-3">{approved.map((a) => (
              <div key={a.id} className="rounded-xl border border-line p-3">
                <div className="flex justify-between gap-2"><span className="font-medium">{a.title}</span><Badge color="#22d3ee" label={APPROVAL_TYPE_LABEL[a.type]} /></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeof a.payload.workflow_id === "string" && <ActionForm action={executeApproval} hidden={{ $id: a.id }}><SubmitButton pendingText="Disparando…">Ejecutar vía n8n</SubmitButton></ActionForm>}
                  <ActionButton onAction={markApprovalExecuted.bind(null, a.id)}>Marcar como hecho manualmente</ActionButton>
                </div>
              </div>
            ))}</div> : <Empty>—</Empty>}
          </Card>
          <Card title="Historial">
            {history.length ? <ul className="divide-y divide-line text-sm">{history.map((a) => <li key={a.id} className="flex justify-between gap-2 py-2"><span className="truncate">{a.title}</span><span className="flex shrink-0 items-center gap-2 text-xs text-muted">{dateEs(a.decided_at ?? a.created_at)} <Badge value={a.status} color={a.status === "rechazada" ? "#ef4444" : "#22c55e"} /></span></li>)}</ul> : <Empty>—</Empty>}
          </Card>
        </div>
      </div>
    </div>
  );
}
