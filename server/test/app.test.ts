import { afterEach, describe, expect, it } from "bun:test"
import type { Database } from "bun:sqlite"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Hono } from "hono"
import { createServerApp } from "../src/app"
import { openDatabase } from "../src/db"
import { createTodoService } from "../src/domain"
import { createInMemoryTodoStore } from "../src/store"

const openDbs: Database[] = []
const tempDirs: string[] = []

function memoryDb(): Database {
  const db = openDatabase(":memory:")
  openDbs.push(db)

  return db
}

function createTestApp(clientDist?: string) {
  const db = memoryDb()
  const service = createTodoService(createInMemoryTodoStore())
  const ai = new Hono()

  ai.post("/api/copilotkit", (c) => c.json({ ok: true }))

  return {
    app: createServerApp({
      db,
      service,
      ai,
      ...(clientDist ? { clientDist } : {}),
    }),
    service,
  }
}

function staticDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "todo-app-"))
  tempDirs.push(dir)

  return dir
}

afterEach(() => {
  while (openDbs.length > 0) openDbs.pop()!.close()
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe("server app", () => {
  it("reports a healthy database", async () => {
    const { app } = createTestApp()

    const response = await app.request("/api/health")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, database: true })
  })

  it("reports an unhealthy database when the connection is closed", async () => {
    const db = openDatabase(":memory:")
    const app = createServerApp({
      db,
      service: createTodoService(createInMemoryTodoStore()),
    })

    db.close()

    const response = await app.request("/api/health")

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ ok: false, database: false })
  })

  it("mounts the todo API", async () => {
    const { app, service } = createTestApp()
    const todo = service.createTodo("Mounted")

    const response = await app.request("/api/todo")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ todos: [todo] })
  })

  it("mounts the AI app at the root", async () => {
    const { app } = createTestApp()

    const response = await app.request("/api/copilotkit", { method: "POST" })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it("returns JSON 404 for unknown API routes", async () => {
    const { app } = createTestApp()

    const response = await app.request("/api/missing")

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Not Found" })
  })

  it("serves static assets and falls back to index.html for SPA routes", async () => {
    const dir = staticDir()
    writeFileSync(join(dir, "index.html"), "<!doctype html><p>spa-index</p>")
    const { app } = createTestApp(dir)

    const response = await app.request("/todos/123")

    expect(response.status).toBe(200)
    expect(await response.text()).toContain("spa-index")
  })

  it("does not let the SPA fallback swallow unknown API routes", async () => {
    const dir = staticDir()
    writeFileSync(join(dir, "index.html"), "<!doctype html><p>spa-index</p>")
    const { app } = createTestApp(dir)

    const response = await app.request("/api/missing")

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: "Not Found" })
  })
})
