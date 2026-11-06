"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import { login } from "@/app/actions";

export function LoginForm({ supabase }: { supabase: boolean }) {
  return (
    <ActionForm action={login} className="space-y-3">
      {supabase && (
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
    </ActionForm>
  );
}
