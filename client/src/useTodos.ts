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
      }
    },
    [],
  )

  const removeTodo = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.deleteTodo(id)
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
      setError(undefined)
      return true
    } catch (err) {
      setError(toMessage(err))
      return false
    }
  }, [])

  return { todos, loading, error, addTodo, toggleTodo, removeTodo }
}
