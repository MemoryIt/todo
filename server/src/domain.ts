import type { Todo, TodoList } from 'shared'
import * as store from './store'

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

export function listTodos(): TodoList {
  return store.findAll()
}

export function createTodo(title: string): Todo {
  const todo: Todo = {
    id: crypto.randomUUID(),
    title,
    completed: false,
  }

  return store.save(todo)
}

export function setCompleted(id: string, completed: boolean): Todo | undefined {
  const existing = store.findById(id)

  if (!existing) {
    return undefined
  }

  return store.save({ ...existing, completed })
}

export function removeTodo(id: string): boolean {
  return store.deleteById(id)
}
