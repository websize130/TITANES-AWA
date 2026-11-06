export const eur = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const usd = (n: number | null | undefined, digits = 2) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: 4 }).format(Number(n ?? 0));

export const num = (n: number) => new Intl.NumberFormat("es-ES").format(n);

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "Hace unos segundos";
  const m = Math.round(s / 60);
  if (m < 60) return `Hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return `Hace ${d} d`;
}

export const dateEs = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "—";

export const LEAD_STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo", investigando: "Investigando", auditado: "Auditado", contactado: "Contactado",
  propuesta: "Propuesta", negociacion: "Negociación", ganado: "Ganado", perdido: "Perdido",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente", en_curso: "En curso", pendiente_aprobacion: "Pend. aprobación",
  completada: "Completada", error: "Error", cancelada: "Cancelada",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  planificacion: "Planificación", diseno: "Diseño", desarrollo: "Desarrollo", qa: "QA", entregado: "Entregado", mantenimiento: "Mantenimiento",
};

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  borrador: "Borrador", pendiente_aprobacion: "Pend. aprobación", aprobada: "Aprobada", enviada: "Enviada", aceptada: "Aceptada", rechazada: "Rechazada",
};

export const APPROVAL_TYPE_LABEL: Record<string, string> = {
  enviar_mensaje: "Enviar mensaje", enviar_propuesta: "Enviar propuesta", publicar_web: "Publicar web", pago: "Pago",
  produccion: "Cambio en producción", ejecutar_workflow: "Ejecutar workflow", accion_agente: "Acción de agente",
};

export const STATUS_TONE: Record<string, string> = {
  nuevo: "#60a5fa", investigando: "#a855f7", auditado: "#22d3ee", contactado: "#eab308", propuesta: "#f97316", negociacion: "#fb923c",
  ganado: "#22c55e", perdido: "#ef4444",
  pendiente: "#9ca3af", en_curso: "#f97316", pendiente_aprobacion: "#eab308", completada: "#22c55e", error: "#ef4444", cancelada: "#4b5563",
  borrador: "#9ca3af", aprobada: "#22d3ee", enviada: "#60a5fa", aceptada: "#22c55e", rechazada: "#ef4444",
  planificacion: "#9ca3af", diseno: "#ec4899", desarrollo: "#a855f7", qa: "#22d3ee", entregado: "#22c55e", mantenimiento: "#eab308",
  onboarding: "#eab308", activo: "#22c55e", inactivo: "#4b5563",
  alta: "#ef4444", media: "#eab308", baja: "#60a5fa", urgente: "#f43f5e",
  aprobada_ap: "#22c55e", ejecutada: "#22c55e",
};
