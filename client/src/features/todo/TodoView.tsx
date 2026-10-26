import { useMemo, useState } from 'react'
import './todo.css'
import { Composer } from './components/Composer'
import { Filter } from './components/Filter'
import { Stats } from './components/Stats'
import { TodoList } from './components/TodoList'
import { useTodoActions, useTodoState } from './TodoProvider'
import type { FilterValue } from './model'
import {
  countActiveTodos,
  emptyMessages,
  filterTodos,
} from './model'

export function TodoView() {
  const { todos, loading, error, pendingIds } = useTodoState()
  const { addTodo, toggleTodo, removeTodo } = useTodoActions()
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
    <>
      <h1>Todo</h1>
      <Composer onAdd={addTodo} />
      <Stats activeCount={activeCount} />
      <Filter value={filter} onChange={setFilter} />
      {loading ? (
        <p className="loading">Loading todos...</p>
      ) : (
        <TodoList
          todos={visibleTodos}
          emptyMessage={emptyMessages[filter]}
          pendingIds={pendingIds}
          onToggle={toggleTodo}
          onDelete={removeTodo}
        />
      )}
      {error && <p className="error">Request failed: {error}</p>}
    </>
  )
}
