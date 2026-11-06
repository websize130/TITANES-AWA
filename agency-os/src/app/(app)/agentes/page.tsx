import Link from "next/link";
import { requireSession } from "@/lib/db";
import { loadAgentsData } from "@/lib/queries";
import { getAgent, TOOL_LABELS } from "@/lib/agents";
import { STATE_META } from "@/lib/agent-state";
import { config } from "@/lib/config";
import { usd } from "@/lib/format";
import { PageHeader, Notice } from "@/components/ui";
import { PixelSprite } from "@/components/PixelSprite";

export const metadata = { title: "Agentes" };

export default async function AgentesPage() {
  const { store } = await requireSession();
  const agents = await loadAgentsData(store);
  return (
    <div>
      <PageHeader title="Agentes" subtitle="The Rap Team: siete agentes con permisos, límites y costes propios. Los nombres son etiquetas internas de personajes originales." />
      {!config.anthropicKeyPresent && <div className="mb-4"><Notice tone="warn">Agentes <b>configurados</b> pero <b>no operativos</b>: añade ANTHROPIC_API_KEY en .env.local para que ejecuten tareas reales.</Notice></div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => {
          const p = getAgent(a.id)!;
          const m = STATE_META[a.state];
          return (
            <Link key={a.id} href={`/agentes/${a.id}`} className="panel group flex gap-4 p-4 transition hover:border-brand/50">
              <div className="grid h-28 w-24 shrink-0 place-items-center rounded-xl border border-line" style={{ background: `linear-gradient(160deg, ${p.color}40, #0d0d14)` }}>
                <PixelSprite agentId={a.id} size={92} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-black">{p.name}</h2>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${m.color}22`, color: m.color }}>{m.label}</span>
                </div>
                <div className="text-sm" style={{ color: p.color }}>{p.role}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">{p.tools.slice(0, 3).map((t) => <span key={t} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">{TOOL_LABELS[t]}</span>)}</div>
                <div className="mt-2 flex gap-3 text-[11px] text-muted">
                  <span className={a.operational ? "text-green-400" : "text-yellow-400"}>{a.operational ? "Operativo" : "Configurado"}</span>
                  <span>{a.pendingTasks.length} pendientes</span>
                  <span>{usd(a.totalCostUsd)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
