import { redirect } from "next/navigation";
import { getSession } from "@/lib/db";
import { config, usingInsecureDefaults } from "@/lib/config";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Acceso" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const supabase = config.dataBackend === "supabase";
  return (
    <main className="grid min-h-screen place-items-center p-6" style={{ background: "radial-gradient(ellipse at top, #2a1405 0%, #0b0b10 60%)" }}>
      <div className="panel panel-glow w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={44} />
          <div>
            <div className="text-2xl font-black">AGENCY <span className="text-brand">OS</span></div>
            <div className="text-xs text-muted">Tu agencia, potenciada por siete agentes IA</div>
          </div>
        </div>
        <LoginForm supabase={supabase} />
        {!supabase && usingInsecureDefaults() && config.appEnv !== "production" && (
          <p className="mt-4 rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-400">
            Modo desarrollo sin AGENCY_OS_PASSWORD: contraseña temporal <code>agencyos</code>. Configúrala en <code>.env.local</code>.
          </p>
        )}
      </div>
    </main>
  );
}
