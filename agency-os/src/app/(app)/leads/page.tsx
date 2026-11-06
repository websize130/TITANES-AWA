import Link from "next/link";
import { requireSession } from "@/lib/db";
import { eur, LEAD_STATUS_LABEL, timeAgo } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, PageHeader } from "@/components/ui";
import { LeadForm } from "@/components/LeadForm";
import { createLead } from "@/app/actions";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const { store } = await requireSession();
  const all = await store.list("leads");
  const term = (q ?? "").toLowerCase();
  const leads = all.filter((l) => (!status || l.status === status) && (!term || `${l.business_name} ${l.sector} ${l.city}`.toLowerCase().includes(term)));
  return (
    <div>
      <PageHeader title="Leads" subtitle="Captación: registra negocios, su sector, localidad y web." />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card title={`${leads.length} leads`} action={
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Buscar…" className="input !w-40 !py-1 text-xs" />
            <select name="status" defaultValue={status ?? ""} className="input !w-auto !py-1 text-xs"><option value="">Todos</option>{Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <button className="btn btn-ghost !py-1 text-xs">Filtrar</button>
          </form>
        }>
          {leads.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted"><tr><th className="py-2">Negocio</th><th>Sector</th><th>Localidad</th><th>Web</th><th>Estado</th><th className="text-right">Valor est.</th><th className="text-right">Actualizado</th></tr></thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-line hover:bg-white/[.02]">
                      <td className="py-2"><Link href={`/leads/${l.id}`} className="font-medium hover:text-brand">{l.business_name}</Link> {l.is_demo && <DemoTag />}</td>
                      <td className="text-muted">{l.sector}</td><td className="text-muted">{l.city}</td>
                      <td className="max-w-40 truncate text-xs">{l.website ? <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="text-sky-400 hover:underline">{l.website.replace(/^https?:\/\//, "")}</a> : <span className="text-muted">—</span>}</td>
                      <td><Badge value={l.status} label={LEAD_STATUS_LABEL[l.status]} /></td>
                      <td className="text-right">{l.estimated_value ? eur(l.estimated_value) : "—"}</td>
                      <td className="text-right text-xs text-muted">{timeAgo(l.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>No hay leads con estos filtros.</Empty>}
        </Card>
        <Card title="Nuevo lead">
          <LeadForm action={createLead} />
        </Card>
      </div>
    </div>
  );
}
