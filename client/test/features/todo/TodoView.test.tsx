import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test"
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
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

const { TodoProvider } = await import(
  "../../../src/features/todo/TodoProvider"
)
const { TodoView } = await import("../../../src/features/todo/TodoView")

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function renderTodoView() {
  return render(
    <TodoProvider>
      <TodoView />
    </TodoProvider>,
  )
}

async function waitForLoaded() {
  await waitFor(() => {
    expect(screen.queryByText("Loading todos...")).toBeNull()
  })
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

describe("TodoView", () => {
  it("shows a loading state before rendering the loaded todos", async () => {
    const pending = deferred<TodoList>()
    const todos: TodoList = [
      { id: "a", title: "Buy milk", completed: false },
      { id: "b", title: "Write report", completed: true },
    ]
    fetchTodosMock.mockImplementation(() => pending.promise)

    renderTodoView()

    expect(screen.getByText("Loading todos...")).toBeDefined()

    await act(async () => {
      pending.resolve(todos)
      await pending.promise
    })

    expect(screen.queryByText("Loading todos...")).toBeNull()
    expect(screen.getByText("Buy milk")).toBeDefined()
    expect(screen.getByText("Write report")).toBeDefined()
    expect(screen.getByText("1 item left")).toBeDefined()
  })

  it("shows the initial load error and hides the loading state", async () => {
    fetchTodosMock.mockImplementation(async () => {
      throw new Error("load failed")
    })

    renderTodoView()

    expect(
      await screen.findByText("Request failed: load failed"),
    ).toBeDefined()
    expect(screen.queryByText("Loading todos...")).toBeNull()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("filters the visible todos by status", async () => {
    fetchTodosMock.mockImplementation(async () => [
      { id: "a", title: "Buy milk", completed: false },
      { id: "b", title: "Write report", completed: true },
    ])

    renderTodoView()
    await waitForLoaded()

    fireEvent.click(screen.getByRole("button", { name: "Active" }))

    expect(screen.getByText("Buy milk")).toBeDefined()
    expect(screen.queryByText("Write report")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Completed" }))

    expect(screen.queryByText("Buy milk")).toBeNull()
    expect(screen.getByText("Write report")).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "All" }))

    expect(screen.getByText("Buy milk")).toBeDefined()
    expect(screen.getByText("Write report")).toBeDefined()
    expect(screen.getByText("1 item left")).toBeDefined()
  })

  it("shows the filter-specific empty message", async () => {
    fetchTodosMock.mockImplementation(async () => [
      { id: "a", title: "Buy milk", completed: false },
    ])

    renderTodoView()
    await waitForLoaded()

    fireEvent.click(screen.getByRole("button", { name: "Completed" }))

    expect(screen.getByText("No completed todos yet.")).toBeDefined()
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("adds a todo through the composer and renders it", async () => {
    fetchTodosMock.mockImplementation(async () => [])
    createTodoMock.mockImplementation(async (input) => ({
      id: "created",
      title: input.title,
      completed: false,
    }))

    renderTodoView()
    await waitForLoaded()

    const input = screen.getByPlaceholderText(
      "What needs to be done?",
    ) as HTMLInputElement
    const form = input.closest("form")

    if (!form) {
      throw new Error("Composer form not found")
    }

    fireEvent.change(input, { target: { value: "  New todo  " } })

    await act(async () => {
      fireEvent.submit(form)
    })

    expect(createTodoMock).toHaveBeenCalledWith({ title: "New todo" })
    expect(await screen.findByText("New todo")).toBeDefined()
    expect(input.value).toBe("")
    expect(screen.getByText("1 item left")).toBeDefined()
  })

  it("toggles a todo through the list and updates the stats", async () => {
    const original: Todo = {
      id: "a",
      title: "Buy milk",
      completed: false,
    }
    const updated: Todo = { ...original, completed: true }
    fetchTodosMock.mockImplementation(async () => [original])
    updateTodoMock.mockImplementation(async () => updated)

    renderTodoView()
    await waitForLoaded()

    fireEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }))

    await waitFor(() => {
      expect(
        (screen.getByRole("checkbox", { name: "Buy milk" }) as HTMLInputElement)
          .checked,
      ).toBe(true)
    })

    expect(updateTodoMock).toHaveBeenCalledWith("a", { completed: true })
    expect(screen.getByText("0 items left")).toBeDefined()
  })

  it("deletes a todo through the list and shows the empty state", async () => {
    fetchTodosMock.mockImplementation(async () => [
      { id: "a", title: "Buy milk", completed: false },
    ])
    deleteTodoMock.mockImplementation(async () => undefined)

    renderTodoView()
    await waitForLoaded()

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Buy milk" }),
    )

    await waitFor(() => {
      expect(screen.queryByText("Buy milk")).toBeNull()
    })

    expect(deleteTodoMock).toHaveBeenCalledWith("a")
    expect(
      screen.getByText("No todos yet. Add your first one above."),
    ).toBeDefined()
    expect(screen.getByText("0 items left")).toBeDefined()
  })
})
