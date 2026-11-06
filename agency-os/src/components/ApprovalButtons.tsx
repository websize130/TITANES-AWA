"use client";

import { decideApproval } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";

export function ApprovalButtons({ id, withNote }: { id: string; withNote?: boolean }) {
  return (
    <ActionForm action={decideApproval} hidden={{ $id: id }} className="space-y-2">
      {withNote && <input name="note" maxLength={1000} placeholder="Nota (opcional)" className="input" />}
      <div className="flex gap-2">
        <SubmitButton name="$decision" value="aprobada" pendingText="…">Aprobar</SubmitButton>
        <SubmitButton name="$decision" value="rechazada" variant="ghost" pendingText="…">Rechazar</SubmitButton>
      </div>
    </ActionForm>
  );
}
