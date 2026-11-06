import "server-only";

// Configuración leída de variables de entorno. Nunca se envía al cliente salvo los indicadores booleanos.

const DEV_AUTH_SECRET = "dev-only-insecure-secret-change-me-0000000000";
const DEV_PASSWORD = "agencyos";

export const config = {
  appEnv: (process.env.APP_ENV === "production" ? "production" : "development") as "production" | "development",
  dataBackend: (process.env.DATA_BACKEND === "supabase" ? "supabase" : "local") as "supabase" | "local",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  anthropicKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY),
  claudeModel: process.env.CLAUDE_MODEL || "claude-opus-5-5",
  maxRunsPerDay: Number(process.env.MAX_AGENT_RUNS_PER_DAY || 40),
  dailyBudgetUsd: Number(process.env.DAILY_AI_BUDGET_USD || 5),
  maxPlanTasks: Math.min(Number(process.env.MAX_PLAN_TASKS || 8), 12),
  n8nBaseUrl: (process.env.N8N_BASE_URL ?? "").replace(/\/$/, ""),
  n8nSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
};

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (config.appEnv === "production") throw new Error("AUTH_SECRET (≥32 caracteres) es obligatorio en producción.");
  return DEV_AUTH_SECRET;
}

export function localPassword(): string {
  const p = process.env.AGENCY_OS_PASSWORD;
  if (p) return p;
  if (config.appEnv === "production") throw new Error("AGENCY_OS_PASSWORD es obligatorio en producción.");
  return DEV_PASSWORD;
}

export function usingInsecureDefaults(): boolean {
  return !process.env.AGENCY_OS_PASSWORD || !process.env.AUTH_SECRET || (process.env.AUTH_SECRET?.length ?? 0) < 32;
}

export function supabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}

export function n8nConfigured(): boolean {
  return Boolean(config.n8nBaseUrl && config.n8nSecret.length >= 16);
}

/** Problemas de configuración que bloquean producción. */
export function productionIssues(): string[] {
  const issues: string[] = [];
  if (config.appEnv !== "production") return issues;
  if (config.dataBackend !== "supabase") issues.push("En producción DATA_BACKEND debe ser 'supabase'.");
  if (!supabaseConfigured()) issues.push("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) issues.push("AUTH_SECRET débil o ausente.");
  return issues;
}
