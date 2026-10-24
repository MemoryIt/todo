import type { TodoPort } from "shared"
import { validateCompleted, validateTitle, type TodoService } from "./domain"

/**
 * In-process {@link TodoPort} backed by the existing domain service.
 *
 * Validation is re-applied here because the AI edge calls the service directly
 * and therefore bypasses the validation performed by the HTTP adapter.
 */
export function createInProcessTodoPort(service: TodoService): TodoPort {
  return {
    list: async () => service.listTodos(),

    create: async (title) => {
      const validated = validateTitle(title)

      if (!validated.ok) {
        return undefined
      }

      return service.createTodo(validated.title)
    },

    setCompleted: async (id, completed) => {
      const validated = validateCompleted(completed)

      if (!validated.ok) {
        return undefined
      }

      return service.setCompleted(id, validated.completed)
    },

    remove: async (id) => service.removeTodo(id),
  }
}
