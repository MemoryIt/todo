import type { Todo, TodoList } from 'shared'
import type { TodoStore } from './store'

export const TITLE_MAX_LENGTH = 200

export type TitleValidation =
  | { ok: true; title: string }
  | { ok: false; error: string }

export function validateTitle(value: unknown): TitleValidation {
  if (typeof value !== 'string') {
    return { ok: false, error: 'title must be a string' }
  }

  const title = value.trim()

  if (title.length === 0) {
    return { ok: false, error: 'title must not be empty' }
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `title must be at most ${TITLE_MAX_LENGTH} characters`,
    }
  }

  return { ok: true, title }
}

export type CompletedValidation =
  | { ok: true; completed: boolean }
  | { ok: false; error: string }

export function validateCompleted(value: unknown): CompletedValidation {
  if (typeof value !== 'boolean') {
    return { ok: false, error: 'completed must be a boolean' }
  }

  return { ok: true, completed: value }
}

export type TodoService = {
  listTodos(): TodoList
  createTodo(title: string): Todo
  setCompleted(id: string, completed: boolean): Todo | undefined
  removeTodo(id: string): boolean
}

/**
 * Business actions for todos. The store is injected so the domain does not
 * depend on a specific storage implementation.
 */
export function createTodoService(store: TodoStore): TodoService {
  return {
    listTodos: () => store.findAll(),

    createTodo: (title) =>
      store.save({
        id: crypto.randomUUID(),
        title,
        completed: false,
      }),

    setCompleted: (id, completed) => {
      const existing = store.findById(id)

      if (!existing) {
        return undefined
      }

      return store.save({ ...existing, completed })
    },

    removeTodo: (id) => store.deleteById(id),
  }
}
