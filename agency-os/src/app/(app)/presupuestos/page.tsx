import Link from "next/link";
import { requireSession } from "@/lib/db";
import { getAgent } from "@/lib/agents";
import { eur, PROPOSAL_STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, PageHeader } from "@/components/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { createProposal, proposalTransition, saveService } from "@/app/actions";

export const metadata = { title: "Presupuestos" };

export default async function PresupuestosPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead: leadParam } = await searchParams;
  const { store } = await requireSession();
  const [services, proposals, leads, clients] = await Promise.all([store.list("services", { order: { column: "sort", ascending: true } }), store.list("proposals"), store.list("leads"), store.list("clients")]);
  const active = services.filter((s) => s.active);
  return (
    <div className="space-y-5">
      <PageHeader title="Presupuestos y catálogo" subtitle="Precios, entregables, costes y márgenes editables. El envío de una propuesta siempre requiere aprobación." />
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card title={`Presupuestos (${proposals.length})`}>
          {proposals.length ? (
            <div className="space-y-3">
              {proposals.map((p) => {
                const margin = p.total ? Math.round(((p.total - p.cost_total) / p.total) * 100) : 0;
                const who = leads.find((l) => l.id === p.lead_id)?.business_name ?? clients.find((c) => c.id === p.client_id)?.name ?? "—";
                return (
                  <div key={p.id} className="rounded-xl border border-line bg-black/15 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{p.title} {p.is_demo && <DemoTag />}</div>
                      <Badge value={p.status} label={PROPOSAL_STATUS_LABEL[p.status]} />
                    </div>
                    <div className="text-[11px] text-muted">{who} · {getAgent(p.created_by)?.name ?? "Fundador"} · {timeAgo(p.created_at)}</div>
                    <ul className="mt-2 text-xs">{p.items.map((i) => <li key={i.service_id} className="flex justify-between"><span>{i.name}</span><span>{eur(i.price)}</span></li>)}</ul>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                      <span><b>{eur(p.total)}</b> <span className="text-xs text-muted">· coste {eur(p.cost_total)} · margen {margin}%</span></span>
                      <div className="flex gap-2">
                        {p.status === "borrador" && <ActionButton variant="primary" className="!py-1 text-xs" onAction={proposalTransition.bind(null, p.id, "solicitar_envio")}>Solicitar envío</ActionButton>}
                        {p.status === "pendiente_aprobacion" && <Link href="/aprobaciones" className="btn btn-ghost !py-1 text-xs">En aprobación →</Link>}
                        {(p.status === "enviada" || p.status === "aprobada") && <>
                          <ActionButton className="!py-1 text-xs" onAction={proposalTransition.bind(null, p.id, "aceptada")}>Aceptada</ActionButton>
                          <ActionButton className="!py-1 text-xs" onAction={proposalTransition.bind(null, p.id, "rechazada")}>Rechazada</ActionButton>
                        </>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty>Sin presupuestos.</Empty>}
        </Card>
        <Card title="Nuevo presupuesto">
          <ActionForm action={createProposal} resetOnSuccess className="space-y-2">
            <input name="title" required placeholder="Título *" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <select name="lead_id" defaultValue={leadParam ?? ""} className="input"><option value="">Lead…</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}</select>
              <select name="client_id" defaultValue="" className="input"><option value="">o cliente…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </div>
            <div className="space-y-1.5 rounded-lg border border-line p-2">
              {active.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={`svc_${s.id}`} />
                  <span className="flex-1">{s.name} <span className="text-[11px] text-muted">({eur(s.price_min)}{s.price_max ? `–${eur(s.price_max)}` : ""})</span></span>
                  <input type="number" name={`price_${s.id}`} min={0} defaultValue={s.price_min} className="input !w-24 !py-1 text-xs" aria-label={`Precio ${s.name}`} />
                </label>
              ))}
            </div>
            <textarea name="notes" rows={2} placeholder="Notas" className="input" />
            <SubmitButton>Crear borrador</SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <Card title="Catálogo de servicios">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {services.map((s) => {
            const margin = s.price_min ? Math.round(((s.price_min - s.cost) / s.price_min) * 100) : 0;
            return (
              <details key={s.id} className="rounded-xl border border-line bg-black/15 p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="font-medium">{s.name} {!s.active && <span className="text-xs text-muted">(inactivo)</span>}</span>
                  <span className="text-sm">{eur(s.price_min)}{s.price_max ? `–${eur(s.price_max)}` : ""} <span className="text-[11px] text-green-400">· {margin}% margen</span></span>
                </summary>
                <ActionForm action={saveService} hidden={{ id: s.id }} className="mt-3 grid grid-cols-3 gap-2">
                  <input name="name" defaultValue={s.name} className="input col-span-3" />
                  <div><label className="label">Desde €</label><input name="price_min" type="number" min={0} defaultValue={s.price_min} className="input" /></div>
                  <div><label className="label">Hasta €</label><input name="price_max" type="number" min={0} defaultValue={s.price_max ?? ""} className="input" /></div>
                  <div><label className="label">Coste €</label><input name="cost" type="number" min={0} defaultValue={s.cost} className="input" /></div>
                  <textarea name="description" defaultValue={s.description} rows={2} className="input col-span-3" />
                  <textarea name="deliverables" defaultValue={s.deliverables.join("\n")} rows={3} className="input col-span-3" placeholder="Entregables (uno por línea)" />
                  <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} /> Activo</label>
                  <SubmitButton variant="ghost">Guardar</SubmitButton>
                </ActionForm>
              </details>
            );
          })}
          <details className="rounded-xl border border-dashed border-line p-3">
            <summary className="cursor-pointer text-sm text-brand">+ Añadir servicio</summary>
            <ActionForm action={saveService} resetOnSuccess className="mt-3 grid grid-cols-3 gap-2">
              <input name="id" required placeholder="id-servicio" className="input" />
              <input name="name" required placeholder="Nombre" className="input col-span-2" />
              <input name="price_min" type="number" min={0} required placeholder="Desde €" className="input" />
              <input name="price_max" type="number" min={0} placeholder="Hasta €" className="input" />
              <input name="cost" type="number" min={0} required placeholder="Coste €" className="input" />
              <textarea name="deliverables" rows={2} placeholder="Entregables (uno por línea)" className="input col-span-3" />
              <input type="hidden" name="active" value="on" />
              <SubmitButton>Añadir</SubmitButton>
            </ActionForm>
          </details>
        </div>
      </Card>
    </div>
  );
}
