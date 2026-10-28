import { describe, expect, it, mock } from "bun:test"
import { fireEvent, render, screen, within } from "@testing-library/react"
import type { TodoList as TodoListModel } from "shared"
import { TodoList } from "../../../../src/features/todo/components/TodoList"

const todos: TodoListModel = [
  { id: "a", title: "Buy milk", completed: false },
  { id: "b", title: "Write report", completed: true },
]

function renderList({
  items = todos,
  emptyMessage = "Nothing here",
  pendingIds = new Set<string>(),
  onToggle = mock(() => {}),
  onDelete = mock(() => {}),
} = {}) {
  render(
    <TodoList
      todos={items}
      emptyMessage={emptyMessage}
      pendingIds={pendingIds}
      onToggle={onToggle}
      onDelete={onDelete}
    />,
  )

  return { onToggle, onDelete }
}

describe("TodoList", () => {
  it("shows the empty message and no list when there are no todos", () => {
    renderList({ items: [], emptyMessage: "No todos yet" })

    expect(screen.getByText("No todos yet")).toBeDefined()
    expect(screen.queryByRole("list")).toBeNull()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
  })

  it("renders todos in order with their completion state", () => {
    renderList()

    const items = screen.getAllByRole("listitem")
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[]

    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText("Buy milk")).toBeDefined()
    expect(within(items[1]!).getByText("Write report")).toBeDefined()
    expect(checkboxes[0]!.checked).toBe(false)
    expect(checkboxes[1]!.checked).toBe(true)
  })

  it("marks an incomplete todo as completed", () => {
    const { onToggle } = renderList()

    fireEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith("a", true)
  })

  it("cancels completion for a completed todo", () => {
    const { onToggle } = renderList()

    fireEvent.click(screen.getByRole("checkbox", { name: "Write report" }))

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith("b", false)
  })

  it("deletes the selected todo via its accessible button", () => {
    const { onDelete } = renderList()

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Buy milk" }),
    )

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith("a")
  })

  it("disables controls for pending todos only", () => {
    renderList({ pendingIds: new Set(["a"]) })

    const pendingCheckbox = screen.getByRole("checkbox", {
      name: "Buy milk",
    }) as HTMLInputElement
    const pendingDelete = screen.getByRole("button", {
      name: "Delete Buy milk",
    }) as HTMLButtonElement
    const readyCheckbox = screen.getByRole("checkbox", {
      name: "Write report",
    }) as HTMLInputElement
    const readyDelete = screen.getByRole("button", {
      name: "Delete Write report",
    }) as HTMLButtonElement

    expect(pendingCheckbox.disabled).toBe(true)
    expect(pendingDelete.disabled).toBe(true)
    expect(readyCheckbox.disabled).toBe(false)
    expect(readyDelete.disabled).toBe(false)
  })

  it("only triggers the callback for the clicked item", () => {
    const { onDelete } = renderList()

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Write report" }),
    )

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith("b")
  })
})
