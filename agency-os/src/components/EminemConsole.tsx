"use client";

import { instructEminem } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";
import { AgentAvatar } from "./PixelSprite";

export function EminemConsole({ leads, compact }: { leads: { id: string; business_name: string }[]; compact?: boolean }) {
  return (
    <ActionForm action={instructEminem} resetOnSuccess className="space-y-2">
      <div className="flex items-start gap-3">
        <AgentAvatar agentId="eminem" size={compact ? 36 : 48} />
        <textarea name="instruction" required minLength={10} maxLength={4000} rows={compact ? 3 : 4} className="input" placeholder="Ej.: Analiza la Clínica Dental Sonrisas, propón una web con reservas y prepara la oferta." />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select name="lead_id" className="input !w-auto flex-1" defaultValue="">
          <option value="">Sin lead asociado</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.business_name}</option>)}
        </select>
        <SubmitButton pendingText="EMINEM planificando…">Enviar a EMINEM</SubmitButton>
      </div>
      <p className="text-[11px] text-muted">EMINEM crea un plan de tareas con responsables. Cada tarea se ejecuta cuando tú lo indicas; nada sensible se ejecuta sin aprobación.</p>
    </ActionForm>
  );
}
