import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { Todo, TodoList } from "shared"

const apiPath = "../../../src/features/todo/api"

const fetchTodosMock = mock(async (): Promise<TodoList> => [])
const createTodoMock = mock(
  async (input: { title: string }): Promise<Todo> => ({
    id: "created",
    title: input.title,
    completed: false,
  }),
)
const updateTodoMock = mock(
  async (id: string, input: { completed: boolean }): Promise<Todo> => ({
    id,
    title: "Updated",
    completed: input.completed,
  }),
)
const deleteTodoMock = mock(async (): Promise<void> => undefined)

mock.module(apiPath, () => ({
  fetchTodos: fetchTodosMock,
  createTodo: createTodoMock,
  updateTodo: updateTodoMock,
  deleteTodo: deleteTodoMock,
}))

const { useTodos } = await import("../../../src/features/todo/useTodos")

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

beforeEach(() => {
  fetchTodosMock.mockReset()
  createTodoMock.mockReset()
  updateTodoMock.mockReset()
  deleteTodoMock.mockReset()

  fetchTodosMock.mockImplementation(async () => [])
  createTodoMock.mockImplementation(async (input) => ({
    id: "created",
    title: input.title,
    completed: false,
  }))
  updateTodoMock.mockImplementation(async (id, input) => ({
    id,
    title: "Updated",
    completed: input.completed,
  }))
  deleteTodoMock.mockImplementation(async () => undefined)
})

afterAll(() => {
  mock.restore()
})

describe("useTodos initial load", () => {
  it("loads todos and clears the loading state", async () => {
    const todos: TodoList = [
      { id: "b", title: "B", completed: false },
      { id: "a", title: "A", completed: true },
    ]
    fetchTodosMock.mockImplementation(async () => todos)

    const { result } = renderHook(() => useTodos())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.todos).toEqual(todos)
    expect(result.current.error).toBeUndefined()
    expect(fetchTodosMock).toHaveBeenCalledTimes(1)
  })

  it("records an initial load error", async () => {
    fetchTodosMock.mockImplementation(async () => {
      throw new Error("load failed")
    })

    const { result } = renderHook(() => useTodos())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.todos).toEqual([])
    expect(result.current.error).toBe("load failed")
  })
})

describe("useTodos addTodo", () => {
  it("prepends the created todo and returns it", async () => {
    fetchTodosMock.mockImplementation(async () => [
      { id: "existing", title: "Existing", completed: false },
    ])
    const created: Todo = {
      id: "created",
      title: "New todo",
      completed: false,
    }
    createTodoMock.mockImplementation(async () => created)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: Todo | undefined
    await act(async () => {
      returned = await result.current.addTodo("New todo")
    })

    expect(returned).toEqual(created)
    expect(result.current.todos).toEqual([
      created,
      { id: "existing", title: "Existing", completed: false },
    ])
    expect(result.current.error).toBeUndefined()
  })

  it("records an add error and returns undefined", async () => {
    const existing: Todo = {
      id: "existing",
      title: "Existing",
      completed: false,
    }
    fetchTodosMock.mockImplementation(async () => [existing])
    createTodoMock.mockImplementation(async () => {
      throw new Error("add failed")
    })

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: Todo | undefined
    await act(async () => {
      returned = await result.current.addTodo("New todo")
    })

    expect(returned).toBeUndefined()
    expect(result.current.todos).toEqual([existing])
    expect(result.current.error).toBe("add failed")
  })
})

