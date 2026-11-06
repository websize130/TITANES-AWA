# AGENCY OS — reglas del subproyecto

Las reglas de Unity del `CLAUDE.md` raíz (TITANES-AWA) **no aplican** a este directorio. AGENCY OS es una app Next.js independiente.

@AGENTS.md

- Stack: Next.js 16 (App Router, `proxy.ts` en lugar de middleware), TypeScript estricto, Tailwind v4, Supabase, `@anthropic-ai/sdk`, zod.
- Datos: toda lectura/escritura pasa por `Store` (`src/lib/db`). Si añades una columna, actualiza `src/lib/types.ts` **y** `supabase/migrations/`.
- Mutaciones: solo en `src/app/actions.ts` (server actions con validación zod + `logActivity`).
- Agentes: nunca ejecutan acciones sensibles; se crean filas en `approvals`. No simular ejecuciones: sin `ANTHROPIC_API_KEY` no se registra ningún run.
- Verificación antes de commitear: `npm run typecheck && npm run lint && npm run build && npm run test:e2e`.
- Subagentes de Claude Code para trabajo de cliente: `.claude/agents/` (los siete agentes).
