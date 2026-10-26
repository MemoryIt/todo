import { useContext } from 'react'
import {
  TodoActionsContext,
  TodoRefreshContext,
  TodoStateContext,
  type TodoActions,
  type TodoRefresh,
  type TodoState,
} from './context'

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
