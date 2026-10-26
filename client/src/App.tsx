import { useMemo, useState } from 'react'
import { useTodos } from './useTodos'
import { Composer, Filter, Stats } from './TodoControls'
import type { FilterValue } from './features/todo/model'
import {
  countActiveTodos,
  emptyMessages,
  filterTodos,
} from './features/todo/model'
import { List } from './TodoList'
import { TodoSidebar } from './copilot/TodoSidebar'
import './App.css'

function App() {
  const { todos, loading, error, pendingIds, addTodo, toggleTodo, removeTodo, refetch } =
    useTodos()
  const [filter, setFilter] = useState<FilterValue>('all')

  const visibleTodos = useMemo(
    () => filterTodos(todos, filter),
    [todos, filter],
  )

  const activeCount = useMemo(
    () => countActiveTodos(todos),
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
      <TodoSidebar onChanged={refetch} />
    </main>
  )
}

export default App
