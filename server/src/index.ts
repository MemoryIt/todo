import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import todoApi from './api'

const app = new Hono()

app.use(cors())

app.get('/api/health', (c) => {
  return c.json({ ok: true }, 200)
})

app.route('/api/todo', todoApi)

// In production the same process serves the built React client (SPA).
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(import.meta.dir, '../../client/dist')

  // Static assets (JS, CSS, images, ...).
  app.use('*', serveStatic({ root: clientDist }))
  // SPA fallback for any non-API route.
  app.get('*', serveStatic({ root: clientDist, path: 'index.html' }))
}

export default app
