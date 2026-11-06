import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { config } from "./config";

// Precios por millón de tokens (USD) — tarifa estándar de la API de Anthropic.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export const SUPPORTED_MODELS = Object.keys(PRICING);

export function costUsd(model: string, input: number, output: number): number {
  const p = PRICING[model] ?? PRICING["claude-opus-5-5"];
  return (input * p.input + output * p.output) / 1_000_000;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!config.anthropicKeyPresent) throw new ClaudeNotConfiguredError();
  client ??= new Anthropic({ maxRetries: 2, timeout: 5 * 60_000 });
  return client;
}

export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY no configurada: los agentes están configurados pero no operativos.");
  }
}

export class ClaudeRefusalError extends Error {}

export interface ClaudeCallResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Llamada única y acotada a Claude con salida estructurada validada por Zod.
 * Fallback de servidor activado ("default") para reintentar en otro modelo si el primero declina por política.
 */
export async function callClaudeStructured<S extends z.ZodType>(opts: {
  model: string;
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<ClaudeCallResult<z.infer<S>>> {
  const response = await anthropic().beta.messages.parse({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
  });

  const inputTokens = response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
  const outputTokens = response.usage.output_tokens;
  const cost = costUsd(opts.model, inputTokens, outputTokens);

  if (response.stop_reason === "refusal") {
    throw Object.assign(new ClaudeRefusalError(`El modelo declinó la petición (${response.stop_details?.category ?? "sin categoría"}).`), {
      inputTokens, outputTokens, cost,
    });
  }
  if (response.stop_reason === "max_tokens") {
    throw Object.assign(new Error("Respuesta truncada por max_tokens."), { inputTokens, outputTokens, cost });
  }
  if (!response.parsed_output) {
    throw Object.assign(new Error("La respuesta no cumple el esquema esperado."), { inputTokens, outputTokens, cost });
  }
  return { data: response.parsed_output as z.infer<S>, model: response.model, inputTokens, outputTokens, costUsd: cost };
}

// ───────── Esquemas de salida ─────────

export const SENSITIVE_TYPES = ["enviar_mensaje", "enviar_propuesta", "publicar_web", "pago", "produccion", "ejecutar_workflow"] as const;

export const TaskOutputSchema = z.object({
  summary: z.string().describe("Resumen ejecutivo en 1-3 frases."),
  deliverable_markdown: z.string().describe("Entregable completo en Markdown."),
  verified_facts: z.array(z.string()).describe("Solo hechos presentes en el contexto aportado."),
  hypotheses: z.array(z.string()).describe("Suposiciones pendientes de verificar."),
  next_steps: z.array(z.string()),
  qa_verdict: z.enum(["aprobado", "rechazado", "no_aplica"]).describe("Solo ICE CUBE emite aprobado/rechazado; el resto no_aplica."),
  audit_score: z.number().int().min(0).max(100).nullable().describe("Solo TUPAC en auditorías: puntuación de oportunidad 0-100; si no, null."),
  audit_findings: z
    .array(z.object({ area: z.string(), severity: z.enum(["alta", "media", "baja"]), finding: z.string(), verified: z.boolean() }))
    .describe("Solo TUPAC en auditorías; si no, lista vacía."),
  proposal_items: z
    .array(z.object({ service_id: z.string(), price: z.number() }))
    .describe("Solo 50 CENT al preparar presupuesto: servicios del catálogo (id) y precio; si no, lista vacía."),
  sensitive_actions: z
    .array(z.object({ type: z.enum(SENSITIVE_TYPES), title: z.string(), description: z.string() }))
    .describe("Acciones sensibles que requieren aprobación del fundador. No se ejecutan automáticamente."),
});
export type TaskOutput = z.infer<typeof TaskOutputSchema>;

export const PlanSchema = z.object({
  summary: z.string().describe("Cómo vas a abordar la instrucción."),
  tasks: z
    .array(
      z.object({
        agent_id: z.enum(["fifty-cent", "tupac", "canserbero", "nas", "biggie", "ice-cube"]),
        title: z.string(),
        description: z.string().describe("Instrucción concreta y verificable para el agente."),
        priority: z.enum(["baja", "media", "alta", "urgente"]),
        depends_on: z.array(z.number().int()).describe("Índices (0-based) de tareas previas de este plan de las que depende."),
        requires_approval: z.boolean().describe("true si ejecutar la tarea implica gasto o riesgo relevante y debe aprobarla el fundador antes."),
      }),
    )
    .describe("Mínimo número de tareas necesario."),
});
export type PlanOutput = z.infer<typeof PlanSchema>;
