import { AGENTS } from "../agents";
import type { Tables, TableName, WorkflowRow, ServiceRow } from "../types";

type Seed<T extends TableName> = Omit<Tables[T], "id" | "created_at"> & { id?: string };

/** Datos base (no demo): catálogo de servicios, agentes y workflows. Se crean también en Supabase. */
export const BASE_SERVICES: (Seed<"services"> & { id: string })[] = [
  { id: "web-basica", name: "Web Básica", description: "Web corporativa de una página, móvil primero.", price_min: 200, price_max: null, cost: 40, deliverables: ["Landing de 1 página", "Formulario de contacto", "Botones de llamada y WhatsApp", "SEO local básico"], active: true, sort: 1 },
  { id: "web-pro", name: "Web Pro", description: "Web multipágina optimizada para conversión.", price_min: 350, price_max: null, cost: 80, deliverables: ["Hasta 5 páginas", "SEO local", "Google Business enlazado", "Analítica"], active: true, sort: 2 },
  { id: "web-elite-3d", name: "Web Élite / 3D", description: "Web premium con animaciones y elementos 3D.", price_min: 699, price_max: null, cost: 180, deliverables: ["Diseño a medida", "Animaciones/3D", "Optimización de rendimiento", "SEO avanzado"], active: true, sort: 3 },
  { id: "voz-ia", name: "Automatización de voz", description: "Agente de voz IA para llamadas y citas.", price_min: 400, price_max: 500, cost: 120, deliverables: ["Agente de voz configurado", "Guion y base de conocimiento", "Derivación a humano"], active: true, sort: 4 },
  { id: "reservas", name: "Sistema de reservas", description: "Reservas y citas online con recordatorios.", price_min: 250, price_max: null, cost: 50, deliverables: ["Calendario de reservas", "Confirmaciones", "Recordatorios"], active: true, sort: 5 },
  { id: "dashboard", name: "Dashboard", description: "Panel de control con métricas del negocio.", price_min: 600, price_max: 900, cost: 150, deliverables: ["KPIs a medida", "Conexión a fuentes de datos", "Acceso por roles"], active: true, sort: 6 },
  { id: "crm", name: "CRM personalizado", description: "CRM a medida con automatizaciones.", price_min: 900, price_max: 1500, cost: 300, deliverables: ["Modelo de datos a medida", "Pipeline comercial", "Automatizaciones", "Formación"], active: true, sort: 7 },
];

export const BASE_WORKFLOWS: (Seed<"workflows"> & { id: string })[] = (
  [
    ["captacion", "Captación de negocios", "Captación", "biggie", false, "Recibe listados de negocios (formularios, scraping autorizado, CSV) y los envía a AGENCY OS."],
    ["investigacion", "Investigación comercial", "Investigación", "tupac", false, "Enriquece un lead con datos públicos y devuelve hallazgos a AGENCY OS."],
    ["auditoria-web", "Auditoría web", "Investigación", "tupac", false, "Ejecuta comprobaciones técnicas de una URL (estado HTTP, SSL, tiempos) y devuelve el resultado."],
    ["registro-leads", "Registro automático de leads", "Captación", "biggie", false, "Formulario web → lead en AGENCY OS con deduplicación por web/email."],
    ["propuestas", "Preparación y envío de propuestas", "Ventas", "fifty-cent", true, "Genera el PDF de la propuesta aprobada y la envía al cliente. Requiere aprobación."],
    ["seguimiento", "Seguimiento comercial", "Ventas", "fifty-cent", true, "Envía recordatorios de seguimiento por email/WhatsApp. Requiere aprobación."],
    ["onboarding", "Onboarding de clientes", "Clientes", "biggie", true, "Envía bienvenida, cuestionario y accesos al nuevo cliente. Requiere aprobación."],
    ["creacion-proyectos", "Creación de proyectos", "Producción", "eminem", false, "Crea carpetas, repositorio y tablero del proyecto y avisa a AGENCY OS."],
    ["asignacion-tareas", "Asignación de tareas", "Producción", "eminem", false, "Sincroniza tareas de AGENCY OS con herramientas externas."],
    ["produccion", "Producción y despliegue", "Producción", "canserbero", true, "Despliega una web a producción. Requiere aprobación y QA superado."],
    ["control-calidad", "Control de calidad", "Calidad", "ice-cube", false, "Ejecuta comprobaciones (Lighthouse, enlaces rotos, formularios) y devuelve el informe."],
    ["mantenimiento", "Mantenimiento", "Clientes", "biggie", false, "Revisiones periódicas: copias, uptime, certificados y actualizaciones."],
  ] as const
).map(([id, name, category, owner, sensitive, description]) => ({
  id,
  name,
  category,
  description,
  owner_agent: owner,
  sensitive,
  webhook_path: `agency-os/${id}`,
  enabled: true,
  last_run_at: null,
  last_status: null,
  run_count: 0,
})) satisfies (Omit<WorkflowRow, "created_at">)[];

