import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { createAiApp } from '@todo/ai'
import { createTodoApi } from './api'
import { checkDatabase, DEFAULT_DATABASE_PATH, openDatabase } from './db'
import { createTodoService } from './domain'
import { createSqliteTodoStore } from './store'
import { createInProcessTodoPort } from './todoPort'

const app = new Hono()

app.use(cors())

// Composition root: open the database, then build the store on top of it, then
// the domain service, then mount the HTTP adapter.
const db = openDatabase(process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH)
const store = createSqliteTodoStore(db)
const todoService = createTodoService(store)

app.get('/api/health', (c) => {
  const database = checkDatabase(db)

  return c.json({ ok: database, database }, database ? 200 : 503)
})

app.route('/api/todo', createTodoApi(todoService))

// The AI edge runs in-process for now and only talks to data through the
// in-process TodoPort. It can later be served from its own entry point without
// changing the business code.
const todoPort = createInProcessTodoPort(todoService)
const ai = createAiApp({ todoPort })
app.route('/', ai.app)

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

// Release the database file (and flush WAL) when the process is asked to stop.
// The AI edge is shut down first so batched observability spans reach Langfuse.
let closing = false

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (closing) return

  closing = true

  try {
    await ai.shutdown()
  } catch (error) {
    console.error('Failed to shut down the AI edge', error)
  } finally {
    try {
      db.close()
    } finally {
      process.exit(signal === 'SIGINT' ? 130 : 143)
    }
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
