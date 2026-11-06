# AGENCY OS — The Rap Team

Sistema operativo de una agencia digital individual gestionada por **siete agentes de IA**:
EMINEM (CEO/orquestador), 50 CENT (ventas), TUPAC (investigación), CANSERBERO (desarrollo),
NAS (diseño), BIGGIE (CRM y automatizaciones) e ICE CUBE (seguridad y QA).

> Los nombres son etiquetas internas. Los personajes, sprites y personalidades son originales.

## Arranque rápido

```bash
cd agency-os
npm install
cp .env.example .env.local        # rellena al menos AGENCY_OS_PASSWORD y AUTH_SECRET
npm run dev                       # http://localhost:3000
```

Sin `.env.local`, en desarrollo se entra con la contraseña temporal `agencyos` (la app avisa en rojo).

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY` | Sin ella los agentes están **configurados**, no **operativos**: no se ejecuta ni se simula nada. |
| `CLAUDE_MODEL` | Modelo por defecto (`claude-opus-5-5`); cada agente puede tener otro en su perfil. |
| `MAX_AGENT_RUNS_PER_DAY`, `DAILY_AI_BUDGET_USD`, `MAX_PLAN_TASKS` | Límites de ejecución. |
| `DATA_BACKEND` | `local` (JSON en `.data/` con datos demo) o `supabase`. |
| `N8N_BASE_URL`, `N8N_WEBHOOK_SECRET` | Disparo de workflows firmados (HMAC). |
| `APP_ENV` | `development` usa `/webhook-test/` de n8n; `production` exige Supabase y secretos fuertes. |

## Qué hace

- **Overview**: KPIs (leads, clientes, proyectos, facturación cobrada, costes de IA, pipeline, tasas de cierre), oficina, agentes, aprobaciones y actividad.
- **Oficina virtual** isométrica pixel art: 7 puestos; el estado visual (disponible, pensando, trabajando, pendiente de aprobación, error, completado) se **deriva de ejecuciones y tareas reales**. Clic → ficha con tarea actual, pendientes, ejecuciones, herramientas, historial, costes y asignación de tareas.
- **Agentes**: perfil, system prompt efectivo, permisos, límites, modelo e instrucciones propias editables.
- **CRM / Leads / Clientes**: alta y edición, sector, localidad, web, observaciones, auditorías (verificado vs. hipótesis), pipeline por estado, conversión a cliente, deduplicación por web.
- **Tareas y orquestación**: instrucción a EMINEM → plan estructurado con responsables y dependencias → cada paso se ejecuta cuando tú lo pides ("Ejecutar siguiente paso") → EMINEM consolida. Sin bucles automáticos.
- **Efectos de los agentes** (no sensibles): TUPAC registra auditorías, 50 CENT crea presupuestos en borrador con servicios del catálogo, ICE CUBE marca el QA del proyecto. Todo lo sensible → **Centro de aprobaciones**.
- **Presupuestos y catálogo**: precios iniciales editables, entregables, costes y margen; envío solo tras aprobación (manual o vía n8n).
- **Proyectos**: estado, progreso, cobros; no se puede entregar sin QA (también como trigger SQL).
- **Automatizaciones n8n**: 12 workflows con plantilla importable (Webhook → verificación HMAC → lógica → callback firmado). Los sensibles requieren aprobación.
- **Finanzas**: cobros, márgenes y coste real de IA (tokens devueltos por la API × tarifa).
- **Configuración**: estado real de integraciones, seguridad y límites; reset de datos demo.

## Arquitectura

```
src/proxy.ts                 Comprobación optimista de sesión (+ refresco de token Supabase)
src/app/actions.ts           Todas las mutaciones (server actions, zod, registro de actividad)
src/app/(app)/…              Páginas (Server Components)
src/app/api/webhooks/n8n     Webhook entrante: HMAC + anti-replay + idempotencia
src/app/api/n8n/workflows    Descarga de plantillas n8n
src/lib/agents.ts            Los 7 perfiles, permisos y prompts
src/lib/orchestrator.ts      Plan de EMINEM, ejecución de tareas, límites, aprobaciones
src/lib/claude.ts            Llamada a Claude con salida estructurada (zod), fallback y coste
src/lib/db/                  Store genérico: local (JSON) | Supabase (RLS por owner_id)
src/components/office/       Oficina isométrica SVG + ficha de agente
supabase/migrations/         Esquema, RLS y control de QA
.claude/agents/              Los 7 agentes como subagentes de Claude Code
```

### Supabase

1. Crea el proyecto y ejecuta `supabase/migrations/0001_init.sql` (SQL editor o `supabase db push`).
2. Crea tu usuario en Auth (email + contraseña).
3. `DATA_BACKEND=supabase` y las variables `NEXT_PUBLIC_SUPABASE_*`. Agentes, catálogo y workflows se crean al primer acceso.
4. Para webhooks entrantes: `SUPABASE_SERVICE_ROLE_KEY` (solo servidor) y `N8N_OWNER_ID` (tu UUID).

### n8n

1. Descarga la plantilla desde **Automatizaciones** e impórtala.
2. En n8n: variable `AGENCY_OS_SECRET` = `N8N_WEBHOOK_SECRET` y `NODE_FUNCTION_ALLOW_BUILTIN=crypto`.
3. Sustituye el nodo "Lógica" por la lógica real y activa el workflow.
4. Para crear leads desde formularios, envía a `/api/webhooks/n8n` el evento `{"event":"lead.create","lead":{…}}` firmado.

## Pruebas

```bash
npm run typecheck && npm run lint
npm run build && npm run test:e2e
```

`test:e2e` arranca la build con una **API de Claude simulada** y un **n8n simulado** (no gasta tokens) y recorre 36 comprobaciones: login, leads, auditoría de TUPAC, plan de EMINEM con dependencias y aprobación, presupuesto de 50 CENT, envío vía n8n firmado, webhooks (firma, replay, idempotencia), control de QA y oficina. Requiere Playwright (`npm i -D playwright && npx playwright install chromium` si no lo tienes global).

## Estado y pendientes

Funciona: todo lo anterior en modo local; integración con Claude probada contra la API simulada; RLS y esquema SQL escritos.

Falta / no verificado:
- Ninguna llamada real a Claude ni conexión real a Supabase o n8n se ha probado desde este entorno (no hay claves configuradas).
- Lógica de negocio dentro de cada workflow n8n (las plantillas traen seguridad y callback; el nodo "Lógica" es un marcador).
- Herramientas externas para los agentes (búsqueda web para TUPAC, generación de código en repositorio para CANSERBERO): hoy trabajan solo con datos del CRM.
- Envío real de WhatsApp/email y generación de PDF de propuestas (vía n8n tras aprobación).
- La deduplicación de webhooks entrantes es en memoria por proceso; en serverless conviene persistirla en una tabla.
