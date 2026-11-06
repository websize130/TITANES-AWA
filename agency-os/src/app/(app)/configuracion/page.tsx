import { requireSession } from "@/lib/db";
import { config, n8nConfigured, productionIssues, supabaseConfigured, usingInsecureDefaults } from "@/lib/config";
import { Card, PageHeader } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { resetDemo } from "@/app/actions";

export const metadata = { title: "Configuración" };

function Row({ label, ok, detail }: { label: string; ok: boolean | "warn"; detail: string }) {
  const c = ok === true ? "text-green-400" : ok === "warn" ? "text-yellow-400" : "text-red-400";
  return (
    <li className="flex items-start justify-between gap-4 border-t border-line py-2.5 first:border-0">
      <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted">{detail}</div></div>
      <span className={`shrink-0 text-xs font-semibold ${c}`}>{ok === true ? "● Conectado" : ok === "warn" ? "● Atención" : "● No configurado"}</span>
    </li>
  );
}

export default async function ConfiguracionPage() {
  const { store } = await requireSession();
  const issues = productionIssues();
  return (
    <div className="space-y-5">
      <PageHeader title="Configuración" subtitle="Estado real de integraciones, seguridad y límites. Los secretos solo se leen de variables de entorno del servidor." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Integraciones">
          <ul>
            <Row label="Claude API" ok={config.anthropicKeyPresent} detail={config.anthropicKeyPresent ? `Modelo por defecto ${config.claudeModel}. Agentes operativos.` : "Falta ANTHROPIC_API_KEY: agentes configurados, no operativos."} />
            <Row label="Base de datos" ok={store.kind === "supabase" ? true : "warn"} detail={store.kind === "supabase" ? "Supabase con RLS por usuario." : "Almacén local JSON (.data/) con datos demo. Usa Supabase para producción."} />
            <Row label="Supabase" ok={supabaseConfigured()} detail={supabaseConfigured() ? config.supabaseUrl : "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY no definidas."} />
            <Row label="n8n" ok={n8nConfigured()} detail={n8nConfigured() ? config.n8nBaseUrl : "Define N8N_BASE_URL y N8N_WEBHOOK_SECRET (≥16 caracteres)."} />
            <Row label="Webhooks entrantes (Supabase)" ok={store.kind === "local" ? "warn" : Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.N8N_OWNER_ID)} detail="En modo Supabase requieren SUPABASE_SERVICE_ROLE_KEY y N8N_OWNER_ID (solo servidor)." />
          </ul>
        </Card>
        <Card title="Seguridad">
          <ul>
            <Row label="Entorno" ok={config.appEnv === "production" ? (issues.length ? false : true) : "warn"} detail={config.appEnv === "production" ? (issues.join(" ") || "Producción con controles activos.") : "Desarrollo: n8n usa /webhook-test y se permite el almacén local."} />
            <Row label="Credenciales de acceso" ok={store.kind === "supabase" || !usingInsecureDefaults()} detail={store.kind === "supabase" ? "Supabase Auth." : usingInsecureDefaults() ? "Usando contraseña/secret por defecto: define AGENCY_OS_PASSWORD y AUTH_SECRET." : "Contraseña y secreto de sesión definidos."} />
            <Row label="Permisos por agente" ok detail="Cada agente solo tiene herramientas internas no sensibles; lo sensible genera aprobaciones." />
            <Row label="Registro de actividad" ok detail="Todas las acciones de usuario, agentes y n8n quedan en activity_logs." />
            <Row label="Cabeceras HTTP" ok detail="X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy." />
          </ul>
        </Card>
        <Card title="Límites de ejecución">
          <ul className="space-y-1 text-sm">
            <li>Ejecuciones de agentes por día (global): <b>{config.maxRunsPerDay}</b></li>
            <li>Presupuesto diario de IA: <b>{config.dailyBudgetUsd} USD</b></li>
            <li>Máximo de tareas por plan de EMINEM: <b>{config.maxPlanTasks}</b></li>
            <li>Una ejecución simultánea por agente · límite diario por agente editable en su perfil</li>
          </ul>
        </Card>
        {store.kind === "local" && config.appEnv !== "production" && (
          <Card title="Datos de demostración">
            <p className="mb-3 text-sm text-muted">Restablece el almacén local a los datos semilla (borra leads, tareas, ejecuciones y registros locales).</p>
            <ActionButton variant="danger" onAction={resetDemo} confirm="¿Restablecer todos los datos locales?">Restablecer datos demo</ActionButton>
          </Card>
        )}
      </div>
    </div>
  );
}
