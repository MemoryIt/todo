import { afterEach, describe, expect, it } from "bun:test"
import type { Database } from "bun:sqlite"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { openDatabase } from "../src/db"
import { createTodoService } from "../src/domain"
import { createSqliteTodoStore } from "../src/store"
import { runTodoServiceContract } from "./contract/todoServiceContract"
import { runTodoStoreContract } from "./contract/todoStoreContract"

const openDbs: Database[] = []
const tempDirs: string[] = []

function memoryStore() {
  const db = openDatabase(":memory:")
  openDbs.push(db)

  return createSqliteTodoStore(db)
}

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "todo-store-"))
  tempDirs.push(dir)

  return join(dir, "todo.db")
}

afterEach(() => {
  while (openDbs.length > 0) openDbs.pop()!.close()
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

// Same expectations as the in-memory suite: the swap must be behaviour
// preserving, not merely approximate.
runTodoStoreContract("sqlite store", memoryStore)

runTodoServiceContract("todo service (sqlite store)", () =>
  createTodoService(memoryStore()),
)

describe("sqlite store persistence", () => {
  it("keeps todos after the database is closed and reopened", () => {
    const path = tempDbPath()

    const first = openDatabase(path)
    const firstStore = createSqliteTodoStore(first)
    const created = createTodoService(firstStore).createTodo("Survive restart")
    first.close()

    const second = openDatabase(path)
    openDbs.push(second)

    expect(createSqliteTodoStore(second).findAll()).toEqual([created])
  })

  it("shares data between two stores on the same database", () => {
    const db = openDatabase(":memory:")
    openDbs.push(db)

    const writer = createSqliteTodoStore(db)
    const reader = createSqliteTodoStore(db)

    writer.save({ id: "shared", title: "Visible", completed: false })

    expect(reader.findById("shared")).toEqual({
      id: "shared",
      title: "Visible",
      completed: false,
    })
  })
})
