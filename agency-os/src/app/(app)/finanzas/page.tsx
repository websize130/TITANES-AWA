import { requireSession } from "@/lib/db";
import { AGENTS } from "@/lib/agents";
import { config } from "@/lib/config";
import { eur, usd } from "@/lib/format";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Finanzas" };

function Bars({ rows, format }: { rows: { label: string; value: number; color?: string }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-xs">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/5"><span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? "#f97316" }} /></span>
          <span className="text-right tabular-nums">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function FinanzasPage() {
  const { store } = await requireSession();
  const [projects, proposals, runs] = await Promise.all([store.list("projects"), store.list("proposals"), store.list("agent_runs", { limit: 5000 })]);
  const billed = projects.reduce((s, p) => s + Number(p.budget), 0);
  const paid = projects.reduce((s, p) => s + Number(p.paid), 0);
  const accepted = proposals.filter((p) => p.status === "aceptada");
  const acceptedRevenue = accepted.reduce((s, p) => s + Number(p.total), 0);
  const acceptedCost = accepted.reduce((s, p) => s + Number(p.cost_total), 0);
  const aiTotal = runs.reduce((s, r) => s + Number(r.cost_usd), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const aiToday = runs.filter((r) => Date.parse(r.created_at) >= today.getTime()).reduce((s, r) => s + Number(r.cost_usd), 0);

  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ label: d.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }), value: accepted.filter((p) => p.created_at.startsWith(key)).reduce((s, p) => s + Number(p.total), 0) });
  }
  const byAgent = AGENTS.map((a) => ({ label: a.name, color: a.color, value: runs.filter((r) => r.agent_id === a.id).reduce((s, r) => s + Number(r.cost_usd), 0) }));
  const tokens = runs.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Finanzas" subtitle="Facturación, cobros, márgenes y costes de IA reales (calculados con el uso de tokens devuelto por la API)." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="€" label="Cobrado" value={eur(paid)} hint={`${eur(billed - paid)} pendiente de cobro`} accent="#22c55e" />
        <Stat icon="✓" label="Propuestas aceptadas" value={eur(acceptedRevenue)} hint={`margen bruto ${acceptedRevenue ? Math.round(((acceptedRevenue - acceptedCost) / acceptedRevenue) * 100) : 0}%`} />
        <Stat icon="⌁" label="Coste IA total" value={usd(aiTotal)} hint={`${tokens.toLocaleString("es-ES")} tokens`} accent="#22d3ee" />
        <Stat icon="⏱" label="Coste IA hoy" value={usd(aiToday)} hint={`presupuesto diario ${usd(config.dailyBudgetUsd)}`} accent="#a855f7" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Ventas aceptadas por mes (€)">{months.some((m) => m.value) ? <Bars rows={months} format={eur} /> : <Empty>Sin propuestas aceptadas en los últimos 6 meses.</Empty>}</Card>
        <Card title="Coste de IA por agente (USD)">{aiTotal ? <Bars rows={byAgent} format={(n) => usd(n, 4)} /> : <Empty>Sin ejecuciones reales: coste 0.</Empty>}</Card>
        <Card title="Rentabilidad por proyecto" className="lg:col-span-2">
          {projects.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2">Proyecto</th><th className="text-right">Presupuesto</th><th className="text-right">Cobrado</th><th className="text-right">Pendiente</th><th className="text-right">% cobrado</th></tr></thead>
              <tbody>{projects.map((p) => <tr key={p.id} className="border-t border-line"><td className="py-2">{p.name}</td><td className="text-right">{eur(p.budget)}</td><td className="text-right">{eur(p.paid)}</td><td className="text-right">{eur(Number(p.budget) - Number(p.paid))}</td><td className="text-right">{p.budget ? Math.round((Number(p.paid) / Number(p.budget)) * 100) : 0}%</td></tr>)}</tbody>
            </table>
          ) : <Empty>Sin proyectos.</Empty>}
        </Card>
      </div>
    </div>
  );
}
