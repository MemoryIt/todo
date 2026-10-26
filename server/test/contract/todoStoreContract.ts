import { beforeEach, describe, expect, it } from "bun:test"
import type { Todo } from "shared"
import type { TodoStore } from "../../src/store"

function makeTodo(id: string, title = `Todo ${id}`): Todo {
  return { id, title, completed: false }
}

/**
 * Behavioural contract every {@link TodoStore} must satisfy.
 *
 * These expectations encode the semantics the rest of the server already
 * relies on (newest-first ordering, upsert-by-id, delete reporting), so a new
 * backing store can be swapped in without touching the domain.
 */
export function runTodoStoreContract(
  label: string,
  createStore: () => TodoStore,
): void {
  describe(label, () => {
    let store: TodoStore

    beforeEach(() => {
      store = createStore()
    })

    it("returns an empty list when nothing is stored", () => {
      expect(store.findAll()).toEqual([])
    })

    it("saves a todo and finds it by id", () => {
      const todo = makeTodo("a")

      expect(store.save(todo)).toEqual(todo)
      expect(store.findById("a")).toEqual(todo)
    })

    it("returns undefined for an unknown id", () => {
      expect(store.findById("missing")).toBeUndefined()
    })

    it("overwrites an existing todo when saving the same id", () => {
      const todo = makeTodo("a")
      store.save(todo)

      store.save({ ...todo, title: "Renamed", completed: true })

      expect(store.findById("a")).toEqual({
        id: "a",
        title: "Renamed",
        completed: true,
      })
      expect(store.findAll()).toHaveLength(1)
    })

    it("lists the most recently created todo first", () => {
      store.save(makeTodo("a"))
      store.save(makeTodo("b"))
      store.save(makeTodo("c"))

      expect(store.findAll().map((todo) => todo.id)).toEqual(["c", "b", "a"])
    })

    it("keeps the position of a todo that is updated in place", () => {
      store.save(makeTodo("a"))
      store.save(makeTodo("b"))

      store.save({ ...makeTodo("a"), completed: true })

      expect(store.findAll().map((todo) => todo.id)).toEqual(["b", "a"])
    })

    it("deletes a todo and reports whether it existed", () => {
      store.save(makeTodo("a"))

      expect(store.deleteById("a")).toBe(true)
      expect(store.findById("a")).toBeUndefined()
      expect(store.findAll()).toEqual([])
      expect(store.deleteById("a")).toBe(false)
    })
  })
}
