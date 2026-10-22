import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { createTodoApi } from './api'
import { createTodoService } from './domain'
import { createInMemoryTodoStore } from './store'

const app = new Hono()

app.use(cors())

app.get('/api/health', (c) => {
  return c.json({ ok: true }, 200)
})

// Composition root: build the store, then the domain service on top of it,
// then mount the HTTP adapter.
const store = createInMemoryTodoStore()
const todoService = createTodoService(store)

app.route('/api/todo', createTodoApi(todoService))

// In production the same process serves the built React client (SPA).
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(import.meta.dir, '../../client/dist')

  // Static assets (JS, CSS, images, ...).
  app.use('*', serveStatic({ root: clientDist }))
  // SPA fallback for any non-API route.
  app.get('*', serveStatic({ root: clientDist, path: 'index.html' }))
}

export default app
