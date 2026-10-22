import type { Todo, TodoList } from 'shared'

/**
 * Storage contract for todos. The domain layer depends on this interface
 * instead of a concrete implementation, so the backing store can be swapped
 * without touching business rules.
 */
export type TodoStore = {
  findAll(): TodoList
  findById(id: string): Todo | undefined
  save(todo: Todo): Todo
  deleteById(id: string): boolean
}

/**
 * In-memory implementation. The Map is private to each store instance and is
 * intentionally cleared whenever the process restarts.
 */
export function createInMemoryTodoStore(): TodoStore {
  const todos = new Map<string, Todo>()

  return {
    // Map preserves insertion order, so reverse it to show the newest first.
    findAll: () => Array.from(todos.values()).reverse(),
    findById: (id) => todos.get(id),
    save: (todo) => {
      todos.set(todo.id, todo)
      return todo
    },
    deleteById: (id) => todos.delete(id),
  }
}
