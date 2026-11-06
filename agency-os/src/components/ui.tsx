import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_TONE } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 ${className ?? ""}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({ value, label, color }: { value?: string; label?: string; color?: string }) {
  const c = color ?? (value ? STATUS_TONE[value] : undefined) ?? "#9ca3af";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {label ?? value}
    </span>
  );
}

export function Stat({ label, value, hint, accent = "#f97316", icon }: { label: string; value: ReactNode; hint?: ReactNode; accent?: string; icon?: ReactNode }) {
  return (
    <div className="panel flex items-center gap-4 p-4">
      <div className="grid h-11 w-11 place-items-center rounded-xl text-xl" style={{ background: `${accent}1f`, color: accent }}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="truncate text-xs text-muted">{label}</div>
        {hint && <div className="mt-0.5 text-[11px]" style={{ color: accent }}>{hint}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function DemoTag() {
  return <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-yellow-400">demo</span>;
}

export function Progress({ value, color = "#f97316" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function LinkMore({ href, children = "Ver todos →" }: { href: string; children?: ReactNode }) {
  return <Link href={href} className="text-xs font-medium text-brand hover:underline">{children}</Link>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const map = { info: "#60a5fa", warn: "#eab308", error: "#ef4444", ok: "#22c55e" } as const;
  const c = map[tone];
  return <div className="rounded-lg px-3 py-2 text-sm" style={{ background: `${c}14`, border: `1px solid ${c}40`, color: c }}>{children}</div>;
}
