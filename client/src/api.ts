import type {
  CreateTodoInput,
  Todo,
  TodoList,
  UpdateTodoInput,
} from 'shared'

const jsonHeaders = { 'content-type': 'application/json' }

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) {
      return body.error
    }
  } catch {
    // Fall through to a generic message when the body is not JSON.
  }

  return `HTTP ${res.status}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)

  if (!res.ok) {
    throw new Error(await readError(res))
  }

  return (await res.json()) as T
}

export async function fetchTodos(): Promise<TodoList> {
  const body = await request<{ todos: TodoList }>('/api/todo')
  return body.todos
}

export function createTodo(input: CreateTodoInput): Promise<Todo> {
  return request<Todo>('/api/todo', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(input),
  })
}

export function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  return request<Todo>(`/api/todo/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(input),
  })
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todo/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    throw new Error(await readError(res))
  }
}
