import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import type { Todo } from "shared"
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
} from "../../../src/features/todo/api"

type FetchCall = {
  input: RequestInfo | URL
  init?: RequestInit
}

type FetchHandler = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

const realFetch = globalThis.fetch
let calls: FetchCall[] = []

function mockFetch(handler: FetchHandler): void {
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    calls.push({ input, init })
    return await handler(input, init)
  }) as typeof fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  calls = []
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("fetchTodos", () => {
  it("gets the todo list and unwraps the todos array", async () => {
    const todos: Todo[] = [
      { id: "b", title: "B", completed: false },
      { id: "a", title: "A", completed: true },
    ]
    mockFetch(async () => jsonResponse({ todos }))

    await expect(fetchTodos()).resolves.toEqual(todos)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.input).toBe("/api/todo")
    expect(calls[0]!.init).toBeUndefined()
  })
})

describe("createTodo", () => {
  it("posts the title and returns the created todo", async () => {
    const created: Todo = {
      id: "new",
      title: "Buy milk",
      completed: false,
    }
    mockFetch(async () => jsonResponse(created, 201))

    await expect(createTodo({ title: "Buy milk" })).resolves.toEqual(created)
    expect(calls[0]!.input).toBe("/api/todo")
    expect(calls[0]!.init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Buy milk" }),
    })
  })
})

describe("updateTodo", () => {
  it("patches the encoded id with the completed state", async () => {
    const updated: Todo = {
      id: "a b/c?d",
      title: "Ship it",
      completed: true,
    }
    mockFetch(async () => jsonResponse(updated))

    await expect(
      updateTodo("a b/c?d", { completed: true }),
    ).resolves.toEqual(updated)
    expect(calls[0]!.input).toBe("/api/todo/a%20b%2Fc%3Fd")
    expect(calls[0]!.init).toMatchObject({
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ completed: true }),
    })
  })
})

describe("deleteTodo", () => {
  it("deletes the encoded id and resolves undefined for 204", async () => {
    mockFetch(async () => new Response(null, { status: 204 }))

    await expect(deleteTodo("a b/c")).resolves.toBeUndefined()
    expect(calls[0]!.input).toBe("/api/todo/a%20b%2Fc")
    expect(calls[0]!.init).toMatchObject({ method: "DELETE" })
  })
})

describe("error handling", () => {
  it("throws the server-provided error message", async () => {
    mockFetch(async () =>
      jsonResponse({ error: "title must not be empty" }, 400),
    )

    await expect(createTodo({ title: "" })).rejects.toThrow(
      "title must not be empty",
    )
  })

  it("falls back to the HTTP status for non-JSON errors", async () => {
    mockFetch(async () => new Response("not json", { status: 500 }))

    await expect(fetchTodos()).rejects.toThrow("HTTP 500")
  })

  it("falls back to the HTTP status when the JSON body has no error", async () => {
    mockFetch(async () => jsonResponse({ message: "nope" }, 418))

    await expect(fetchTodos()).rejects.toThrow("HTTP 418")
  })

  it("propagates network failures", async () => {
    mockFetch(async () => {
      throw new Error("network down")
    })

    await expect(fetchTodos()).rejects.toThrow("network down")
  })

  it("propagates malformed success bodies", async () => {
    mockFetch(
      async () =>
        new Response("{", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    )

    await expect(fetchTodos()).rejects.toThrow()
  })
})
