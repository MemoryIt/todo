import { beforeEach, describe, expect, it } from "bun:test"
import type { TodoService } from "../../src/domain"

/**
 * Behavioural contract every {@link TodoService} must satisfy, regardless of
 * which {@link TodoStore} backs it.
 *
 * Both the in-memory and the SQLite store suites run this same spec, so the
 * storage swap can be validated without duplicating expectations.
 */
export function runTodoServiceContract(
  label: string,
  createService: () => TodoService,
): void {
  describe(label, () => {
    let service: TodoService

    beforeEach(() => {
      service = createService()
    })

    it("starts with an empty list", () => {
      expect(service.listTodos()).toEqual([])
    })

    it("creates a todo with a generated id and incomplete state", () => {
      const todo = service.createTodo("Write tests")

      expect(todo.id).toBeString()
      expect(todo.id.length).toBeGreaterThan(0)
      expect(todo.title).toBe("Write tests")
      expect(todo.completed).toBe(false)
      expect(service.listTodos()).toEqual([todo])
    })

    it("generates a distinct id per todo", () => {
      const a = service.createTodo("A")
      const b = service.createTodo("B")

      expect(a.id).not.toBe(b.id)
    })

    it("lists the most recently created todo first", () => {
      const a = service.createTodo("A")
      const b = service.createTodo("B")
      const c = service.createTodo("C")

      expect(service.listTodos().map((todo) => todo.id)).toEqual([
        c.id,
        b.id,
        a.id,
      ])
    })

    it("marks a todo completed and persists the change", () => {
      const created = service.createTodo("Ship it")

      const updated = service.setCompleted(created.id, true)

      expect(updated).toEqual({ ...created, completed: true })
      expect(service.listTodos()).toEqual([{ ...created, completed: true }])
    })

    it("can cancel completion again", () => {
      const created = service.createTodo("Ship it")
      service.setCompleted(created.id, true)

      const updated = service.setCompleted(created.id, false)

      expect(updated?.completed).toBe(false)
    })

    it("keeps id and title untouched when toggling completion", () => {
      const created = service.createTodo("Ship it")

      const updated = service.setCompleted(created.id, true)

      expect(updated?.id).toBe(created.id)
      expect(updated?.title).toBe(created.title)
    })

    it("does not change list position when toggling completion", () => {
      const a = service.createTodo("A")
      const b = service.createTodo("B")

      service.setCompleted(a.id, true)

      expect(service.listTodos().map((todo) => todo.id)).toEqual([b.id, a.id])
    })

    it("returns undefined when completing an unknown id", () => {
      expect(service.setCompleted("missing", true)).toBeUndefined()
    })

    it("removes a todo and reports whether it existed", () => {
      const created = service.createTodo("Throwaway")

      expect(service.removeTodo(created.id)).toBe(true)
      expect(service.listTodos()).toEqual([])
      expect(service.removeTodo(created.id)).toBe(false)
    })

    it("leaves other todos in place when one is removed", () => {
      const a = service.createTodo("A")
      const b = service.createTodo("B")

      expect(service.removeTodo(b.id)).toBe(true)
      expect(service.listTodos()).toEqual([a])
    })
  })
}
