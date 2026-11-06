import "server-only";
import type { Store } from "./db/store";
import type { ActivityRow, Actor } from "./types";

export async function logActivity(
  store: Store,
  actor: Actor,
  action: string,
  opts: { entity?: string; entityId?: string; detail?: string; level?: ActivityRow["level"] } = {},
) {
  try {
    await store.insert("activity_logs", {
      actor,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      detail: opts.detail ? opts.detail.slice(0, 2000) : null,
      level: opts.level ?? "info",
    });
  } catch (e) {
    // El registro nunca debe romper la operación principal.
    console.error("[activity] no se pudo registrar", e);
  }
}
