import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/db";
import { getAgent } from "@/lib/agents";
import { dateEs, eur, LEAD_STATUS_LABEL, PROPOSAL_STATUS_LABEL, TASK_STATUS_LABEL } from "@/lib/format";
import { Badge, Card, DemoTag, Empty } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { addAudit, convertLeadToClient, deleteLead, quickLeadTask, updateLead } from "@/app/actions";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireSession();
  const lead = await store.get("leads", id);
  if (!lead) notFound();
  const [audits, proposals, tasks] = await Promise.all([
    store.list("audits", { eq: { lead_id: id } }),
    store.list("proposals", { eq: { lead_id: id } }),
    store.list("tasks", { eq: { lead_id: id } }),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-xs text-muted hover:text-ink">← Leads</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{lead.business_name} {lead.is_demo && <DemoTag />}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">{lead.sector} · {lead.city} <Badge value={lead.status} label={LEAD_STATUS_LABEL[lead.status]} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onAction={quickLeadTask.bind(null, lead.id, "auditoria")}>🔎 Encargar auditoría a TUPAC</ActionButton>
          <ActionButton onAction={quickLeadTask.bind(null, lead.id, "diseno")}>🎨 Propuesta visual a NAS</ActionButton>
          <ActionButton onAction={quickLeadTask.bind(null, lead.id, "presupuesto")}>💶 Presupuesto con 50 CENT</ActionButton>
          <Link href={`/presupuestos?lead=${lead.id}`} className="btn btn-ghost">Presupuesto manual</Link>
          {lead.client_id
            ? <Link href={`/clientes/${lead.client_id}`} className="btn btn-primary">Ver cliente</Link>
            : <ActionButton variant="primary" onAction={convertLeadToClient.bind(null, lead.id)} confirm="¿Convertir este lead en cliente?">Convertir en cliente</ActionButton>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card title={`Auditorías (${audits.length})`}>
            {audits.length ? (
              <div className="space-y-3">
                {audits.map((a) => (
                  <div key={a.id} className="rounded-lg border border-line bg-black/15 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{getAgent(a.author)?.name ?? "Fundador"} · {dateEs(a.created_at)}</span>
                      {a.score !== null && <span className="text-base font-bold text-brand">{a.score}/100</span>}
                    </div>
                    <p className="text-sm">{a.summary}</p>
                    {a.findings.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {a.findings.map((f, i) => (
                          <li key={i} className="flex gap-2">
                            <span className={`shrink-0 rounded px-1.5 ${f.verified ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{f.verified ? "Verificado" : "Hipótesis"}</span>
                            <span><b>{f.area}</b> ({f.severity}): {f.finding}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : <Empty>Sin auditorías. Encárgala a TUPAC o regístrala manualmente.</Empty>}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-brand">Registrar auditoría manual</summary>
              <ActionForm action={addAudit} resetOnSuccess hidden={{ lead_id: lead.id }} className="mt-3 space-y-2">
                <input name="score" type="number" min={0} max={100} placeholder="Puntuación de oportunidad (0-100)" className="input" />
                <textarea name="summary" required rows={2} placeholder="Resumen" className="input" />
                <textarea name="verified" rows={3} placeholder="Hechos verificados (uno por línea)" className="input" />
                <textarea name="hypotheses" rows={3} placeholder="Hipótesis por comprobar (una por línea)" className="input" />
                <SubmitButton>Guardar auditoría</SubmitButton>
              </ActionForm>
            </details>
          </Card>

          <Card title={`Presupuestos (${proposals.length})`}>
            {proposals.length ? (
              <ul className="divide-y divide-line text-sm">
                {proposals.map((p) => <li key={p.id} className="flex justify-between py-2"><Link href="/presupuestos" className="hover:text-brand">{p.title}</Link><span className="flex items-center gap-2">{eur(p.total)} <Badge value={p.status} label={PROPOSAL_STATUS_LABEL[p.status]} /></span></li>)}
              </ul>
            ) : <Empty>Sin presupuestos.</Empty>}
          </Card>

          <Card title={`Tareas de agentes (${tasks.length})`}>
            {tasks.length ? (
              <ul className="divide-y divide-line text-sm">
                {tasks.map((t) => <li key={t.id} className="flex justify-between gap-2 py-2"><Link href={`/tareas/${t.id}`} className="truncate hover:text-brand">{getAgent(t.agent_id)?.name}: {t.title}</Link><Badge value={t.status} label={TASK_STATUS_LABEL[t.status]} /></li>)}
              </ul>
            ) : <Empty>Sin tareas.</Empty>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Datos del lead">
            <LeadForm action={updateLead} lead={lead} />
          </Card>
          <ActionButton variant="danger" onAction={deleteLead.bind(null, lead.id)} confirm="¿Eliminar este lead definitivamente?">Eliminar lead</ActionButton>
        </div>
      </div>
    </div>
  );
}
