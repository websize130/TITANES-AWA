import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/db";
import { eur, PROJECT_STATUS_LABEL, PROPOSAL_STATUS_LABEL } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, Progress } from "@/components/ui";
import { ActionSelect } from "@/components/forms";
import { setClientStatus } from "@/app/actions";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store } = await requireSession();
  const client = await store.get("clients", id);
  if (!client) notFound();
  const [projects, proposals] = await Promise.all([store.list("projects", { eq: { client_id: id } }), store.list("proposals")]);
  const props = proposals.filter((p) => p.client_id === id || (client.lead_id && p.lead_id === client.lead_id));
  return (
    <div className="space-y-5">
      <Link href="/clientes" className="text-xs text-muted hover:text-ink">← Clientes</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{client.name} {client.is_demo && <DemoTag />}</h1>
          <p className="text-sm text-muted">{client.sector} · {client.city} {client.website && <>· <a href={client.website} target="_blank" rel="noopener noreferrer nofollow" className="text-sky-400">{client.website}</a></>}</p>
        </div>
        <ActionSelect value={client.status} onChange={setClientStatus.bind(null, client.id)} options={[{ value: "onboarding", label: "Onboarding" }, { value: "activo", label: "Activo" }, { value: "mantenimiento", label: "Mantenimiento" }, { value: "inactivo", label: "Inactivo" }]} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Proyectos" action={<Link href="/proyectos" className="text-xs text-brand">+ Nuevo proyecto</Link>}>
          {projects.length ? <ul className="space-y-3">{projects.map((p) => <li key={p.id}><div className="mb-1 flex justify-between text-sm"><span>{p.name}</span><Badge value={p.status} label={PROJECT_STATUS_LABEL[p.status]} /></div><Progress value={p.progress} /><div className="mt-1 text-xs text-muted">{eur(p.paid)} / {eur(p.budget)} cobrado</div></li>)}</ul> : <Empty>Sin proyectos.</Empty>}
        </Card>
        <Card title="Presupuestos">
          {props.length ? <ul className="divide-y divide-line text-sm">{props.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{p.title}</span><span className="flex gap-2">{eur(p.total)} <Badge value={p.status} label={PROPOSAL_STATUS_LABEL[p.status]} /></span></li>)}</ul> : <Empty>Sin presupuestos.</Empty>}
        </Card>
        <Card title="Contacto">
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted">Contacto</dt><dd>{client.contact_name ?? "—"}</dd><dt className="text-muted">Email</dt><dd>{client.email ?? "—"}</dd><dt className="text-muted">Teléfono</dt><dd>{client.phone ?? "—"}</dd><dt className="text-muted">Lead de origen</dt><dd>{client.lead_id ? <Link className="text-brand" href={`/leads/${client.lead_id}`}>Ver lead</Link> : "—"}</dd></dl>
          {client.notes && <p className="mt-3 text-sm text-ink/80">{client.notes}</p>}
        </Card>
      </div>
    </div>
  );
}
