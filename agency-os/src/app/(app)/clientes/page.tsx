import Link from "next/link";
import { requireSession } from "@/lib/db";
import { eur } from "@/lib/format";
import { Badge, Card, DemoTag, Empty, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { createClientAction } from "@/app/actions";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const { store } = await requireSession();
  const [clients, projects] = await Promise.all([store.list("clients"), store.list("projects")]);
  return (
    <div>
      <PageHeader title="Clientes" subtitle="Clientes activos, onboarding y mantenimiento." />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card title={`${clients.length} clientes`}>
          {clients.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2">Cliente</th><th>Sector</th><th>Localidad</th><th>Estado</th><th className="text-right">Proyectos</th><th className="text-right">Facturado</th></tr></thead>
              <tbody>
                {clients.map((c) => {
                  const ps = projects.filter((p) => p.client_id === c.id);
                  return (
                    <tr key={c.id} className="border-t border-line">
                      <td className="py-2"><Link href={`/clientes/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link> {c.is_demo && <DemoTag />}</td>
                      <td className="text-muted">{c.sector}</td><td className="text-muted">{c.city}</td>
                      <td><Badge value={c.status} /></td>
                      <td className="text-right">{ps.length}</td>
                      <td className="text-right">{eur(ps.reduce((s, p) => s + Number(p.paid), 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <Empty>Sin clientes. Convierte un lead o créalo aquí.</Empty>}
        </Card>
        <Card title="Nuevo cliente">
          <ActionForm action={createClientAction} resetOnSuccess className="space-y-2">
            <input name="name" required maxLength={200} placeholder="Nombre *" className="input" />
            <div className="grid grid-cols-2 gap-2"><input name="sector" placeholder="Sector" className="input" /><input name="city" placeholder="Localidad" className="input" /></div>
            <input name="website" placeholder="Web" className="input" />
            <div className="grid grid-cols-2 gap-2"><input name="email" type="email" placeholder="Email" className="input" /><input name="phone" placeholder="Teléfono" className="input" /></div>
            <input name="contact_name" placeholder="Persona de contacto" className="input" />
            <textarea name="notes" rows={2} placeholder="Notas" className="input" />
            <SubmitButton>Crear cliente</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
