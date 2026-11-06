// Prueba e2e de AGENCY OS: build de producción + API de Claude simulada + n8n simulado.
// Uso: npm run build && npm run test:e2e
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { startMock } from "./mock-anthropic.mjs";

// Playwright se resuelve con require (permite una instalación global). Local: npm i -D playwright && npx playwright install chromium
const { chromium } = createRequire(import.meta.url)("playwright");

const APP = "http://127.0.0.1:3100";
const SECRET = "e2e-n8n-secret-0123456789abcdef";
const dataDir = mkdtempSync(path.join(tmpdir(), "agency-os-e2e-"));
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) failures++; };

const sign = (body, ts) => createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");

// n8n simulado: verifica la firma que envía AGENCY OS
const n8nCalls = [];
const n8n = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const ts = req.headers["x-agency-timestamp"];
    n8nCalls.push({ url: req.url, valid: req.headers["x-agency-signature"] === sign(raw, ts), body: JSON.parse(raw) });
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"accepted":true}');
  });
});
await new Promise((r) => n8n.listen(4011, r));
const { server: mock, requests } = await startMock(4010);

const app = spawn("npx", ["next", "start", "-p", "3100", "-H", "127.0.0.1"], {
  env: {
    ...process.env, APP_ENV: "development", DATA_BACKEND: "local", AGENCY_OS_DATA_DIR: dataDir,
    AGENCY_OS_PASSWORD: "e2e-pass", AUTH_SECRET: "e2e-auth-secret-0123456789abcdef0123456789",
    ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://127.0.0.1:4010",
    N8N_BASE_URL: "http://127.0.0.1:4011", N8N_WEBHOOK_SECRET: SECRET,
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
const stopApp = () => { try { process.kill(-app.pid, "SIGTERM"); } catch {} };
process.on("exit", stopApp);
let appLog = "";
app.stdout.on("data", (d) => (appLog += d));
app.stderr.on("data", (d) => (appLog += d));
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`${APP}/login`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const status = () => page.locator('form [role="status"], form [role="alert"]').last().textContent({ timeout: 30000 });
async function press(loc) {
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST", { timeout: 60000 }), loc.click()]);
  await page.waitForTimeout(500);
}
// Pulsa y espera a que la server action responda y React pinte el resultado.
async function submit(target) {
  const loc = typeof target === "string" ? page.locator(target).first() : target;
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST", { timeout: 60000 }), loc.click()]);
  await page.waitForTimeout(400);
  const t = await status();
  if (process.env.DEBUG) console.log("   ↳", t);
  return t;
}

try {
  // 1. Autenticación
  ok((await fetch(`${APP}/`, { redirect: "manual" })).status === 307, "sin sesión redirige a /login");
  await page.goto(`${APP}/login`);
  await page.fill("#password", "mala");
  ok((await submit("button[type=submit]")).includes("incorrecta"), "contraseña incorrecta rechazada");
  await page.fill("#password", "e2e-pass");
  await page.click("button[type=submit]");
  await page.waitForURL(`${APP}/`);
  ok(true, "login correcto");

  // 2. Leads
  await page.goto(`${APP}/leads`);
  await page.fill('input[name="business_name"]', "E2E Clínica");
  await page.fill('input[name="sector"]', "Clínica");
  await page.fill('input[name="city"]', "Toledo");
  await page.fill('input[name="website"]', "e2e-clinica.example");
  ok((await submit("text=Crear lead")).includes("Lead creado"), "crear lead");
  await page.fill('input[name="business_name"]', "Duplicado");
  await page.fill('input[name="website"]', "https://e2e-clinica.example");
  ok((await submit("text=Crear lead")).includes("Ya existe"), "deduplicación por web");

  // 3. Auditoría con TUPAC
  await page.goto(`${APP}/leads`);
  await page.click("text=E2E Clínica");
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.click("text=Encargar auditoría a TUPAC")]);
  await page.waitForSelector("text=Auditoría digital: E2E Clínica");
  await page.click("text=Auditoría digital: E2E Clínica");
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST", { timeout: 60000 }), page.click("text=Ejecutar con Claude")]);
  await page.waitForSelector("text=Resultado de prueba");
  ok(await page.locator("text=Completada").first().isVisible(), "TUPAC ejecuta la tarea");
  await page.locator("dd a", { hasText: "E2E Clínica" }).click();
  await page.waitForSelector("text=Auditorías (1)");
  ok(await page.locator("text=78/100").isVisible(), "auditoría registrada con puntuación");
  ok(await page.locator("text=Hipótesis").first().isVisible(), "hallazgos marcados como hipótesis");

  // 4. Orquestación con EMINEM
  await page.goto(`${APP}/tareas`);
  await page.fill('textarea[name="instruction"]', "Analiza E2E Clínica y prepara una oferta con web y reservas.");
  await page.selectOption('select[name="lead_id"] >> nth=0', { label: "E2E Clínica" });
  ok((await submit("text=Enviar a EMINEM")).includes("plan de 4 tareas"), "EMINEM crea plan (3 + consolidación)");
  await page.reload();
  const step = () => submit("text=Ejecutar siguiente paso");
  ok((await step()).includes("TUPAC"), "paso 1: TUPAC");
  await page.reload();
  ok((await step()).includes("50 CENT"), "paso 2: 50 CENT");
  await page.reload();
  ok((await step()).includes("No hay tareas listas"), "bloqueado por aprobación pendiente");

  // 5. Aprobaciones
  await page.goto(`${APP}/aprobaciones`);
  ok(await page.locator("text=Enviar oferta al cliente").first().isVisible(), "acción sensible de 50 CENT en aprobaciones");
  const card = page.locator("div.rounded-xl", { hasText: "Ejecutar: Prototipo costoso" }).first();
  await press(card.locator("button", { hasText: "Aprobar" }));
  ok(!(await page.locator("div.rounded-xl.border-yellow-500\\/30", { hasText: "Ejecutar: Prototipo costoso" }).count()), "aprobar tarea de CANSERBERO");
  await page.goto(`${APP}/tareas`);
  ok((await step()).includes("CANSERBERO"), "paso 3: CANSERBERO tras aprobación");
  await page.reload();
  ok((await step()).includes("EMINEM"), "paso 4: EMINEM consolida");
  await page.reload();
  ok(await page.locator("text=4/4 completadas").isVisible(), "plan completado");

  // 6. Presupuesto generado por 50 CENT → aprobación → n8n
  await page.goto(`${APP}/presupuestos`);
  const prop = page.locator("div.rounded-xl", { hasText: "Propuesta — E2E Clínica" }).first();
  ok((await prop.textContent()).includes("600"), "presupuesto 600 € (servicio inventado descartado)");
  await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), prop.locator("button", { hasText: "Solicitar envío" }).click()]);
  await page.waitForSelector("text=En aprobación");
  await page.goto(`${APP}/aprobaciones`);
  await press(page.locator("div.rounded-xl", { hasText: "Enviar propuesta: Propuesta — E2E Clínica" }).first().locator("button", { hasText: "Aprobar" }));
  await page.reload();
  await press(page.locator("text=Ejecutar vía n8n").first());
  ok(n8nCalls.length === 1, "workflow disparado tras aprobación");
  ok(n8nCalls.length === 1 && n8nCalls[0].valid && n8nCalls[0].url.includes("/webhook-test/agency-os/propuestas"), "n8n recibe petición firmada (URL de pruebas en desarrollo)");
  await page.goto(`${APP}/presupuestos`);
  ok(await page.locator("div.rounded-xl", { hasText: "Propuesta — E2E Clínica" }).first().locator("text=Enviada").isVisible(), "propuesta marcada como enviada");

  // 7. Workflow sensible no se dispara sin aprobación
  const before = n8nCalls.length;
  await page.goto(`${APP}/automatizaciones`);
  const wf = page.locator("div.panel", { hasText: "Producción y despliegue" });
  await wf.locator("summary").click();
  ok((await submit(wf.locator("button", { hasText: "Solicitar aprobación" }))).includes("Centro de aprobaciones") && n8nCalls.length === before, "workflow sensible requiere aprobación");

  // 8. Webhook entrante
  const body = JSON.stringify({ event: "lead.create", idempotency_key: "k1", lead: { business_name: "Lead desde n8n", city: "Cádiz", website: "n8n-lead.example" } });
  const ts = String(Math.floor(Date.now() / 1000));
  const post = (b, s) => fetch(`${APP}/api/webhooks/n8n`, { method: "POST", headers: { "content-type": "application/json", "x-agency-timestamp": ts, "x-agency-signature": s }, body: b });
  ok((await post(body, "00")).status === 401, "webhook con firma inválida → 401");
  ok((await post(body, sign(body, ts))).status === 201, "webhook firmado crea lead");
  ok((await (await post(body, sign(body, ts))).json()).duplicate === true, "webhook idempotente");
  const old = String(Math.floor(Date.now() / 1000) - 1000);
  ok((await fetch(`${APP}/api/webhooks/n8n`, { method: "POST", headers: { "x-agency-timestamp": old, "x-agency-signature": sign(body, old) }, body })).status === 401, "webhook antiguo (replay) → 401");

  // 9. Control de QA en proyectos
  await page.goto(`${APP}/proyectos`);
  const proj = page.locator("div.panel", { hasText: "CRM Restaurante" });
  await proj.locator('select[name="status"]').selectOption("entregado");
  ok((await submit(proj.locator("button", { hasText: "Actualizar" }))).includes("QA"), "no se entrega sin QA superado");

  // 10. Plantilla n8n, oficina, finanzas, API protegida
  const tpl = await page.evaluate(async () => { const r = await fetch("/api/n8n/workflows/captacion"); return { status: r.status, body: await r.text() }; });
  ok(tpl.status === 200 && JSON.parse(tpl.body).nodes.length >= 7, "plantilla n8n descargable");
  ok((await fetch(`${APP}/api/n8n/workflows/captacion`)).status === 401, "API protegida sin sesión");
  await page.goto(`${APP}/oficina`);
  ok(await page.locator("svg text", { hasText: "Completado" }).first().isVisible(), "oficina muestra estado real Completado");
  await page.locator('g[role="button"][aria-label^="TUPAC"]').click();
  ok(await page.locator('[role="dialog"] >> text=Últimas ejecuciones').isVisible(), "ficha de agente se abre al hacer clic");
  await page.keyboard.press("Escape");
  await page.goto(`${APP}/finanzas`);
  ok(!(await page.locator("text=Sin ejecuciones reales").isVisible()), "finanzas registra coste de IA");

  // 11. Llamadas a Claude
  const r0 = requests[0];
  ok(requests.length === 6, `6 llamadas a Claude (hubo ${requests.length})`);
  ok(r0.body.model === "claude-opus-5-5" && r0.body.fallbacks === "default" && r0.body.output_config?.format?.type === "json_schema" && String(r0.headers["anthropic-beta"]).includes("server-side-fallback"), "petición con modelo, fallback y salida estructurada");

  await page.click("text=Salir");
  await page.waitForURL(`${APP}/login`);
  ok(true, "logout");
  ok(pageErrors.length === 0, `sin errores en el navegador ${pageErrors.join(" | ")}`);
} catch (e) {
  failures++;
  console.error("✗ excepción:", e.message);
  await page.screenshot({ path: path.join(dataDir, "fallo.png") }).catch(() => {});
  console.error(`captura: ${path.join(dataDir, "fallo.png")}`);
  console.error(appLog.slice(-3000));
} finally {
  await browser.close();
  stopApp();
  mock.close();
  n8n.close();
  if (!failures) rmSync(dataDir, { recursive: true, force: true });
}
console.log(failures ? `\n${failures} fallo(s)` : "\nTodas las pruebas e2e pasaron");
process.exit(failures ? 1 : 0);
