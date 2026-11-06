"use client";

import { useActionState, useEffect, useRef, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions";

type FormAction = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** Formulario con estado de envío y mensaje de resultado. */
export function ActionForm({
  action, children, className, resetOnSuccess = false, hidden,
}: { action: FormAction; children: ReactNode; className?: string; resetOnSuccess?: boolean; hidden?: Record<string, string> }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {state?.error && <p className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{state.error}</p>}
      {state?.ok && state.message && <p className="mt-2 rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-400" role="status">{state.message}</p>}
    </form>
  );
}

export function SubmitButton({ children, pendingText = "Procesando…", variant = "primary", name, value }: { children: ReactNode; pendingText?: string; variant?: "primary" | "ghost" | "danger"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`btn btn-${variant}`}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Botón que invoca una server action simple (sin formulario de datos). */
export function ActionButton({ onAction, children, variant = "ghost", confirm: confirmText, className }: { onAction: () => Promise<void>; children: ReactNode; variant?: "primary" | "ghost" | "danger"; confirm?: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={`btn btn-${variant} ${className ?? ""}`}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(() => onAction());
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}

/** Select que dispara una server action al cambiar. */
export function ActionSelect({ value, options, onChange, className }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => Promise<void>; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <select
      className={`input !w-auto !py-1 text-xs ${className ?? ""}`}
      value={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        start(() => onChange(v));
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
