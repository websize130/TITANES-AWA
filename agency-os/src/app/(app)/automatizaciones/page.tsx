import { requireSession } from "@/lib/db";
import { getAgent } from "@/lib/agents";
import { config, n8nConfigured } from "@/lib/config";
import { timeAgo } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { AgentAvatar } from "@/components/PixelSprite";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { requestWorkflowRun, toggleWorkflow } from "@/app/actions";

export const metadata = { title: "Automatizaciones" };

export default async function AutomatizacionesPage() {
  const { store } = await requireSession();
  const workflows = await store.list("workflows", { order: { column: "category", ascending: true } });
  const ready = n8nConfigured();
  return (
    <div>
      <PageHeader title="Automatizaciones n8n" subtitle="Webhooks firmados con HMAC-SHA256, anti-replay de 5 min, idempotency key y reintentos con backoff. Los flujos sensibles exigen aprobación." />
      <div className="mb-4">
        {ready
          ? <Notice tone="ok">n8n configurado en <code>{config.n8nBaseUrl}</code> · entorno {config.appEnv === "production" ? "producción (/webhook)" : "desarrollo (/webhook-test)"}.</Notice>
          : <Notice tone="warn">n8n <b>no conectado</b>: define N8N_BASE_URL y N8N_WEBHOOK_SECRET. Puedes descargar e importar las plantillas ya; los botones de ejecución devolverán error hasta configurarlo.</Notice>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {workflows.map((w) => (
          <div key={w.id} className={`panel p-4 ${w.enabled ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <AgentAvatar agentId={w.owner_agent} size={36} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{w.name}</div>
                <div className="text-[11px] text-muted">{w.category} · responsable {getAgent(w.owner_agent)?.name}</div>
              </div>
              {w.sensitive && <Badge color="#eab308" label="Requiere aprobación" />}
            </div>
            <p className="mt-2 text-xs text-ink/75">{w.description}</p>
            <div className="mt-2 text-[11px] text-muted">Webhook: <code>/{w.webhook_path}</code> · {w.run_count} ejecuciones · último: {w.last_status ?? "—"} {w.last_run_at ? `(${timeAgo(w.last_run_at)})` : ""}</div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-brand">{w.sensitive ? "Solicitar ejecución" : "Ejecutar"}</summary>
              <ActionForm action={requestWorkflowRun} hidden={{ $id: w.id }} className="mt-2 space-y-2">
                <textarea name="input" rows={3} placeholder='Entrada JSON opcional, p. ej. {"lead_id":"…"}' className="input font-mono text-xs" />
                <SubmitButton pendingText="Enviando…">{w.sensitive ? "Solicitar aprobación" : "Disparar webhook"}</SubmitButton>
              </ActionForm>
            </details>
            <div className="mt-3 flex gap-2">
              <a href={`/api/n8n/workflows/${w.id}`} className="btn btn-ghost !py-1 text-xs" download>⬇ Plantilla n8n (JSON)</a>
              <ActionButton className="!py-1 text-xs" onAction={toggleWorkflow.bind(null, w.id)}>{w.enabled ? "Desactivar" : "Activar"}</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
