import { join } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import type { ApiResponse } from 'shared'

const app = new Hono()

app.use(cors())

app.get('/api/health', (c) => {
  return c.json({ ok: true }, 200)
})

app.get('/hello', async (c) => {

  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true
  }

  return c.json(data, { status: 200 })
})

// In production the same process serves the built React client (SPA).
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(import.meta.dir, '../../client/dist')

  // Static assets (JS, CSS, images, ...).
  app.use('*', serveStatic({ root: clientDist }))
  // SPA fallback for any non-API route.
  app.get('*', serveStatic({ root: clientDist, path: 'index.html' }))
} else {
  app.get('/', (c) => {
    return c.text('Hello Hono!')
  })
}

export default app
