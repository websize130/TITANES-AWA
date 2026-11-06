import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AGENCY OS", template: "%s · AGENCY OS" },
  description: "Sistema operativo de la agencia: siete agentes de IA, CRM, presupuestos, proyectos y automatizaciones.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
