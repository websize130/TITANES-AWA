import "server-only";
import { AGENTS } from "./agents";
import { deriveAgentState, type VisualState } from "./agent-state";
import { config } from "./config";
import type { Store } from "./db/store";
import type { AgentId, AgentRunRow, TaskRow } from "./types";

export interface AgentCardData {
  id: AgentId;
  enabled: boolean;
  model: string;
  maxRunsPerDay: number;
  instructionsOverride: string | null;
  state: VisualState;
  operational: boolean;
  verified: boolean;
  currentTask: Pick<TaskRow, "id" | "title" | "status"> | null;
  pendingTasks: Pick<TaskRow, "id" | "title" | "status" | "priority">[];
  recentRuns: Pick<AgentRunRow, "id" | "status" | "kind" | "created_at" | "cost_usd" | "input_tokens" | "output_tokens" | "error" | "model">[];
  history: { id: string; action: string; created_at: string; level: string }[];
  totalCostUsd: number;
  runsToday: number;
}

export async function loadAgentsData(store: Store): Promise<AgentCardData[]> {
  const [rows, runs, tasks, logs] = await Promise.all([
    store.list("agents"),
    store.list("agent_runs", { limit: 500 }),
    store.list("tasks", { limit: 500 }),
    store.list("activity_logs", { limit: 300 }),
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return AGENTS.map((a) => {
    const row = rows.find((r) => r.id === a.id);
    const live = deriveAgentState(a.id, row, runs, tasks);
    const mine = runs.filter((r) => r.agent_id === a.id);
    return {
      id: a.id,
      enabled: row?.enabled ?? false,
      model: row?.model || config.claudeModel,
      maxRunsPerDay: row?.max_runs_per_day ?? 0,
      instructionsOverride: row?.instructions_override ?? null,
      state: live.state,
      operational: config.anthropicKeyPresent && (row?.enabled ?? false),
      verified: mine.some((r) => r.status === "succeeded"),
      currentTask: live.currentTask ? { id: live.currentTask.id, title: live.currentTask.title, status: live.currentTask.status } : null,
      pendingTasks: live.pendingTasks.slice(0, 8).map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
      recentRuns: mine.slice(0, 8).map((r) => ({ id: r.id, status: r.status, kind: r.kind, created_at: r.created_at, cost_usd: Number(r.cost_usd), input_tokens: r.input_tokens, output_tokens: r.output_tokens, error: r.error, model: r.model })),
      history: logs.filter((l) => l.actor === a.id).slice(0, 10).map((l) => ({ id: l.id, action: l.action, created_at: l.created_at, level: l.level })),
      totalCostUsd: mine.reduce((s, r) => s + Number(r.cost_usd || 0), 0),
      runsToday: mine.filter((r) => Date.parse(r.created_at) >= today.getTime()).length,
    };
  });
}
