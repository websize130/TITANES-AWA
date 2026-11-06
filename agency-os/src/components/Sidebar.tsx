"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Overview", icon: "◧" },
  { href: "/oficina", label: "Oficina virtual", icon: "▦" },
  { href: "/agentes", label: "Agentes", icon: "☺" },
  { href: "/crm", label: "CRM", icon: "⇄" },
  { href: "/leads", label: "Leads", icon: "◎" },
  { href: "/clientes", label: "Clientes", icon: "♜" },
  { href: "/proyectos", label: "Proyectos", icon: "▤" },
  { href: "/tareas", label: "Tareas", icon: "☑" },
  { href: "/automatizaciones", label: "Automatizaciones", icon: "⚙" },
  { href: "/presupuestos", label: "Presupuestos", icon: "€" },
  { href: "/finanzas", label: "Finanzas", icon: "▲" },
  { href: "/configuracion", label: "Configuración", icon: "✦" },
];

export function Sidebar({ envLabel, backend, operational }: { envLabel: string; backend: string; operational: boolean }) {
  const path = usePathname();
  return (
    <aside className="panel sticky top-3 m-3 mr-0 hidden h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col p-3 lg:flex">
      <Link href="/" className="mb-5 flex items-center gap-2 px-2 pt-1">
        <Logo />
        <div>
          <div className="text-lg font-black tracking-tight">AGENCY <span className="text-brand">OS</span></div>
          <div className="text-[10px] text-muted">The Rap Team · 7 agentes IA</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-brand/15 font-semibold text-brand" : "text-ink/80 hover:bg-white/5"}`}>
              <span className="w-4 text-center text-base leading-none">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-3 rounded-xl border border-line bg-black/20 p-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${operational ? "bg-green-500" : "bg-yellow-500"}`} />
          <span className={operational ? "text-green-400" : "text-yellow-400"}>{operational ? "Agentes operativos" : "Agentes solo configurados"}</span>
        </div>
        <div className="mt-1 text-muted">{envLabel} · datos: {backend}</div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 lg:hidden">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs ${(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "bg-brand/20 text-brand" : "text-muted"}`}>
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
