import { useCallback, useEffect, useState } from 'react'
import type { Todo, TodoList } from 'shared'
import * as api from './api'

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoList>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await api.fetchTodos()
        if (cancelled) {
          return
        }
        setTodos(data)
        setError(undefined)
      } catch (err) {
        if (cancelled) {
          return
        }
        setError(toMessage(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev)

      if (pending) {
        next.add(id)
      } else {
        next.delete(id)
      }

      return next
    })
  }, [])

  const addTodo = useCallback(
    async (title: string): Promise<Todo | undefined> => {
      try {
        const created = await api.createTodo({ title })
        setTodos((prev) => [created, ...prev])
        setError(undefined)
        return created
      } catch (err) {
        setError(toMessage(err))
        return undefined
      }
    },
    [],
  )

  const toggleTodo = useCallback(
    async (id: string, completed: boolean): Promise<Todo | undefined> => {
      markPending(id, true)

      try {
        const updated = await api.updateTodo(id, { completed })
        setTodos((prev) =>
          prev.map((todo) => (todo.id === id ? updated : todo)),
        )
        setError(undefined)
        return updated
      } catch (err) {
        setError(toMessage(err))
        return undefined
      } finally {
        markPending(id, false)
      }
    },
    [markPending],
  )

  const removeTodo = useCallback(
    async (id: string): Promise<boolean> => {
      markPending(id, true)

      try {
        await api.deleteTodo(id)
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
        setError(undefined)
        return true
      } catch (err) {
        setError(toMessage(err))
        return false
      } finally {
        markPending(id, false)
      }
    },
    [markPending],
  )

  const refetch = useCallback(async (): Promise<TodoList | undefined> => {
    try {
      const data = await api.fetchTodos()
      setTodos(data)
      setError(undefined)
      return data
    } catch (err) {
      setError(toMessage(err))
      return undefined
    }
  }, [])

  return {
    todos,
    loading,
    error,
    pendingIds,
    addTodo,
    toggleTodo,
    removeTodo,
    refetch,
  }
}
