import { requireSession } from "@/lib/db";
import { eur, PROJECT_STATUS_LABEL } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, PageHeader, Progress } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createProject, updateProject } from "@/app/actions";

export const metadata = { title: "Proyectos" };

export default async function ProyectosPage() {
  const { store } = await requireSession();
  const [projects, clients, services] = await Promise.all([store.list("projects"), store.list("clients"), store.list("services", { order: { column: "sort", ascending: true } })]);
  return (
    <div>
      <PageHeader title="Proyectos" subtitle="Producción: un proyecto no puede pasar a «Entregado» sin QA superado por ICE CUBE." />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {projects.length ? projects.map((p) => (
            <div key={p.id} className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.name} {p.is_demo && <DemoTag />}</div>
                  <div className="text-xs text-muted">{clients.find((c) => c.id === p.client_id)?.name ?? "Sin cliente"} · {p.service || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={p.status} label={PROJECT_STATUS_LABEL[p.status]} />
                  <Badge color={p.qa_passed ? "#22c55e" : "#9ca3af"} label={p.qa_passed ? "QA superado" : "QA pendiente"} />
                </div>
              </div>
              <div className="my-3"><Progress value={p.progress} /></div>
              <ActionForm action={updateProject} hidden={{ $id: p.id }} className="flex flex-wrap items-end gap-2">
                <div><label className="label">Estado</label><select name="status" defaultValue={p.status} className="input !w-auto">{Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="label">Progreso %</label><input name="progress" type="number" min={0} max={100} defaultValue={p.progress} className="input !w-24" /></div>
                <div><label className="label">Cobrado € (de {eur(p.budget)})</label><input name="paid" type="number" min={0} defaultValue={p.paid} className="input !w-32" /></div>
                <SubmitButton variant="ghost">Actualizar</SubmitButton>
              </ActionForm>
            </div>
          )) : <Empty>Sin proyectos.</Empty>}
        </div>
        <Card title="Nuevo proyecto">
          <ActionForm action={createProject} resetOnSuccess className="space-y-2">
            <input name="name" required maxLength={200} placeholder="Nombre *" className="input" />
            <select name="client_id" className="input" defaultValue=""><option value="">Sin cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <select name="service" className="input" defaultValue=""><option value="">Servicio…</option>{services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-2"><input name="budget" type="number" min={0} placeholder="Presupuesto €" className="input" /><input name="due_date" type="date" className="input" /></div>
            <SubmitButton>Crear proyecto</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
