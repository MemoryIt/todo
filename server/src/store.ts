import type { Database } from 'bun:sqlite'
import type { Todo, TodoList } from 'shared'
import { rowToTodo, type TodoRow } from './db'

/**
 * Storage contract for todos. The domain layer depends on this interface
 * instead of a concrete implementation, so the backing store can be swapped
 * without touching business rules.
 */
export type TodoStore = {
  findAll(): TodoList
  findById(id: string): Todo | undefined
  save(todo: Todo): Todo
  deleteById(id: string): boolean
}

/**
 * In-memory implementation. The Map is private to each store instance and is
 * intentionally cleared whenever the process restarts.
 */
export function createInMemoryTodoStore(): TodoStore {
  const todos = new Map<string, Todo>()

  return {
    // Map preserves insertion order, so reverse it to show the newest first.
    findAll: () => Array.from(todos.values()).reverse(),
    findById: (id) => todos.get(id),
    save: (todo) => {
      todos.set(todo.id, todo)
      return todo
    },
    deleteById: (id) => todos.delete(id),
  }
}

/**
 * SQLite implementation of {@link TodoStore}.
 *
 * All statements are synchronous (`bun:sqlite`) and prepared once per store,
 * which matches the synchronous {@link TodoStore} contract without forcing the
 * domain or HTTP layers to become async.
 */
export function createSqliteTodoStore(db: Database): TodoStore {
  // `created_at DESC` reproduces the "newest first" ordering of the in-memory
  // store; the rowid tie-breaks todos created within the same millisecond.
  const selectAll = db.query<TodoRow, []>(
    `SELECT id, title, completed, created_at
       FROM todos
      ORDER BY created_at DESC, rowid DESC`,
  )

  const selectById = db.query<TodoRow, [string]>(
    `SELECT id, title, completed, created_at
       FROM todos
      WHERE id = ?`,
  )

  // Upsert: `created_at` is deliberately left untouched on conflict so that
  // updating a todo keeps its position in the list.
  const upsert = db.query<never, [string, string, number, number]>(
    `INSERT INTO todos (id, title, completed, created_at)
          VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
            title     = excluded.title,
            completed = excluded.completed`,
  )

  const deleteStatement = db.query<never, [string]>(
    'DELETE FROM todos WHERE id = ?',
  )

  return {
    findAll: () => selectAll.all().map(rowToTodo),

    findById: (id) => {
      const row = selectById.get(id)

      return row ? rowToTodo(row) : undefined
    },

    save: (todo) => {
      upsert.run(todo.id, todo.title, todo.completed ? 1 : 0, Date.now())

      return todo
    },

    deleteById: (id) => deleteStatement.run(id).changes > 0,
  }
}
