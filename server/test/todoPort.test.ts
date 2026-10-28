import { describe, expect, it } from "bun:test"
import type { Todo, TodoList } from "shared"
import {
  createTodoService,
  TITLE_MAX_LENGTH,
  type TodoService,
} from "../src/domain"
import { createInMemoryTodoStore } from "../src/store"
import { createInProcessTodoPort } from "../src/todoPort"

type ServiceOptions = {
  todos?: TodoList
  created?: Todo
  updated?: Todo
  removed?: boolean
}

type ServiceCalls = {
  list: number
  create: string[]
  setCompleted: Array<{ id: string; completed: boolean }>
  remove: string[]
}

function createSpyService(options: ServiceOptions = {}): {
  service: TodoService
  calls: ServiceCalls
} {
  const calls: ServiceCalls = {
    list: 0,
    create: [],
    setCompleted: [],
    remove: [],
  }

  const service: TodoService = {
    listTodos: () => {
      calls.list += 1
      return options.todos ?? []
    },
    createTodo: (title) => {
      calls.create.push(title)
      return options.created ?? { id: "created", title, completed: false }
    },
    setCompleted: (id, completed) => {
      calls.setCompleted.push({ id, completed })
      return options.updated
    },
    removeTodo: (id) => {
      calls.remove.push(id)
      return options.removed ?? false
    },
  }

  return { service, calls }
}

describe("in-process todo port", () => {
  describe("list", () => {
    it("returns the service list", async () => {
      const todos: TodoList = [
        { id: "b", title: "B", completed: false },
        { id: "a", title: "A", completed: true },
      ]
      const { service, calls } = createSpyService({ todos })
      const port = createInProcessTodoPort(service)

      expect(await port.list()).toEqual(todos)
      expect(calls.list).toBe(1)
    })
  })

  describe("create", () => {
    it("trims the title and delegates to the service", async () => {
      const created: Todo = {
        id: "created",
        title: "Buy milk",
        completed: false,
      }
      const { service, calls } = createSpyService({ created })
      const port = createInProcessTodoPort(service)

      expect(await port.create("  Buy milk  ")).toEqual(created)
      expect(calls.create).toEqual(["Buy milk"])
    })

    it("accepts a title at the length limit after trimming", async () => {
      const title = "a".repeat(TITLE_MAX_LENGTH)
      const { service, calls } = createSpyService()
      const port = createInProcessTodoPort(service)

      await port.create(`  ${title}  `)

      expect(calls.create).toEqual([title])
    })

    it("rejects invalid titles without calling the service", async () => {
      const { service, calls } = createSpyService()
      const port = createInProcessTodoPort(service)
      const invalid = [
        undefined,
        null,
        42,
        true,
        {},
        [],
        "",
        "   ",
        "\n\t",
        "a".repeat(TITLE_MAX_LENGTH + 1),
      ]

      for (const title of invalid) {
        expect(await port.create(title as unknown as string)).toBeUndefined()
      }

      expect(calls.create).toEqual([])
    })
  })

  describe("setCompleted", () => {
    it("delegates both boolean values to the service", async () => {
      const updated: Todo = { id: "a", title: "A", completed: true }
      const { service, calls } = createSpyService({ updated })
      const port = createInProcessTodoPort(service)

      expect(await port.setCompleted("a", true)).toEqual(updated)
      expect(await port.setCompleted("a", false)).toEqual(updated)

      expect(calls.setCompleted).toEqual([
        { id: "a", completed: true },
        { id: "a", completed: false },
      ])
    })

    it("rejects non-boolean values without calling the service", async () => {
      const { service, calls } = createSpyService()
      const port = createInProcessTodoPort(service)
      const invalid = [undefined, null, 0, 1, "true", {}, []]

      for (const completed of invalid) {
        expect(
          await port.setCompleted("a", completed as unknown as boolean),
        ).toBeUndefined()
      }

      expect(calls.setCompleted).toEqual([])
    })

    it("returns undefined for an unknown id", async () => {
      const { service, calls } = createSpyService()
      const port = createInProcessTodoPort(service)

      expect(await port.setCompleted("missing", true)).toBeUndefined()
      expect(calls.setCompleted).toEqual([
        { id: "missing", completed: true },
      ])
    })
  })

  describe("remove", () => {
    it("delegates and returns the service result", async () => {
      const removed = createSpyService({ removed: true })
      const notRemoved = createSpyService({ removed: false })

      expect(
        await createInProcessTodoPort(removed.service).remove("a"),
      ).toBe(true)
      expect(
        await createInProcessTodoPort(notRemoved.service).remove("a"),
      ).toBe(false)
      expect(removed.calls.remove).toEqual(["a"])
      expect(notRemoved.calls.remove).toEqual(["a"])
    })
  })

  describe("with an in-memory service", () => {
    it("supports the full create, list, update, and remove flow", async () => {
      const service = createTodoService(createInMemoryTodoStore())
      const port = createInProcessTodoPort(service)

      const created = await port.create("  Write tests  ")

      expect(created).toMatchObject({
        title: "Write tests",
        completed: false,
      })
      expect(await port.list()).toEqual([created])

      const completed = await port.setCompleted(created!.id, true)

      expect(completed).toEqual({ ...created, completed: true })
      expect(await port.list()).toEqual([completed])

      expect(await port.remove(created!.id)).toBe(true)
      expect(await port.list()).toEqual([])
      expect(await port.remove(created!.id)).toBe(false)
    })
  })
})
