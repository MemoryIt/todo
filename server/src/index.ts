import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { createAiApp } from '@todo/ai'
import { createTodoApi } from './api'
import { createTodoService } from './domain'
import { createInMemoryTodoStore } from './store'
import { createInProcessTodoPort } from './todoPort'

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

// The AI edge runs in-process for now and only talks to data through the
// in-process TodoPort. It can later be served from its own entry point without
// changing the business code.
const todoPort = createInProcessTodoPort(todoService)
app.route('/', createAiApp({ todoPort }))

// Unknown API routes must not fall through to the SPA.
app.all('/api/*', (c) => c.json({ error: 'Not Found' }, 404))

// In production the same process serves the built React client (SPA).
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(import.meta.dir, '../../client/dist')

  // Static assets (JS, CSS, images, ...).
  app.use('*', serveStatic({ root: clientDist }))
  // SPA fallback for any non-API route.
  app.get('*', serveStatic({ root: clientDist, path: 'index.html' }))
}

export default app
