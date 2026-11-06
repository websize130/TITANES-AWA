"use client";

import type { ActionState } from "@/app/actions";
import type { LeadRow } from "@/lib/types";
import { LEAD_STATUS_LABEL } from "@/lib/format";
import { ActionForm, SubmitButton } from "./forms";

export function LeadForm({ action, lead }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; lead?: LeadRow }) {
  return (
    <ActionForm action={action} resetOnSuccess={!lead} hidden={lead ? { $id: lead.id } : undefined} className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><label className="label">Nombre del negocio *</label><input name="business_name" required maxLength={200} defaultValue={lead?.business_name} className="input" /></div>
      <div><label className="label">Sector</label><input name="sector" maxLength={100} defaultValue={lead?.sector} placeholder="Clínica dental" className="input" /></div>
      <div><label className="label">Localidad</label><input name="city" maxLength={100} defaultValue={lead?.city} placeholder="Madrid" className="input" /></div>
      <div className="col-span-2"><label className="label">Web</label><input name="website" maxLength={500} defaultValue={lead?.website ?? ""} placeholder="https://…" className="input" /></div>
      <div><label className="label">Teléfono</label><input name="phone" maxLength={40} defaultValue={lead?.phone ?? ""} className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={lead?.email ?? ""} className="input" /></div>
      <div><label className="label">Contacto</label><input name="contact_name" maxLength={120} defaultValue={lead?.contact_name ?? ""} className="input" /></div>
      <div><label className="label">Valor estimado (€)</label><input name="estimated_value" type="number" min={0} step="1" defaultValue={lead?.estimated_value ?? ""} className="input" /></div>
      <div><label className="label">Prioridad</label><select name="priority" defaultValue={lead?.priority ?? "media"} className="input"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div>
      {lead ? (
        <div><label className="label">Estado</label><select name="status" defaultValue={lead.status} className="input">{Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      ) : (
        <div><label className="label">Origen</label><input name="source" maxLength={100} placeholder="Google Maps, referido…" className="input" /></div>
      )}
      {lead && <input type="hidden" name="source" value={lead.source ?? ""} />}
      <div className="col-span-2"><label className="label">Observaciones</label><textarea name="notes" rows={3} maxLength={2000} defaultValue={lead?.notes ?? ""} className="input" /></div>
      <div className="col-span-2"><SubmitButton>{lead ? "Guardar cambios" : "Crear lead"}</SubmitButton></div>
    </ActionForm>
  );
}
