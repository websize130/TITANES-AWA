import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/db";
import { workflowTemplate } from "@/lib/n8n";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const wf = await session.store.get("workflows", id);
  if (!wf) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const appUrl = process.env.APP_URL || req.nextUrl.origin;
  return new NextResponse(JSON.stringify(workflowTemplate(wf, appUrl), null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="agency-os-${wf.id}.json"` },
  });
}
