"use client";

import { AGENTS } from "@/lib/agents";
import { createTask } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";

export function AssignTaskForm({ agentId, leads, projects, compact }: { agentId?: string; leads: { id: string; business_name: string }[]; projects: { id: string; name: string }[]; compact?: boolean }) {
  return (
    <ActionForm action={createTask} resetOnSuccess className="space-y-2" hidden={agentId ? { agent_id: agentId } : undefined}>
      <input name="title" required minLength={3} maxLength={200} placeholder="Título de la tarea" className="input" />
      <textarea name="description" rows={compact ? 2 : 3} maxLength={4000} placeholder="Instrucciones concretas y resultado esperado" className="input" />
      <div className="grid grid-cols-2 gap-2">
        {!agentId && (
          <select name="agent_id" className="input" required defaultValue="">
            <option value="" disabled>Agente…</option>
            {AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name} — {a.department}</option>)}
          </select>
        )}
        <select name="priority" className="input" defaultValue="media">
          <option value="baja">Prioridad baja</option><option value="media">Prioridad media</option><option value="alta">Prioridad alta</option><option value="urgente">Urgente</option>
        </select>
        <select name="lead_id" className="input" defaultValue="">
          <option value="">Sin lead</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
        </select>
        <select name="project_id" className="input" defaultValue="">
          <option value="">Sin proyecto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <SubmitButton pendingText="Asignando…">Asignar tarea</SubmitButton>
    </ActionForm>
  );
}
