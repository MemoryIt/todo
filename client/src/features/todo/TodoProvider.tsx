import { useMemo, type ReactNode } from 'react'
import {
  TodoActionsContext,
  TodoRefreshContext,
  TodoStateContext,
  type TodoActions,
  type TodoState,
} from './context'
import { useTodos } from './useTodos'

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
