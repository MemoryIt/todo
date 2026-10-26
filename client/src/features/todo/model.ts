import type { TodoList } from 'shared'

export type FilterValue = 'all' | 'active' | 'completed'

export const emptyMessages: Record<FilterValue, string> = {
  all: 'No todos yet. Add your first one above.',
  active: 'No active todos. Nice work!',
  completed: 'No completed todos yet.',
}

export function filterTodos(todos: TodoList, filter: FilterValue): TodoList {
  if (filter === 'active') {
    return todos.filter((todo) => !todo.completed)
  }

  if (filter === 'completed') {
    return todos.filter((todo) => todo.completed)
  }

  return todos
}

export function countActiveTodos(todos: TodoList): number {
  return todos.filter((todo) => !todo.completed).length
}
