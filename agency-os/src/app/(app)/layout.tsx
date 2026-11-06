import Link from "next/link";
import { requireSession } from "@/lib/db";
import { config, productionIssues, usingInsecureDefaults } from "@/lib/config";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { logout } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { store, email } = await requireSession();
  const pending = await store.list("approvals", { eq: { status: "pendiente" } });
  const issues = productionIssues();
  const operational = config.anthropicKeyPresent;
  return (
    <div className="flex min-h-screen">
      <Sidebar envLabel={config.appEnv === "production" ? "Producción" : "Desarrollo"} backend={store.kind === "local" ? "local (demo)" : "Supabase"} operational={operational} />
      <div className="min-w-0 flex-1">
        <MobileNav />
        <header className="flex flex-wrap items-center justify-end gap-3 px-6 pt-5">
          {config.appEnv !== "production" && (
            <span className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[11px] font-semibold text-yellow-400">ENTORNO DESARROLLO</span>
          )}
          {store.kind === "local" && usingInsecureDefaults() && (
            <Link href="/configuracion" className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-400">Credenciales por defecto: configura .env.local</Link>
          )}
          <Link href="/aprobaciones" className="relative rounded-xl border border-line bg-panel px-3 py-2 text-sm hover:bg-panel-2" aria-label={`${pending.length} aprobaciones pendientes`}>
            🔔 Aprobaciones
            {pending.length > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold">{pending.length}</span>}
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-1.5">
            <div className="text-right">
              <div className="text-sm font-semibold">Tu Agencia</div>
              <div className="text-[11px] text-muted">{email ?? "Fundador"}</div>
            </div>
            <form action={logout}>
              <button className="btn btn-ghost !px-2 !py-1 text-xs" title="Cerrar sesión">Salir</button>
            </form>
          </div>
        </header>
        <main className="px-6 pb-12 pt-5">
          {issues.length > 0 && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              Producción bloqueada: {issues.join(" ")}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
