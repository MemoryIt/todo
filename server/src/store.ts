import type { Todo, TodoList } from 'shared'

// Module-private in-memory store. This is the single source of truth for
// todos and is intentionally cleared whenever the process restarts.
const todos = new Map<string, Todo>()

export function findAll(): TodoList {
  // Map preserves insertion order, so reverse it to show the newest first.
  return Array.from(todos.values()).reverse()
}

export function findById(id: string): Todo | undefined {
  return todos.get(id)
}

export function save(todo: Todo): Todo {
  todos.set(todo.id, todo)
  return todo
}

export function deleteById(id: string): boolean {
  return todos.delete(id)
}
