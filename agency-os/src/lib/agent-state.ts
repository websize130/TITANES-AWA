import type { AgentId, AgentRunRow, AgentRow, TaskRow } from "./types";

export type VisualState = "disponible" | "trabajando" | "pensando" | "aprobacion" | "error" | "completado" | "desactivado";

export const STATE_META: Record<VisualState, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#9ca3af" },
  trabajando: { label: "Trabajando", color: "#f97316" },
  pensando: { label: "Pensando", color: "#a855f7" },
  aprobacion: { label: "Pendiente de aprobación", color: "#eab308" },
  error: { label: "Error", color: "#ef4444" },
  completado: { label: "Completado", color: "#22c55e" },
  desactivado: { label: "Desactivado", color: "#4b5563" },
};

const STALE_RUN_MS = 10 * 60_000;
const RECENT_DONE_MS = 60 * 60_000;

export interface AgentLiveState {
  state: VisualState;
  currentTask: TaskRow | null;
  pendingTasks: TaskRow[];
  lastRun: AgentRunRow | null;
}

/**
 * Estado visual derivado SOLO de datos reales (ejecuciones y tareas). Sin ejecuciones, el agente está "Disponible".
 */
export function deriveAgentState(agentId: AgentId, row: AgentRow | undefined, runs: AgentRunRow[], tasks: TaskRow[], now = Date.now()): AgentLiveState {
  const mine = runs.filter((r) => r.agent_id === agentId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const lastRun = mine[0] ?? null;
  const myTasks = tasks.filter((t) => t.agent_id === agentId);
  const pendingTasks = myTasks.filter((t) => t.status === "pendiente" || t.status === "pendiente_aprobacion");
  const running = myTasks.find((t) => t.status === "en_curso") ?? null;

  let state: VisualState = "disponible";
  if (row && !row.enabled) state = "desactivado";
  else if (lastRun && (lastRun.status === "thinking" || lastRun.status === "running") && now - Date.parse(lastRun.created_at) < STALE_RUN_MS)
    state = lastRun.status === "thinking" ? "pensando" : "trabajando";
  else if (myTasks.some((t) => t.status === "pendiente_aprobacion")) state = "aprobacion";
  else if (lastRun && (lastRun.status === "failed" || lastRun.status === "refused")) state = "error";
  else if (lastRun && lastRun.status === "succeeded" && now - Date.parse(lastRun.finished_at ?? lastRun.created_at) < RECENT_DONE_MS) state = "completado";

  return { state, currentTask: running ?? pendingTasks[0] ?? null, pendingTasks, lastRun };
}
