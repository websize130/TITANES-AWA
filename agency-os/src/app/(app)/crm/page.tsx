import Link from "next/link";
import { requireSession } from "@/lib/db";
import { eur, LEAD_STATUS_LABEL, STATUS_TONE, timeAgo } from "@/lib/format";
import { DemoTag, PageHeader } from "@/components/ui";
import { ActionSelect } from "@/components/forms";
import { setLeadStatus } from "@/app/actions";
import type { LeadStatus } from "@/lib/types";

export const metadata = { title: "CRM" };
const COLUMNS: LeadStatus[] = ["nuevo", "investigando", "auditado", "contactado", "propuesta", "negociacion", "ganado", "perdido"];

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ sector?: string; city?: string }> }) {
  const { sector, city } = await searchParams;
  const { store } = await requireSession();
  const all = await store.list("leads");
  const leads = all.filter((l) => (!sector || l.sector === sector) && (!city || l.city === city));
  const sectors = [...new Set(all.map((l) => l.sector).filter(Boolean))].sort();
  const cities = [...new Set(all.map((l) => l.city).filter(Boolean))].sort();
  const opts = COLUMNS.map((c) => ({ value: c, label: LEAD_STATUS_LABEL[c] }));

  return (
    <div>
      <PageHeader title="CRM" subtitle="Pipeline comercial por estado. Cambia el estado desde cada tarjeta." actions={<Link href="/leads" className="btn btn-primary">+ Nuevo lead</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="sector" defaultValue={sector ?? ""} className="input !w-auto"><option value="">Todos los sectores</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select>
        <select name="city" defaultValue={city ?? ""} className="input !w-auto"><option value="">Todas las localidades</option>{cities.map((s) => <option key={s}>{s}</option>)}</select>
        <button className="btn btn-ghost">Filtrar</button>
      </form>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.status === col);
          const total = items.reduce((s, l) => s + Number(l.estimated_value ?? 0), 0);
          return (
            <div key={col} className="panel w-64 shrink-0 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: STATUS_TONE[col] }}>{LEAD_STATUS_LABEL[col]} <span className="text-muted">({items.length})</span></span>
                <span className="text-[11px] text-muted">{eur(total)}</span>
              </div>
              <div className="space-y-2">
                {items.map((l) => (
                  <div key={l.id} className="rounded-lg border border-line bg-black/20 p-2.5">
                    <Link href={`/leads/${l.id}`} className="block text-sm font-medium hover:text-brand">{l.business_name} {l.is_demo && <DemoTag />}</Link>
                    <div className="mb-2 text-[11px] text-muted">{l.sector || "—"} · {l.city || "—"} · {timeAgo(l.updated_at)}</div>
                    <ActionSelect value={l.status} options={opts} onChange={setLeadStatus.bind(null, l.id)} />
                  </div>
                ))}
                {!items.length && <div className="rounded-lg border border-dashed border-line p-3 text-center text-[11px] text-muted">Vacío</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
