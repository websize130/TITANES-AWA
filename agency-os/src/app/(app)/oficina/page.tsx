import { requireSession } from "@/lib/db";
import { loadAgentsData } from "@/lib/queries";
import { Office } from "@/components/office/Office";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Oficina virtual" };

export default async function OficinaPage() {
  const { store } = await requireSession();
  const [agents, leads, projects] = await Promise.all([loadAgentsData(store), store.list("leads"), store.list("projects")]);
  return (
    <div>
      <PageHeader title="Oficina virtual" subtitle="Estado en tiempo real de los siete agentes. Solo se muestra actividad cuando existe una ejecución real." />
      <div className="panel panel-glow p-3">
        <Office agents={agents} leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
      </div>
    </div>
  );
}
