import type { Todo, TodoList } from "../types"

/**
 * Transport-agnostic todo data port used by the AI edge.
 *
 * The current implementation runs in-process and delegates to the server's
 * existing domain service. Keeping the surface asynchronous means a future
 * HTTP implementation can be swapped in without touching the agent tools.
 */
export type TodoPort = {
  list(): Promise<TodoList>
  create(title: string): Promise<Todo | undefined>
  setCompleted(id: string, completed: boolean): Promise<Todo | undefined>
  remove(id: string): Promise<boolean>
}
