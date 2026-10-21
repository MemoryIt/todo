import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Todo } from 'shared'
import * as domain from './domain'

const todoApi = new Hono()

async function readJsonObject(
  c: Context,
): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await c.req.json()

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return undefined
    }

    return body as Record<string, unknown>
  } catch {
    return undefined
  }
}

todoApi.get('/', (c) => {
  return c.json({ todos: domain.listTodos() }, 200)
})

todoApi.post('/', async (c) => {
  const body = await readJsonObject(c)

  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const title = domain.validateTitle(body.title)

  if (!title.ok) {
    return c.json({ error: title.error }, 400)
  }

  const todo: Todo = domain.createTodo(title.title)

  return c.json(todo, 201)
})

todoApi.patch('/:id', async (c) => {
  const body = await readJsonObject(c)

  if (!body) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  if (typeof body.completed !== 'boolean') {
    return c.json({ error: 'completed must be a boolean' }, 400)
  }

  const todo = domain.setCompleted(c.req.param('id'), body.completed)

  if (!todo) {
    return c.json({ error: 'Todo not found' }, 404)
  }

  return c.json(todo, 200)
})

todoApi.delete('/:id', (c) => {
  const removed = domain.removeTodo(c.req.param('id'))

  if (!removed) {
    return c.json({ error: 'Todo not found' }, 404)
  }

  return c.body(null, 204)
})

export default todoApi
