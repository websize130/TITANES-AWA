import Link from "next/link";
import { requireSession } from "@/lib/db";
import { loadAgentsData } from "@/lib/queries";
import { getAgent } from "@/lib/agents";
import { STATE_META } from "@/lib/agent-state";
import { config } from "@/lib/config";
import { APPROVAL_TYPE_LABEL, eur, LEAD_STATUS_LABEL, timeAgo, usd } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, LinkMore, Progress, Stat } from "@/components/ui";
import { AgentAvatar } from "@/components/PixelSprite";
import { Office } from "@/components/office/Office";
import { EminemConsole } from "@/components/EminemConsole";
import { ApprovalButtons } from "@/components/ApprovalButtons";

export const metadata = { title: "Overview" };

// Página dinámica (force-dynamic): se calcula en cada petición.
const daysAgo = (d: number) => Date.now() - d * 86400_000;

export default async function Overview() {
  const { store } = await requireSession();
  const [agents, leads, clients, projects, tasks, approvals, proposals, runs, logs] = await Promise.all([
    loadAgentsData(store),
    store.list("leads"),
    store.list("clients"),
    store.list("projects"),
    store.list("tasks", { limit: 500 }),
    store.list("approvals", { eq: { status: "pendiente" } }),
    store.list("proposals"),
    store.list("agent_runs", { limit: 1000 }),
    store.list("activity_logs", { limit: 8 }),
  ]);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const inMonth = (iso: string) => Date.parse(iso) >= monthStart.getTime();
  const weekAgo = daysAgo(7);

  const pendingCharge = projects.reduce((s, p) => s + Math.max(0, Number(p.budget) - Number(p.paid)), 0);
  const billedTotal = projects.reduce((s, p) => s + Number(p.paid), 0);
  const pipeline = proposals.filter((p) => ["borrador", "pendiente_aprobacion", "aprobada", "enviada"].includes(p.status)).reduce((s, p) => s + Number(p.total), 0);
  const newLeads = leads.filter((l) => Date.parse(l.created_at) >= weekAgo).length;
  const activeProjects = projects.filter((p) => p.status !== "entregado");
  const pendingTasks = tasks.filter((t) => t.status === "pendiente" || t.status === "pendiente_aprobacion" || t.status === "en_curso");
  const aiCostMonth = runs.filter((r) => inMonth(r.created_at)).reduce((s, r) => s + Number(r.cost_usd), 0);
  const won = leads.filter((l) => l.status === "ganado").length;
  const closed = leads.filter((l) => l.status === "ganado" || l.status === "perdido").length;
  const sent = proposals.filter((p) => ["enviada", "aceptada", "rechazada"].includes(p.status)).length;
  const accepted = proposals.filter((p) => p.status === "aceptada").length;
  const anyDemo = leads.some((l) => l.is_demo) || projects.some((p) => p.is_demo);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Overview</h1>
        {anyDemo && <span className="rounded-md bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">Incluye datos de demostración (marcados <DemoTag />)</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon="◎" label="Leads nuevos (7 días)" value={newLeads} hint={`${leads.length} en total`} />
        <Stat icon="♜" label="Clientes" value={clients.length} hint={`${clients.filter((c) => c.status === "activo").length} activos`} accent="#22c55e" />
        <Stat icon="▤" label="Proyectos activos" value={activeProjects.length} hint={`${pendingTasks.length} tareas abiertas`} accent="#a855f7" />
        <Stat icon="€" label="Facturación cobrada" value={eur(billedTotal)} hint={`${eur(pendingCharge)} pendiente de cobro`} accent="#eab308" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1fr_340px]">
        <Card title="Oficina virtual" action={<LinkMore href="/oficina">Pantalla completa →</LinkMore>} className="panel-glow">
          <Office agents={agents} leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
        </Card>
        <div className="space-y-5">
          <Card title="Nuestros agentes" action={<LinkMore href="/agentes" />}>
            <ul className="space-y-2">
              {agents.map((a) => {
                const p = getAgent(a.id)!;
                const m = STATE_META[a.state];
                return (
                  <li key={a.id}>
                    <Link href={`/agentes/${a.id}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-white/5">
                      <AgentAvatar agentId={a.id} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">{p.name}</div>
                        <div className="truncate text-xs text-muted">{p.role}</div>
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} title={m.label} />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-muted">{config.anthropicKeyPresent ? "Claude conectado: los agentes pueden ejecutar tareas reales." : "Sin ANTHROPIC_API_KEY: agentes configurados, no operativos."}</p>
          </Card>
          <Card title="Instrucción a EMINEM">
            <EminemConsole leads={leads.map((l) => ({ id: l.id, business_name: l.business_name }))} compact />
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
        <Card title="Leads recientes" action={<LinkMore href="/leads" />}>
          {leads.length ? (
            <ul className="space-y-2.5">
              {leads.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="flex items-start justify-between gap-2 hover:opacity-80">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{l.business_name} {l.is_demo && <DemoTag />}</div>
                      <div className="text-xs text-muted">{l.city} · <span style={{ color: l.priority === "alta" ? "#22c55e" : "#eab308" }}>Oportunidad {l.priority}</span></div>
                    </div>
                    <Badge value={l.status} label={LEAD_STATUS_LABEL[l.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>Sin leads. <Link href="/leads" className="text-brand">Crea el primero</Link>.</Empty>}
        </Card>

        <Card title="Proyectos activos" action={<LinkMore href="/proyectos" />}>
          {activeProjects.length ? (
            <ul className="space-y-3">
              {activeProjects.slice(0, 4).map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between text-sm"><span className="truncate">{p.name} {p.is_demo && <DemoTag />}</span><span className="text-muted">{p.progress}%</span></div>
                  <Progress value={p.progress} />
                </li>
              ))}
            </ul>
          ) : <Empty>Sin proyectos activos.</Empty>}
        </Card>

        <Card title={`Aprobaciones pendientes (${approvals.length})`} action={<LinkMore href="/aprobaciones">Ver todas →</LinkMore>}>
          {approvals.length ? (
            <ul className="space-y-3">
              {approvals.slice(0, 3).map((a) => (
                <li key={a.id} className="rounded-lg border border-line bg-black/15 p-2.5">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="mb-2 text-[11px] text-muted">{APPROVAL_TYPE_LABEL[a.type]} · {getAgent(a.requested_by)?.name ?? a.requested_by} · {timeAgo(a.created_at)}</div>
                  <ApprovalButtons id={a.id} />
                </li>
              ))}
            </ul>
          ) : <Empty>Nada que aprobar.</Empty>}
        </Card>

        <Card title="Actividad reciente">
          {logs.length ? (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="flex gap-2 text-xs">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: getAgent(l.actor)?.color ?? (l.level === "error" ? "#ef4444" : "#9ca3af") }} />
                  <div className="min-w-0">
                    <div className={`truncate ${l.level === "error" ? "text-red-400" : ""}`}><b>{getAgent(l.actor)?.name ?? l.actor}</b> · {l.action}</div>
                    <div className="text-muted">{timeAgo(l.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty>La actividad real aparecerá aquí.</Empty>}
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon="⌁" label="Costes de IA este mes" value={usd(aiCostMonth)} hint={`${runs.length} ejecuciones registradas`} accent="#22d3ee" />
        <Stat icon="⇄" label="Pipeline en propuestas" value={eur(pipeline)} hint={`${proposals.length} presupuestos`} accent="#f97316" />
        <Stat icon="✓" label="Tasa de cierre de leads" value={closed ? `${Math.round((won / closed) * 100)}%` : "—"} hint={`${won} ganados / ${closed} cerrados`} accent="#22c55e" />
        <Stat icon="✉" label="Aceptación de propuestas" value={sent ? `${Math.round((accepted / sent) * 100)}%` : "—"} hint={`${accepted} aceptadas / ${sent} enviadas`} accent="#ec4899" />
      </div>
    </div>
  );
}
