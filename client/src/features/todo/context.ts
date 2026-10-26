import { createContext } from 'react'
import type { Todo, TodoList } from 'shared'

export type TodoState = {
  todos: TodoList
  loading: boolean
  error?: string
  pendingIds: Set<string>
}

export type TodoActions = {
  addTodo: (title: string) => Promise<Todo | undefined>
  toggleTodo: (id: string, completed: boolean) => Promise<Todo | undefined>
  removeTodo: (id: string) => Promise<boolean>
}

export type TodoRefresh = () => Promise<TodoList | undefined>

export const TodoStateContext = createContext<TodoState | undefined>(undefined)
export const TodoActionsContext = createContext<TodoActions | undefined>(undefined)
export const TodoRefreshContext = createContext<TodoRefresh | undefined>(undefined)
