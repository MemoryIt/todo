import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import type { Todo, TodoList, TodoPort } from "shared"
import { createTodoAgent, TODO_AGENT_ID } from "../src/agents/todo"

const originalEnv = {
  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_MODEL: process.env.LLM_MODEL,
}

type TestTool = {
  execute?: (
    input: Record<string, unknown>,
    context: unknown,
  ) => Promise<unknown>
}

type PortOptions = {
  todos?: TodoList
  created?: Todo
  updated?: Todo
  removed?: boolean
}

type PortCalls = {
  list: number
  create: string[]
  setCompleted: Array<{ id: string; completed: boolean }>
  remove: string[]
}

function createTestPort(options: PortOptions = {}): {
  port: TodoPort
  calls: PortCalls
} {
  const calls: PortCalls = {
    list: 0,
    create: [],
    setCompleted: [],
    remove: [],
  }

  const port: TodoPort = {
    list: async () => {
      calls.list += 1
      return options.todos ?? []
    },
    create: async (title) => {
      calls.create.push(title)
      return options.created
    },
    setCompleted: async (id, completed) => {
      calls.setCompleted.push({ id, completed })
      return options.updated
    },
    remove: async (id) => {
      calls.remove.push(id)
      return options.removed ?? false
    },
  }

  return { port, calls }
}

async function getTools(port: TodoPort): Promise<Record<string, TestTool>> {
  const agent = createTodoAgent(port, { memory: false })
  const tools = await agent.listTools()

  return tools as unknown as Record<string, TestTool>
}

beforeAll(() => {
  // Agent construction reads the LLM configuration, but these tests never
  // call the model.
  process.env.LLM_BASE_URL = "http://127.0.0.1:1/v1"
  process.env.LLM_API_KEY = "test-key"
  process.env.LLM_MODEL = "test-model"
})

afterAll(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }
})

describe("todo agent", () => {
  it("registers the expected id and tools", async () => {
    const { port } = createTestPort()
    const agent = createTodoAgent(port, { memory: false })
    const tools = await agent.listTools()

    expect(agent.id).toBe(TODO_AGENT_ID)
    expect(agent.name).toBe("Todo Agent")
    expect(Object.keys(tools).sort()).toEqual([
      "addTodo",
      "listTodos",
      "removeTodo",
      "toggleTodo",
    ])
  })
})

describe("listTodos", () => {
  const todos: TodoList = [
    { id: "a", title: "Buy milk", completed: false },
    { id: "b", title: "Write report", completed: true },
    { id: "c", title: "Buy milk for the cat", completed: false },
  ]

  it("lists all todos by default and projects the expected fields", async () => {
    const { port, calls } = createTestPort({ todos })
    const tools = await getTools(port)

    expect(await tools.listTodos!.execute!({}, {})).toEqual({
      count: 3,
      items: todos,
    })
    expect(calls.list).toBe(1)
  })

  it("filters by active and completed status", async () => {
    const { port } = createTestPort({ todos })
    const tools = await getTools(port)

    expect(
      await tools.listTodos!.execute!({ status: "active" }, {}),
    ).toEqual({
      count: 2,
      items: [todos[0], todos[2]],
    })

    expect(
      await tools.listTodos!.execute!({ status: "completed" }, {}),
    ).toEqual({
      count: 1,
      items: [todos[1]],
    })
  })

  it("matches queries case-insensitively after trimming", async () => {
    const { port } = createTestPort({ todos })
    const tools = await getTools(port)

    expect(
      await tools.listTodos!.execute!({ query: "  MILK  " }, {}),
    ).toEqual({
      count: 2,
      items: [todos[0], todos[2]],
    })
  })

  it("combines status and query filters", async () => {
    const { port } = createTestPort({ todos })
    const tools = await getTools(port)

    expect(
      await tools.listTodos!.execute!(
        { status: "active", query: "cat" },
        {},
      ),
    ).toEqual({
      count: 1,
      items: [todos[2]],
    })
  })

  it("returns an empty result when nothing matches", async () => {
    const { port } = createTestPort({ todos })
    const tools = await getTools(port)

    expect(
      await tools.listTodos!.execute!({ query: "missing" }, {}),
    ).toEqual({ count: 0, items: [] })
  })
})

describe("addTodo", () => {
  it("creates a todo and returns the projected result", async () => {
    const created: Todo = {
      id: "created",
      title: "Buy milk",
      completed: false,
    }
    const { port, calls } = createTestPort({ created })
    const tools = await getTools(port)

    expect(
      await tools.addTodo!.execute!({ title: "Buy milk" }, {}),
    ).toEqual({ ok: true, todo: created })
    expect(calls.create).toEqual(["Buy milk"])
  })

  it("returns create_failed when the port cannot create", async () => {
    const { port } = createTestPort()
    const tools = await getTools(port)

    expect(
      await tools.addTodo!.execute!({ title: "Invalid" }, {}),
    ).toEqual({ ok: false, error: "create_failed" })
  })
})

describe("toggleTodo", () => {
  it("toggles both directions using the current completion state", async () => {
    const incomplete: Todo = {
      id: "a",
      title: "Buy milk",
      completed: false,
    }
    const complete: Todo = {
      id: "b",
      title: "Write report",
      completed: true,
    }

    const first = createTestPort({
      todos: [incomplete],
      updated: { ...incomplete, completed: true },
    })
    const firstTools = await getTools(first.port)

    expect(
      await firstTools.toggleTodo!.execute!({ id: "a" }, {}),
    ).toEqual({ ok: true, todo: { ...incomplete, completed: true } })
    expect(first.calls.setCompleted).toEqual([
      { id: "a", completed: true },
    ])

    const second = createTestPort({
      todos: [complete],
      updated: { ...complete, completed: false },
    })
    const secondTools = await getTools(second.port)

    expect(
      await secondTools.toggleTodo!.execute!({ id: "b" }, {}),
    ).toEqual({ ok: true, todo: { ...complete, completed: false } })
    expect(second.calls.setCompleted).toEqual([
      { id: "b", completed: false },
    ])
  })

  it("returns not_found without updating an unknown id", async () => {
    const { port, calls } = createTestPort({ todos: [] })
    const tools = await getTools(port)

    expect(
      await tools.toggleTodo!.execute!({ id: "missing" }, {}),
    ).toEqual({ ok: false, error: "not_found" })
    expect(calls.setCompleted).toEqual([])
  })

  it("returns toggle_failed when the update cannot be applied", async () => {
    const todo: Todo = {
      id: "a",
      title: "Buy milk",
      completed: false,
    }
    const { port, calls } = createTestPort({ todos: [todo] })
    const tools = await getTools(port)

    expect(
      await tools.toggleTodo!.execute!({ id: "a" }, {}),
    ).toEqual({ ok: false, error: "toggle_failed" })
    expect(calls.setCompleted).toEqual([
      { id: "a", completed: true },
    ])
  })
})

describe("removeTodo", () => {
  it("returns the removed id when deletion succeeds", async () => {
    const { port, calls } = createTestPort({ removed: true })
    const tools = await getTools(port)

    expect(
      await tools.removeTodo!.execute!({ id: "a" }, {}),
    ).toEqual({ ok: true, id: "a" })
    expect(calls.remove).toEqual(["a"])
  })

  it("returns not_found when deletion fails", async () => {
    const { port } = createTestPort({ removed: false })
    const tools = await getTools(port)

    expect(
      await tools.removeTodo!.execute!({ id: "missing" }, {}),
    ).toEqual({ ok: false, error: "not_found" })
  })
})
