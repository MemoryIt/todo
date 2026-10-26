import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import type { Todo } from "shared"

/**
 * Default SQLite location, relative to the process working directory.
 *
 * Overridable with `DATABASE_PATH`; use `:memory:` for an ephemeral database
 * (tests, throwaway runs).
 */
export const DEFAULT_DATABASE_PATH = "./data/todo.db"

/** Expected `PRAGMA user_version` after {@link migrate} has run. */
export const SCHEMA_VERSION = 1

/**
 * Row shape of the `todos` table.
 *
 * SQLite has no boolean type, so completion is stored as `0`/`1`; conversion
 * to/from {@link Todo} happens in the store, via {@link rowToTodo}.
 */
export type TodoRow = {
  id: string
  title: string
  completed: number
  created_at: number
}

/**
 * Ordered schema migrations. Never edit or reorder an entry that has shipped:
 * append a new statement and bump {@link SCHEMA_VERSION} instead, because
 * `PRAGMA user_version` records how far an existing database has come.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE todos (
     id         TEXT    PRIMARY KEY NOT NULL,
     title      TEXT    NOT NULL CHECK (length(title) > 0),
     completed  INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
     created_at INTEGER NOT NULL
   ) STRICT;

   CREATE INDEX idx_todos_created_at ON todos (created_at DESC);`,
]

/**
 * Open a database, apply connection pragmas and bring the schema up to date.
 *
 * Missing parent directories are created so a fresh checkout/container can
 * boot without manual setup.
 */
export function openDatabase(path: string = DEFAULT_DATABASE_PATH): Database {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const db = new Database(path, { create: true, readwrite: true })

  // WAL keeps readers from blocking the writer and survives crashes; it is a
  // no-op for in-memory databases.
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA synchronous = NORMAL")
  // Wait instead of failing immediately when another connection holds a lock.
  db.exec("PRAGMA busy_timeout = 5000")

  migrate(db)

  return db
}

/**
 * Apply every migration the database has not seen yet.
 *
 * Each step runs in a transaction together with its `user_version` bump, so a
 * failure leaves the database at the last fully applied version.
 *
 * @returns the schema version after migrating
 */
export function migrate(db: Database): number {
  const from = readSchemaVersion(db)

  for (let version = from; version < MIGRATIONS.length; version++) {
    const statement = MIGRATIONS[version]!

    db.transaction(() => {
      db.exec(statement)
      // PRAGMA values cannot be bound; the index is an internal integer.
      db.exec(`PRAGMA user_version = ${version + 1}`)
    })()
  }

  return readSchemaVersion(db)
}

/** Current schema version recorded in the database. */
export function readSchemaVersion(db: Database): number {
  const row = db
    .query<{ user_version: number }, []>("PRAGMA user_version")
    .get()

  return row?.user_version ?? 0
}

/** Map a database row to the domain type (integer → boolean). */
export function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed !== 0,
  }
}

/** Cheap liveness probe for the connection, used by the health check. */
export function checkDatabase(db: Database): boolean {
  try {
    return db.query<{ ok: number }, []>("SELECT 1 AS ok").get()?.ok === 1
  } catch {
    return false
  }
}
