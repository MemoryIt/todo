import { join } from 'node:path'
import { createAiApp } from '@todo/ai'
import { createServerApp } from './app'
import { DEFAULT_DATABASE_PATH, openDatabase } from './db'
import { createTodoService } from './domain'
import { createSqliteTodoStore } from './store'
import { createInProcessTodoPort } from './todoPort'

// Composition root: open the database, then build the store on top of it, then
// the domain service, then the HTTP adapters.
const db = openDatabase(process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH)
const store = createSqliteTodoStore(db)
const todoService = createTodoService(store)

// The AI edge runs in-process for now and only talks to data through the
// in-process TodoPort. It can later be served from its own entry point without
// changing the business code.
const todoPort = createInProcessTodoPort(todoService)
const ai = createAiApp({ todoPort })

const app = createServerApp({
  db,
  service: todoService,
  ai: ai.app,
  ...(process.env.NODE_ENV === 'production'
    ? { clientDist: join(import.meta.dir, '../../client/dist') }
    : {}),
})

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
