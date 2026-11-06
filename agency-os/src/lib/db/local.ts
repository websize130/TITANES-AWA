import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TableName, Tables } from "../types";
import type { ListQuery, NewRow, Row, Store } from "./store";
import { BASE_AGENTS, BASE_SERVICES, BASE_WORKFLOWS, demoData } from "./seed";

type DB = { [K in TableName]: Tables[K][] };

const DATA_DIR = process.env.AGENCY_OS_DATA_DIR || path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "agency-os.json");

let cache: DB | null = null;
let loading: Promise<DB> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function emptyDb(): DB {
  return { agents: [], tasks: [], agent_runs: [], leads: [], clients: [], audits: [], proposals: [], projects: [], workflows: [], approvals: [], activity_logs: [], services: [] };
}

function seedDb(): DB {
  const db = emptyDb();
  const ts = new Date().toISOString();
  db.agents = BASE_AGENTS.map((a) => ({ ...a, created_at: ts })) as DB["agents"];
  db.services = BASE_SERVICES.map((s) => ({ ...s, created_at: ts }));
  db.workflows = BASE_WORKFLOWS.map((w) => ({ ...w, created_at: ts }));
  const demo = demoData();
  for (const key of Object.keys(demo) as TableName[]) {
    (db[key] as unknown[]) = demo[key] as unknown[];
  }
  return db;
}

function load(): Promise<DB> {
  if (cache) return Promise.resolve(cache);
  // Una única carga en vuelo aunque lleguen varias peticiones a la vez.
  loading ??= (async () => {
    let db: DB;
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      db = { ...emptyDb(), ...(JSON.parse(raw) as Partial<DB>) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; // no sobrescribir un fichero corrupto
      db = seedDb();
      await persist(db);
    }
    cache = db;
    return db;
  })().finally(() => { loading = null; });
  return loading;
}

async function persist(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

/** Serializa escrituras para evitar condiciones de carrera dentro del proceso. */
function locked<R>(fn: () => Promise<R>): Promise<R> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

const clone = <T>(v: T): T => structuredClone(v);

export const localStore: Store = {
  kind: "local",
  async list<T extends TableName>(table: T, q?: ListQuery<T>) {
    const db = await load();
    let rows = (db[table] as Row<T>[]).slice();
    if (q?.eq) {
      const entries = Object.entries(q.eq);
      rows = rows.filter((r) => entries.every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v));
    }
    if (q?.since) {
      const { column, iso } = q.since;
      rows = rows.filter((r) => String((r as unknown as Record<string, unknown>)[column] ?? "") >= iso);
    }
    const order = q?.order ?? { column: "created_at" as keyof Row<T> & string, ascending: false };
    rows.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[order.column] as string | number;
      const bv = (b as unknown as Record<string, unknown>)[order.column] as string | number;
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return order.ascending ? cmp : -cmp;
    });
    if (q?.limit) rows = rows.slice(0, q.limit);
    return clone(rows);
  },
  async get<T extends TableName>(table: T, id: string) {
    const db = await load();
    const row = (db[table] as Row<T>[]).find((r) => r.id === id);
    return row ? clone(row) : null;
  },
  insert<T extends TableName>(table: T, row: NewRow<T>) {
    return locked(async () => {
      const db = await load();
      const full = { ...row, id: row.id ?? randomUUID(), created_at: row.created_at ?? new Date().toISOString() } as Row<T>;
      if ((db[table] as Row<T>[]).some((r) => r.id === full.id)) throw new Error(`Duplicado en ${table}: ${full.id}`);
      (db[table] as Row<T>[]).push(full);
      await persist(db);
      return clone(full);
    });
  },
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>) {
    return locked(async () => {
      const db = await load();
      const rows = db[table] as Row<T>[];
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new Error(`No existe ${table}/${id}`);
      const { id: _ignored, created_at: _c, ...safe } = patch as Record<string, unknown>;
      void _ignored; void _c;
      rows[i] = { ...rows[i], ...safe } as Row<T>;
      await persist(db);
      return clone(rows[i]);
    });
  },
  remove<T extends TableName>(table: T, id: string) {
    return locked(async () => {
      const db = await load();
      (db[table] as Row<T>[]) = (db[table] as Row<T>[]).filter((r) => r.id !== id);
      await persist(db);
    });
  },
};

/** Restablece el almacén local a los datos semilla (solo desarrollo). */
export async function resetLocalStore() {
  return locked(async () => {
    cache = seedDb();
    await persist(cache);
  });
}
