import { beforeEach, describe, expect, it } from "bun:test"
import { Hono } from "hono"
import { createTodoApi } from "../src/api"
import {
  createTodoService,
  TITLE_MAX_LENGTH,
  type TodoService,
} from "../src/domain"
import { createInMemoryTodoStore } from "../src/store"

type TestServer = {
  app: Hono
  service: TodoService
}

function createTestServer(): TestServer {
  const service = createTodoService(createInMemoryTodoStore())
  const app = new Hono()

  app.route("/api/todo", createTodoApi(service))

  return { app, service }
}

function sendJson(
  app: Hono,
  path: string,
  method: string,
  body: unknown,
): Promise<Response> {
  return app.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function sendRaw(
  app: Hono,
  path: string,
  method: string,
  body: string,
): Promise<Response> {
  return app.request(path, {
    method,
    headers: { "content-type": "application/json" },
    body,
  })
}

describe("todo API", () => {
  let app: Hono
  let service: TodoService

  beforeEach(() => {
    ;({ app, service } = createTestServer())
  })

  describe("GET /api/todo", () => {
    it("returns an empty list when no todos exist", async () => {
      const response = await app.request("/api/todo")

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ todos: [] })
    })

    it("returns todos in the service order", async () => {
      const first = service.createTodo("A")
      const second = service.createTodo("B")

      const response = await app.request("/api/todo")

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ todos: [second, first] })
    })
  })

  describe("POST /api/todo", () => {
    it("creates a todo with a trimmed title", async () => {
      const response = await sendJson(app, "/api/todo", "POST", {
        title: "  Buy milk  ",
      })

      expect(response.status).toBe(201)

      const body = await response.json()

      expect(body).toMatchObject({
        title: "Buy milk",
        completed: false,
      })
      expect(body.id).toBeString()
      expect(service.listTodos()).toEqual([body])
    })

    it("rejects malformed and non-object JSON bodies", async () => {
      const malformed = await sendRaw(app, "/api/todo", "POST", "{")

      expect(malformed.status).toBe(400)
      expect(await malformed.json()).toEqual({ error: "Invalid JSON body" })

      for (const body of [null, [], "text", 42, true]) {
        const response = await sendJson(app, "/api/todo", "POST", body)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Invalid JSON body" })
      }

      expect(service.listTodos()).toEqual([])
    })

    it("rejects invalid titles without creating a todo", async () => {
      const cases = [
        {
          body: {},
          error: "title must be a string",
        },
        {
          body: { title: 42 },
          error: "title must be a string",
        },
        {
          body: { title: "" },
          error: "title must not be empty",
        },
        {
          body: { title: "   " },
          error: "title must not be empty",
        },
        {
          body: { title: "a".repeat(TITLE_MAX_LENGTH + 1) },
          error: `title must be at most ${TITLE_MAX_LENGTH} characters`,
        },
      ]

      for (const { body, error } of cases) {
        const response = await sendJson(app, "/api/todo", "POST", body)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error })
      }

      expect(service.listTodos()).toEqual([])
    })
  })

  describe("PATCH /api/todo/:id", () => {
    it("marks a todo completed and can cancel completion", async () => {
      const created = service.createTodo("Ship it")

      const completed = await sendJson(
        app,
        `/api/todo/${created.id}`,
        "PATCH",
        { completed: true },
      )

      expect(completed.status).toBe(200)
      expect(await completed.json()).toEqual({ ...created, completed: true })

      const cancelled = await sendJson(
        app,
        `/api/todo/${created.id}`,
        "PATCH",
        { completed: false },
      )

      expect(cancelled.status).toBe(200)
      expect(await cancelled.json()).toEqual({ ...created, completed: false })
    })

    it("rejects malformed and non-object JSON bodies", async () => {
      const created = service.createTodo("Ship it")

      const malformed = await sendRaw(
        app,
        `/api/todo/${created.id}`,
        "PATCH",
        "{",
      )

      expect(malformed.status).toBe(400)
      expect(await malformed.json()).toEqual({ error: "Invalid JSON body" })

      for (const body of [null, [], "text", 42, true]) {
        const response = await sendJson(
          app,
          `/api/todo/${created.id}`,
          "PATCH",
          body,
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Invalid JSON body" })
      }

      expect(service.listTodos()).toEqual([created])
    })

    it("rejects non-boolean completion values", async () => {
      const created = service.createTodo("Ship it")

      for (const completed of [undefined, null, 0, 1, "true", {}]) {
        const response = await sendJson(
          app,
          `/api/todo/${created.id}`,
          "PATCH",
          { completed },
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({
          error: "completed must be a boolean",
        })
      }

      expect(service.listTodos()).toEqual([created])
    })

    it("returns 404 for an unknown todo id", async () => {
      const response = await sendJson(
        app,
        "/api/todo/missing",
        "PATCH",
        { completed: true },
      )

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: "Todo not found" })
    })
  })

  describe("DELETE /api/todo/:id", () => {
    it("deletes an existing todo and returns an empty 204 response", async () => {
      const created = service.createTodo("Throwaway")

      const response = await app.request(`/api/todo/${created.id}`, {
        method: "DELETE",
      })

      expect(response.status).toBe(204)
      expect(await response.text()).toBe("")
      expect(service.listTodos()).toEqual([])
    })

    it("returns 404 for an unknown todo id", async () => {
      const response = await app.request("/api/todo/missing", {
        method: "DELETE",
      })

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: "Todo not found" })
    })
  })
})