export const BASE_AGENTS: Seed<"agents">[] = AGENTS.map((a) => ({
  id: a.id,
  enabled: true,
  model: null,
  instructions_override: null,
  max_runs_per_day: 15,
}));

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();

/** Datos de demostración (solo almacén local). Marcados con is_demo. No incluyen ejecuciones de agentes. */
export function demoData(): Partial<{ [K in TableName]: Tables[K][] }> {
  const leads: Tables["leads"][] = [
    { id: "demo-lead-1", business_name: "Clínica Dental Sonrisas", sector: "Clínica dental", city: "Madrid", website: "https://example.com/clinica-sonrisas", phone: null, email: null, contact_name: null, status: "nuevo", priority: "alta", source: "Demo", notes: "Web antigua sin reservas online (dato demo).", estimated_value: 600, client_id: null, is_demo: true, created_at: ago(0.2), updated_at: ago(0.2) },
    { id: "demo-lead-2", business_name: "Peluquería Style", sector: "Peluquería", city: "Barcelona", website: null, phone: null, email: null, contact_name: null, status: "investigando", priority: "media", source: "Demo", notes: "Sin web; solo Instagram (dato demo).", estimated_value: 450, client_id: null, is_demo: true, created_at: ago(0.5), updated_at: ago(0.5) },
    { id: "demo-lead-3", business_name: "Reformas López", sector: "Reformas", city: "Valencia", website: "https://example.com/reformas-lopez", phone: null, email: null, contact_name: null, status: "propuesta", priority: "alta", source: "Demo", notes: null, estimated_value: 1050, client_id: null, is_demo: true, created_at: ago(1), updated_at: ago(1) },
    { id: "demo-lead-4", business_name: "Taller Mecánico Ruiz", sector: "Taller", city: "Sevilla", website: null, phone: null, email: null, contact_name: null, status: "contactado", priority: "baja", source: "Demo", notes: null, estimated_value: 250, client_id: null, is_demo: true, created_at: ago(30), updated_at: ago(30) },
    { id: "demo-lead-5", business_name: "Restaurante La Brasa", sector: "Restauración", city: "Málaga", website: "https://example.com/la-brasa", phone: null, email: null, contact_name: null, status: "ganado", priority: "media", source: "Demo", notes: null, estimated_value: 900, client_id: "demo-client-1", is_demo: true, created_at: ago(200), updated_at: ago(120) },
  ];
  const clients: Tables["clients"][] = [
    { id: "demo-client-1", name: "Restaurante La Brasa", sector: "Restauración", city: "Málaga", website: "https://example.com/la-brasa", email: null, phone: null, contact_name: null, lead_id: "demo-lead-5", status: "activo", notes: null, is_demo: true, created_at: ago(120) },
    { id: "demo-client-2", name: "Centro Estética Aura", sector: "Estética", city: "Bilbao", website: null, email: null, phone: null, contact_name: null, lead_id: null, status: "onboarding", notes: null, is_demo: true, created_at: ago(48) },
  ];
  const projects: Tables["projects"][] = [
    { id: "demo-project-1", client_id: "demo-client-1", name: "CRM Restaurante", service: "CRM personalizado", status: "desarrollo", progress: 40, budget: 1200, paid: 600, due_date: null, qa_passed: false, is_demo: true, created_at: ago(110) },
    { id: "demo-project-2", client_id: "demo-client-2", name: "Automatización Reservas", service: "Sistema de reservas", status: "diseno", progress: 60, budget: 250, paid: 250, due_date: null, qa_passed: false, is_demo: true, created_at: ago(40) },
  ];
  const proposals: Tables["proposals"][] = [
    { id: "demo-prop-1", lead_id: "demo-lead-3", client_id: null, title: "Web Pro + Reservas — Reformas López", items: [ { service_id: "web-pro", name: "Web Pro", price: 350, cost: 80 }, { service_id: "reservas", name: "Sistema de reservas", price: 250, cost: 50 } ], total: 600, cost_total: 130, status: "borrador", notes: null, created_by: "usuario", is_demo: true, created_at: ago(1) },
    { id: "demo-prop-2", lead_id: "demo-lead-5", client_id: "demo-client-1", title: "CRM Restaurante La Brasa", items: [ { service_id: "crm", name: "CRM personalizado", price: 1200, cost: 300 } ], total: 1200, cost_total: 300, status: "aceptada", notes: null, created_by: "usuario", is_demo: true, created_at: ago(130) },
  ];
  return { leads, clients, projects, proposals };
}

export type { ServiceRow };
