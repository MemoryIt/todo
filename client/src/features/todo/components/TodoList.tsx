import type { Todo, TodoList as TodoListModel } from 'shared'

type ItemProps = {
  todo: Todo
  pending: boolean
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

function Item({ todo, pending, onToggle, onDelete }: ItemProps) {
  return (
    <li className={todo.completed ? 'todo-item completed' : 'todo-item'}>
      <label className="todo-label">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={pending}
          onChange={() => onToggle(todo.id, !todo.completed)}
        />
        <span className="todo-title">{todo.title}</span>
      </label>
      <button
        type="button"
        className="delete-button"
        aria-label={`Delete ${todo.title}`}
        disabled={pending}
        onClick={() => onDelete(todo.id)}
      >
        Delete
      </button>
    </li>
  )
}

type TodoListProps = {
  todos: TodoListModel
  emptyMessage: string
  pendingIds: Set<string>
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

export function TodoList({
  todos,
  emptyMessage,
  pendingIds,
  onToggle,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return <p className="empty">{emptyMessage}</p>
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <Item
          key={todo.id}
          todo={todo}
          pending={pendingIds.has(todo.id)}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
