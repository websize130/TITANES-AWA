// Tipos de dominio de AGENCY OS. Deben coincidir con supabase/migrations/0001_init.sql.

export type AgentId =
  | "eminem"
  | "fifty-cent"
  | "tupac"
  | "canserbero"
  | "nas"
  | "biggie"
  | "ice-cube";

export type Actor = AgentId | "usuario" | "sistema" | "n8n";

export interface Base {
  id: string;
  created_at: string;
}

export interface AgentRow extends Base {
  id: AgentId;
  enabled: boolean;
  model: string | null;
  instructions_override: string | null;
  max_runs_per_day: number;
}

export type TaskStatus =
  | "pendiente"
  | "en_curso"
  | "pendiente_aprobacion"
  | "completada"
  | "error"
  | "cancelada";
export type Priority = "baja" | "media" | "alta" | "urgente";

export interface TaskResult {
  summary: string;
  deliverable_markdown: string;
  verified_facts: string[];
  hypotheses: string[];
  next_steps: string[];
  qa_verdict: "aprobado" | "rechazado" | "no_aplica";
}

export interface TaskRow extends Base {
  title: string;
  description: string;
  agent_id: AgentId;
  status: TaskStatus;
  priority: Priority;
  plan_id: string | null;
  depends_on: string[];
  lead_id: string | null;
  client_id: string | null;
  project_id: string | null;
  result: TaskResult | null;
  error: string | null;
  created_by: Actor;
  updated_at: string;
}

export type RunStatus = "thinking" | "running" | "succeeded" | "failed" | "refused";

export interface AgentRunRow extends Base {
  agent_id: AgentId;
  task_id: string | null;
  kind: "plan" | "task";
  status: RunStatus;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  error: string | null;
  finished_at: string | null;
}

export type LeadStatus =
  | "nuevo"
  | "investigando"
  | "auditado"
  | "contactado"
  | "propuesta"
  | "negociacion"
  | "ganado"
  | "perdido";

export interface LeadRow extends Base {
  business_name: string;
  sector: string;
  city: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  status: LeadStatus;
  priority: "alta" | "media" | "baja";
  source: string | null;
  notes: string | null;
  estimated_value: number | null;
  client_id: string | null;
  is_demo: boolean;
  updated_at: string;
}

export interface ClientRow extends Base {
  name: string;
  sector: string;
  city: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  contact_name: string | null;
  lead_id: string | null;
  status: "onboarding" | "activo" | "mantenimiento" | "inactivo";
  notes: string | null;
  is_demo: boolean;
}

export interface AuditFinding {
  area: string;
  severity: "alta" | "media" | "baja";
  finding: string;
  verified: boolean;
}

export interface AuditRow extends Base {
  lead_id: string;
  url: string | null;
  score: number | null;
  summary: string;
  findings: AuditFinding[];
  author: Actor;
}

export interface ProposalItem {
  service_id: string;
  name: string;
  price: number;
  cost: number;
}

export type ProposalStatus =
  | "borrador"
  | "pendiente_aprobacion"
  | "aprobada"
  | "enviada"
  | "aceptada"
  | "rechazada";

export interface ProposalRow extends Base {
  lead_id: string | null;
  client_id: string | null;
  title: string;
  items: ProposalItem[];
  total: number;
  cost_total: number;
  status: ProposalStatus;
  notes: string | null;
  created_by: Actor;
  is_demo: boolean;
}

export type ProjectStatus =
  | "planificacion"
  | "diseno"
  | "desarrollo"
  | "qa"
  | "entregado"
  | "mantenimiento";

export interface ProjectRow extends Base {
  client_id: string | null;
  name: string;
  service: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  paid: number;
  due_date: string | null;
  qa_passed: boolean;
  is_demo: boolean;
}

export interface WorkflowRow extends Base {
  name: string;
  description: string;
  category: string;
  webhook_path: string;
  sensitive: boolean;
  enabled: boolean;
  owner_agent: AgentId;
  last_run_at: string | null;
  last_status: "ok" | "error" | "pendiente" | null;
  run_count: number;
}

export type ApprovalType =
  | "enviar_mensaje"
  | "enviar_propuesta"
  | "publicar_web"
  | "pago"
  | "produccion"
  | "ejecutar_workflow"
  | "accion_agente";

export interface ApprovalRow extends Base {
  type: ApprovalType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  requested_by: Actor;
  status: "pendiente" | "aprobada" | "rechazada" | "ejecutada";
  related_table: string | null;
  related_id: string | null;
  decided_at: string | null;
  decided_note: string | null;
}

export interface ActivityRow extends Base {
  actor: Actor;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  level: "info" | "warn" | "error";
}

export interface ServiceRow extends Base {
  name: string;
  description: string;
  price_min: number;
  price_max: number | null;
  cost: number;
  deliverables: string[];
  active: boolean;
  sort: number;
}

export interface Tables {
  agents: AgentRow;
  tasks: TaskRow;
  agent_runs: AgentRunRow;
  leads: LeadRow;
  clients: ClientRow;
  audits: AuditRow;
  proposals: ProposalRow;
  projects: ProjectRow;
  workflows: WorkflowRow;
  approvals: ApprovalRow;
  activity_logs: ActivityRow;
  services: ServiceRow;
}

export type TableName = keyof Tables;
