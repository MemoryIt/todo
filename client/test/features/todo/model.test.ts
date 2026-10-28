import { describe, expect, it } from "bun:test"
import type { TodoList } from "shared"
import {
  countActiveTodos,
  emptyMessages,
  filterTodos,
  type FilterValue,
} from "../../../src/features/todo/model"

const todos: TodoList = [
  { id: "a", title: "Active first", completed: false },
  { id: "b", title: "Completed middle", completed: true },
  { id: "c", title: "Active last", completed: false },
]

describe("filterTodos", () => {
  it("returns every todo for the all filter", () => {
    expect(filterTodos(todos, "all")).toEqual(todos)
  })

  it("returns only active todos", () => {
    expect(filterTodos(todos, "active")).toEqual([todos[0], todos[2]])
  })

  it("returns only completed todos", () => {
    expect(filterTodos(todos, "completed")).toEqual([todos[1]])
  })

  it("returns an empty list for an empty input", () => {
    for (const filter of ["all", "active", "completed"] as FilterValue[]) {
      expect(filterTodos([], filter)).toEqual([])
    }
  })

  it("preserves the original relative order", () => {
    const ordered: TodoList = [
      { id: "1", title: "First", completed: false },
      { id: "2", title: "Second", completed: false },
      { id: "3", title: "Third", completed: false },
    ]

    expect(filterTodos(ordered, "active").map((todo) => todo.id)).toEqual([
      "1",
      "2",
      "3",
    ])
  })
})

describe("countActiveTodos", () => {
  it("counts only incomplete todos", () => {
    expect(countActiveTodos(todos)).toBe(2)
  })

  it("returns zero when every todo is completed", () => {
    expect(
      countActiveTodos([{ id: "a", title: "Done", completed: true }]),
    ).toBe(0)
  })

  it("returns zero for an empty list", () => {
    expect(countActiveTodos([])).toBe(0)
  })

  it("returns the list length when every todo is active", () => {
    expect(
      countActiveTodos([
        { id: "a", title: "A", completed: false },
        { id: "b", title: "B", completed: false },
      ]),
    ).toBe(2)
  })
})

describe("emptyMessages", () => {
  it("provides a non-empty message for every filter", () => {
    for (const filter of ["all", "active", "completed"] as FilterValue[]) {
      expect(emptyMessages[filter].length).toBeGreaterThan(0)
    }
  })
})