describe("useTodos toggleTodo", () => {
  it("tracks pending state, replaces the todo, and clears pending", async () => {
    const original: Todo = {
      id: "a",
      title: "A",
      completed: false,
    }
    const updated: Todo = { ...original, completed: true }
    const pending = deferred<Todo>()
    fetchTodosMock.mockImplementation(async () => [original])
    updateTodoMock.mockImplementation(() => pending.promise)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let toggled: Promise<Todo | undefined>
    act(() => {
      toggled = result.current.toggleTodo("a", true)
    })

    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      pending.resolve(updated)
      await toggled
    })

    expect(result.current.pendingIds.has("a")).toBe(false)
    expect(result.current.todos).toEqual([updated])
    expect(result.current.error).toBeUndefined()
  })

  it("records a toggle error and still clears pending", async () => {
    const original: Todo = {
      id: "a",
      title: "A",
      completed: false,
    }
    const pending = deferred<Todo>()
    fetchTodosMock.mockImplementation(async () => [original])
    updateTodoMock.mockImplementation(() => pending.promise)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let toggled: Promise<Todo | undefined>
    act(() => {
      toggled = result.current.toggleTodo("a", true)
    })

    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      pending.reject(new Error("toggle failed"))
      await expect(toggled).resolves.toBeUndefined()
    })

    expect(result.current.pendingIds.has("a")).toBe(false)
    expect(result.current.todos).toEqual([original])
    expect(result.current.error).toBe("toggle failed")
  })
})

describe("useTodos removeTodo", () => {
  it("tracks pending state, removes the todo, and returns true", async () => {
    const original: Todo = {
      id: "a",
      title: "A",
      completed: false,
    }
    const pending = deferred<void>()
    fetchTodosMock.mockImplementation(async () => [original])
    deleteTodoMock.mockImplementation(() => pending.promise)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let removed: Promise<boolean>
    act(() => {
      removed = result.current.removeTodo("a")
    })

    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      pending.resolve()
      await expect(removed).resolves.toBe(true)
    })

    expect(result.current.pendingIds.has("a")).toBe(false)
    expect(result.current.todos).toEqual([])
    expect(result.current.error).toBeUndefined()
  })

  it("records a remove error, keeps the todo, and returns false", async () => {
    const original: Todo = {
      id: "a",
      title: "A",
      completed: false,
    }
    const pending = deferred<void>()
    fetchTodosMock.mockImplementation(async () => [original])
    deleteTodoMock.mockImplementation(() => pending.promise)

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let removed: Promise<boolean>
    act(() => {
      removed = result.current.removeTodo("a")
    })

    expect(result.current.pendingIds.has("a")).toBe(true)

    await act(async () => {
      pending.reject(new Error("remove failed"))
      await expect(removed).resolves.toBe(false)
    })

    expect(result.current.pendingIds.has("a")).toBe(false)
    expect(result.current.todos).toEqual([original])
    expect(result.current.error).toBe("remove failed")
  })
})

describe("useTodos refetch", () => {
  it("replaces the list, clears the error, and returns the data", async () => {
    fetchTodosMock.mockImplementation(async () => {
      throw new Error("initial failed")
    })

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.error).toBe("initial failed"))

    const refreshed: TodoList = [
      { id: "new", title: "Fresh", completed: false },
    ]
    fetchTodosMock.mockImplementation(async () => refreshed)

    let returned: TodoList | undefined
    await act(async () => {
      returned = await result.current.refetch()
    })

    expect(returned).toEqual(refreshed)
    expect(result.current.todos).toEqual(refreshed)
    expect(result.current.error).toBeUndefined()
  })

  it("records a refetch error, keeps the list, and returns undefined", async () => {
    const existing: Todo = {
      id: "existing",
      title: "Existing",
      completed: false,
    }
    fetchTodosMock.mockImplementation(async () => [existing])

    const { result } = renderHook(() => useTodos())
    await waitFor(() => expect(result.current.loading).toBe(false))

    fetchTodosMock.mockImplementation(async () => {
      throw new Error("refetch failed")
    })

    let returned: TodoList | undefined
    await act(async () => {
      returned = await result.current.refetch()
    })

    expect(returned).toBeUndefined()
    expect(result.current.todos).toEqual([existing])
    expect(result.current.error).toBe("refetch failed")
  })
})
