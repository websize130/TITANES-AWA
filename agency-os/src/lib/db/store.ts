import type { TableName, Tables } from "../types";

export type Row<T extends TableName> = Tables[T];
export type NewRow<T extends TableName> = Omit<Row<T>, "id" | "created_at"> & { id?: string; created_at?: string };

export interface ListQuery<T extends TableName> {
  eq?: Partial<Row<T>>;
  order?: { column: keyof Row<T> & string; ascending?: boolean };
  limit?: number;
  since?: { column: keyof Row<T> & string; iso: string };
}

/** Acceso a datos genérico. Implementado por el almacén local (demo) y por Supabase (RLS por usuario). */
export interface Store {
  readonly kind: "local" | "supabase";
  list<T extends TableName>(table: T, query?: ListQuery<T>): Promise<Row<T>[]>;
  get<T extends TableName>(table: T, id: string): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, row: NewRow<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  remove<T extends TableName>(table: T, id: string): Promise<void>;
}
