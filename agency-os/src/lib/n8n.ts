import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config, n8nConfigured } from "./config";
import type { WorkflowRow } from "./types";

export const SIGNATURE_HEADER = "x-agency-signature";
export const TIMESTAMP_HEADER = "x-agency-timestamp";
const MAX_SKEW_S = 300;

export function sign(body: string, ts: string, secret = config.n8nSecret): string {
  return createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
}

/** Verifica firma HMAC y ventana temporal (anti-replay). */
export function verifySignature(body: string, ts: string | null, signature: string | null): boolean {
  if (!n8nConfigured() || !ts || !signature) return false;
  const t = Number(ts);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > MAX_SKEW_S) return false;
  const expected = Buffer.from(sign(body, ts), "hex");
  const got = Buffer.from(signature, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export function webhookUrl(wf: WorkflowRow): string {
  // En desarrollo se usa la URL de prueba de n8n; en producción la de producción.
  const segment = config.appEnv === "production" ? "webhook" : "webhook-test";
  return `${config.n8nBaseUrl}/${segment}/${wf.webhook_path}`;
}

/** Dispara un workflow con firma, idempotency key, timeout y reintentos con backoff. */
export async function triggerWorkflow(wf: WorkflowRow, payload: Record<string, unknown>) {
  if (!n8nConfigured()) throw new Error("n8n no está configurado (N8N_BASE_URL y N8N_WEBHOOK_SECRET ≥16 caracteres).");
  const idempotencyKey = randomUUID();
  const body = JSON.stringify({ workflow: wf.id, idempotency_key: idempotencyKey, env: config.appEnv, payload, sent_at: new Date().toISOString() });
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ts = String(Math.floor(Date.now() / 1000));
    try {
      const res = await fetch(webhookUrl(wf), {
        method: "POST",
        headers: { "Content-Type": "application/json", [SIGNATURE_HEADER]: sign(body, ts), [TIMESTAMP_HEADER]: ts, "Idempotency-Key": idempotencyKey },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true as const, status: res.status, idempotencyKey };
      if (res.status < 500 && res.status !== 429) return { ok: false as const, status: res.status, idempotencyKey, error: await res.text().catch(() => "") };
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
  }
  return { ok: false as const, status: 0, idempotencyKey, error: String((lastErr as Error)?.message ?? lastErr) };
}

/** Plantilla importable en n8n: Webhook → verificación HMAC → lógica → callback firmado a AGENCY OS. */
export function workflowTemplate(wf: WorkflowRow, appUrl: string) {
  const verifyCode = `// Requiere NODE_FUNCTION_ALLOW_BUILTIN=crypto y la variable AGENCY_OS_SECRET en n8n.
const crypto = require('crypto');
const item = $input.first().json;
const headers = item.headers || {};
const ts = headers['x-agency-timestamp'];
const sig = headers['x-agency-signature'] || '';
const body = JSON.stringify(item.body);
const expected = crypto.createHmac('sha256', $env.AGENCY_OS_SECRET).update(ts + '.' + body).digest('hex');
const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
const valid = fresh && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
return [{ json: { valid, body: item.body } }];`;

  const callbackCode = `// Firma el resultado y lo prepara para AGENCY OS.
const crypto = require('crypto');
const src = $('Verificar firma').first().json.body;
const body = JSON.stringify({ event: 'workflow.result', workflow: '${wf.id}', idempotency_key: src.idempotency_key, status: 'ok', data: $input.first().json });
const ts = String(Math.floor(Date.now() / 1000));
const signature = crypto.createHmac('sha256', $env.AGENCY_OS_SECRET).update(ts + '.' + body).digest('hex');
return [{ json: { body, ts, signature } }];`;

  return {
    name: `AGENCY OS — ${wf.name}`,
    nodes: [
      { id: "webhook", name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 0], parameters: { httpMethod: "POST", path: wf.webhook_path, responseMode: "responseNode", options: {} } },
      { id: "verify", name: "Verificar firma", type: "n8n-nodes-base.code", typeVersion: 2, position: [220, 0], parameters: { jsCode: verifyCode } },
      { id: "if", name: "¿Firma válida?", type: "n8n-nodes-base.if", typeVersion: 2, position: [440, 0], parameters: { conditions: { options: { caseSensitive: true, typeValidation: "strict" }, conditions: [{ leftValue: "={{ $json.valid }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } }], combinator: "and" } } },
      { id: "logic", name: `Lógica: ${wf.name}`, type: "n8n-nodes-base.noOp", typeVersion: 1, position: [660, -100], parameters: {}, notes: `Sustituye este nodo por la lógica real: ${wf.description}` },
      { id: "sign", name: "Firmar resultado", type: "n8n-nodes-base.code", typeVersion: 2, position: [880, -100], parameters: { jsCode: callbackCode } },
      { id: "callback", name: "Callback AGENCY OS", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [1100, -100], parameters: { method: "POST", url: `${appUrl}/api/webhooks/n8n`, sendHeaders: true, headerParameters: { parameters: [ { name: "Content-Type", value: "application/json" }, { name: "x-agency-timestamp", value: "={{ $json.ts }}" }, { name: "x-agency-signature", value: "={{ $json.signature }}" } ] }, sendBody: true, contentType: "raw", rawContentType: "application/json", body: "={{ $json.body }}", options: { retry: { maxTries: 3 } } } },
      { id: "ok", name: "Responder 202", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [1320, -100], parameters: { respondWith: "json", responseBody: '={"accepted": true}', options: { responseCode: 202 } } },
      { id: "deny", name: "Responder 401", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: [660, 120], parameters: { respondWith: "json", responseBody: '={"error": "firma inválida"}', options: { responseCode: 401 } } },
    ],
    connections: {
      Webhook: { main: [[{ node: "Verificar firma", type: "main", index: 0 }]] },
      "Verificar firma": { main: [[{ node: "¿Firma válida?", type: "main", index: 0 }]] },
      "¿Firma válida?": { main: [[{ node: `Lógica: ${wf.name}`, type: "main", index: 0 }], [{ node: "Responder 401", type: "main", index: 0 }]] },
      [`Lógica: ${wf.name}`]: { main: [[{ node: "Firmar resultado", type: "main", index: 0 }]] },
      "Firmar resultado": { main: [[{ node: "Callback AGENCY OS", type: "main", index: 0 }]] },
      "Callback AGENCY OS": { main: [[{ node: "Responder 202", type: "main", index: 0 }]] },
    },
    settings: { executionOrder: "v1" },
    meta: { templateCredsSetupCompleted: false, agencyOs: { workflow: wf.id, sensitive: wf.sensitive } },
  };
}
