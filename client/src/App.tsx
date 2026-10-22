import { useMemo, useState } from 'react'
import type { TodoList } from 'shared'
import { useTodos } from './useTodos'
import { Composer, Filter, Stats } from './TodoControls'
import type { FilterValue } from './TodoControls'
import { List } from './TodoList'
import './App.css'

const emptyMessages: Record<FilterValue, string> = {
  all: 'No todos yet. Add your first one above.',
  active: 'No active todos. Nice work!',
  completed: 'No completed todos yet.',
}

function filterTodos(todos: TodoList, filter: FilterValue): TodoList {
  if (filter === 'active') {
    return todos.filter((todo) => !todo.completed)
  }

  if (filter === 'completed') {
    return todos.filter((todo) => todo.completed)
  }

  return todos
}

function App() {
  const { todos, loading, error, pendingIds, addTodo, toggleTodo, removeTodo } =
    useTodos()
  const [filter, setFilter] = useState<FilterValue>('all')

  const visibleTodos = useMemo(
    () => filterTodos(todos, filter),
    [todos, filter],
  )

  const activeCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  )

  return (
    <main className="todo-page">
      <h1>Todo</h1>
      <Composer onAdd={addTodo} />
      <Stats activeCount={activeCount} />
      <Filter value={filter} onChange={setFilter} />
      {loading ? (
        <p className="loading">Loading todos...</p>
      ) : (
        <List
          todos={visibleTodos}
          emptyMessage={emptyMessages[filter]}
          pendingIds={pendingIds}
          onToggle={toggleTodo}
          onDelete={removeTodo}
        />
      )}
      {error && <p className="error">Request failed: {error}</p>}
    </main>
  )
}

export default App
