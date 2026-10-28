import type { Todo, TodoPort } from "shared"

const TITLE_MAX_LENGTH = 200

function normalizeTitle(value: string): string | undefined {
  const title = value.trim()

  if (title.length === 0 || title.length > TITLE_MAX_LENGTH) {
    return undefined
  }

  return title
}

/**
 * In-memory TodoPort used by the eval cases.
 *
 * Title validation mirrors the server domain so invalid tool calls behave the
 * same way as in production. Listing reverses insertion order to match the
 * newest-first ordering of the SQLite store.
 */
export function createMemoryTodoPort(
  initial: readonly Todo[] = [],
): TodoPort {
  const todos = new Map(
    initial.map((todo) => [todo.id, { ...todo }]),
  )

  return {
    list: async () =>
      Array.from(todos.values())
        .reverse()
        .map((todo) => ({ ...todo })),

    create: async (title) => {
      const normalized = normalizeTitle(title)

      if (!normalized) {
        return undefined
      }

      const todo: Todo = {
        id: crypto.randomUUID(),
        title: normalized,
        completed: false,
      }

      todos.set(todo.id, todo)

      return { ...todo }
    },

    setCompleted: async (id, completed) => {
      const existing = todos.get(id)

      if (!existing) {
        return undefined
      }

      const todo = { ...existing, completed }
      todos.set(id, todo)

      return { ...todo }
    },

    remove: async (id) => todos.delete(id),
  }
}
