import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Todo, TodoList } from 'shared'
import { useTodos } from './useTodos'

type TodoState = {
  todos: TodoList
  loading: boolean
  error?: string
  pendingIds: Set<string>
}

type TodoActions = {
  addTodo: (title: string) => Promise<Todo | undefined>
  toggleTodo: (id: string, completed: boolean) => Promise<Todo | undefined>
  removeTodo: (id: string) => Promise<boolean>
}

type TodoRefresh = () => Promise<TodoList | undefined>

const TodoStateContext = createContext<TodoState | undefined>(undefined)
const TodoActionsContext = createContext<TodoActions | undefined>(undefined)
const TodoRefreshContext = createContext<TodoRefresh | undefined>(undefined)

export function TodoProvider({ children }: { children: ReactNode }) {
  const {
    todos,
    loading,
    error,
    pendingIds,
    addTodo,
    toggleTodo,
    removeTodo,
    refetch,
  } = useTodos()

  const state = useMemo<TodoState>(
    () => ({ todos, loading, error, pendingIds }),
    [todos, loading, error, pendingIds],
  )

  const actions = useMemo<TodoActions>(
    () => ({ addTodo, toggleTodo, removeTodo }),
    [addTodo, toggleTodo, removeTodo],
  )

  return (
    <TodoStateContext.Provider value={state}>
      <TodoActionsContext.Provider value={actions}>
        <TodoRefreshContext.Provider value={refetch}>
          {children}
        </TodoRefreshContext.Provider>
      </TodoActionsContext.Provider>
    </TodoStateContext.Provider>
  )
}

export function useTodoState(): TodoState {
  const context = useContext(TodoStateContext)

  if (!context) {
    throw new Error('useTodoState must be used within TodoProvider')
  }

  return context
}

export function useTodoActions(): TodoActions {
  const context = useContext(TodoActionsContext)

  if (!context) {
    throw new Error('useTodoActions must be used within TodoProvider')
  }

  return context
}

export function useTodoRefresh(): TodoRefresh {
  const context = useContext(TodoRefreshContext)

  if (!context) {
    throw new Error('useTodoRefresh must be used within TodoProvider')
  }

  return context
}
