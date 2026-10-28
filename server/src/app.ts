import type { Database } from "bun:sqlite"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { serveStatic } from "hono/bun"
import { createTodoApi } from "./api"
import { checkDatabase } from "./db"
import type { TodoService } from "./domain"

export type ServerAppOptions = {
  db: Database
  service: TodoService
  /** AI edge Hono app. Omit in tests that do not exercise agent routes. */
  ai?: Hono
  /** Absolute client build directory. Omit outside production. */
  clientDist?: string
}

/**
 * Build the HTTP application without opening a database or starting timers.
 *
 * Keeping the route wiring here lets tests use `app.request()` with an
 * in-memory database while `index.ts` remains a thin process entry point.
 */
export function createServerApp({
  db,
  service,
  ai,
  clientDist,
}: ServerAppOptions): Hono {
  const app = new Hono()

  app.use(cors())

  app.get("/api/health", (c) => {
    const database = checkDatabase(db)

    return c.json({ ok: database, database }, database ? 200 : 503)
  })

  app.route("/api/todo", createTodoApi(service))

  if (ai) {
    app.route("/", ai)
  }

  // Unknown API routes must not fall through to the SPA.
  app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404))

  if (clientDist) {
    // Static assets (JS, CSS, images, ...).
    app.use("*", serveStatic({ root: clientDist }))
    // SPA fallback for any non-API route.
    app.get("*", serveStatic({ root: clientDist, path: "index.html" }))
  }

  return app
}
