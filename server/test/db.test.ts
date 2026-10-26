import { afterEach, describe, expect, it } from "bun:test"
import type { Database } from "bun:sqlite"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  checkDatabase,
  migrate,
  openDatabase,
  readSchemaVersion,
  rowToTodo,
  SCHEMA_VERSION,
} from "../src/db"

const tempDirs: string[] = []
const openDbs: Database[] = []

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "todo-db-"))
  tempDirs.push(dir)
  return dir
}

function memoryDb(): Database {
  const db = openDatabase(":memory:")
  openDbs.push(db)
  return db
}

afterEach(() => {
  while (openDbs.length > 0) openDbs.pop()!.close()
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { recursive: true, force: true })
})

describe("openDatabase", () => {
  it("creates the todos table and records the schema version", () => {
    const db = memoryDb()

    expect(readSchemaVersion(db)).toBe(SCHEMA_VERSION)

    const table = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'todos'",
      )
      .get()

    expect(table?.name).toBe("todos")
  })

  it("creates missing parent directories for file databases", () => {
    const path = join(tempDir(), "nested", "deep", "todo.db")
    const db = openDatabase(path)
    openDbs.push(db)

    expect(existsSync(path)).toBe(true)
    expect(checkDatabase(db)).toBe(true)
  })

  it("uses WAL for file databases", () => {
    const db = openDatabase(join(tempDir(), "todo.db"))
    openDbs.push(db)

    const mode = db.query<{ journal_mode: string }, []>("PRAGMA journal_mode").get()

    expect(mode?.journal_mode).toBe("wal")
  })

  it("persists rows across connections", () => {
    const path = join(tempDir(), "todo.db")

    const first = openDatabase(path)
    first
      .query<never, [string, string, number, number]>(
        "INSERT INTO todos (id, title, completed, created_at) VALUES (?, ?, ?, ?)",
      )
      .run("t1", "Persisted", 0, 1)
    first.close()

    const second = openDatabase(path)
    openDbs.push(second)

    expect(second.query("SELECT id FROM todos").all()).toEqual([{ id: "t1" }])
  })
})

describe("migrate", () => {
  it("is idempotent", () => {
    const db = memoryDb()

    expect(migrate(db)).toBe(SCHEMA_VERSION)
    expect(migrate(db)).toBe(SCHEMA_VERSION)
  })
})

describe("schema constraints", () => {
  const insert = (db: Database, id: string, title: string, completed: number) =>
    db
      .query<never, [string, string, number, number]>(
        "INSERT INTO todos (id, title, completed, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(id, title, completed, Date.now())

  it("rejects duplicate ids", () => {
    const db = memoryDb()

    insert(db, "dup", "First", 0)

    expect(() => insert(db, "dup", "Second", 0)).toThrow()
  })

  it("rejects completion values other than 0 or 1", () => {
    const db = memoryDb()

    expect(() => insert(db, "t1", "Bad flag", 2)).toThrow()
  })

  it("rejects empty titles", () => {
    const db = memoryDb()

    expect(() => insert(db, "t1", "", 0)).toThrow()
  })
})

describe("rowToTodo", () => {
  it("maps integer completion to a boolean", () => {
    expect(
      rowToTodo({ id: "a", title: "Active", completed: 0, created_at: 1 }),
    ).toEqual({ id: "a", title: "Active", completed: false })

    expect(
      rowToTodo({ id: "b", title: "Done", completed: 1, created_at: 2 }),
    ).toEqual({ id: "b", title: "Done", completed: true })
  })
})
