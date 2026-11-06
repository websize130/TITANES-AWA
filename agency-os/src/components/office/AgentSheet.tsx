"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getAgent, TOOL_LABELS } from "@/lib/agents";
import { STATE_META } from "@/lib/agent-state";
import type { AgentCardData } from "@/lib/queries";
import { TASK_STATUS_LABEL, timeAgo, usd } from "@/lib/format";
import { PixelSprite } from "../PixelSprite";
import { AssignTaskForm } from "../AssignTaskForm";
import { ActionForm, SubmitButton } from "../forms";
import { runTaskAction } from "@/app/actions";

export function AgentSheet({ data, leads, projects, onClose }: { data: AgentCardData; leads: { id: string; business_name: string }[]; projects: { id: string; name: string }[]; onClose: () => void }) {
  const agent = getAgent(data.id)!;
  const meta = STATE_META[data.state];
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const runnable = data.pendingTasks.find((t) => t.status === "pendiente");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Ficha de ${agent.name}`}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="grid h-28 w-24 place-items-center rounded-xl border border-line" style={{ background: `linear-gradient(160deg, ${agent.color}40, #0d0d14)` }}>
            <PixelSprite agentId={agent.id} size={96} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">{agent.name}</h2>
              <button onClick={onClose} className="btn btn-ghost !px-2 !py-1" aria-label="Cerrar">✕</button>
            </div>
            <div className="text-sm" style={{ color: agent.color }}>{agent.role}</div>
            <div className="text-xs text-muted">{agent.department} · {agent.zone}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${data.operational ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>{data.operational ? "Operativo" : "Solo configurado"}</span>
              {data.verified && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] text-cyan-300">Ejecución real verificada</span>}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink/80">{agent.description}</p>
        <p className="mt-1 text-xs italic text-muted">“{agent.personality}”</p>

        <Section title="Tarea actual">
          {data.currentTask ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{data.currentTask.title}</span>
              <span className="shrink-0 text-xs text-muted">{TASK_STATUS_LABEL[data.currentTask.status]}</span>
            </div>
          ) : <p className="text-sm text-muted">Sin tarea asignada.</p>}
          {runnable && (
            <ActionForm action={runTaskAction} hidden={{ $id: runnable.id }} className="mt-2">
              <SubmitButton pendingText={`${agent.name} trabajando…`}>▶ Ejecutar “{runnable.title.slice(0, 32)}”</SubmitButton>
            </ActionForm>
          )}
        </Section>

        <Section title={`Tareas pendientes (${data.pendingTasks.length})`}>
          {data.pendingTasks.length ? (
            <ul className="space-y-1 text-sm">{data.pendingTasks.map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.title}</span><span className="text-xs text-muted">{TASK_STATUS_LABEL[t.status]}</span></li>)}</ul>
          ) : <p className="text-sm text-muted">Nada pendiente.</p>}
        </Section>

        <Section title="Últimas ejecuciones">
          {data.recentRuns.length ? (
            <ul className="space-y-1 text-xs">
              {data.recentRuns.map((r) => (
                <li key={r.id} className="flex justify-between gap-2">
                  <span className={r.status === "succeeded" ? "text-green-400" : r.status === "failed" || r.status === "refused" ? "text-red-400" : "text-orange-400"}>{r.kind === "plan" ? "Plan" : "Tarea"} · {r.status}</span>
                  <span className="text-muted">{r.input_tokens + r.output_tokens} tok · {usd(r.cost_usd, 4)} · {timeAgo(r.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Sin ejecuciones reales todavía.</p>}
        </Section>

        <Section title="Herramientas permitidas">
          <div className="flex flex-wrap gap-1.5">{agent.tools.map((t) => <span key={t} className="rounded-md border border-line bg-black/20 px-2 py-0.5 text-[11px]">{TOOL_LABELS[t]}</span>)}</div>
        </Section>

        <Section title="Costes">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-black/20 p-2"><div className="text-base font-bold">{usd(data.totalCostUsd)}</div><div className="text-muted">acumulado</div></div>
            <div className="rounded-lg bg-black/20 p-2"><div className="text-base font-bold">{data.runsToday}/{data.maxRunsPerDay}</div><div className="text-muted">ejecuciones hoy</div></div>
            <div className="rounded-lg bg-black/20 p-2"><div className="truncate text-[11px] font-bold">{data.model}</div><div className="text-muted">modelo</div></div>
          </div>
        </Section>

        <Section title="Historial">
          {data.history.length ? (
            <ul className="space-y-1 text-xs">{data.history.map((h) => <li key={h.id} className="flex justify-between gap-2"><span className={h.level === "error" ? "text-red-400" : ""}>{h.action}</span><span className="shrink-0 text-muted">{timeAgo(h.created_at)}</span></li>)}</ul>
          ) : <p className="text-sm text-muted">Sin actividad registrada.</p>}
        </Section>

        <Section title="Asignar tarea">
          <AssignTaskForm agentId={agent.id} leads={leads} projects={projects} compact />
        </Section>

        <Link href={`/agentes/${agent.id}`} className="mt-4 block text-center text-sm text-brand hover:underline">Abrir perfil completo →</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-line bg-black/15 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}
