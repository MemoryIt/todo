import { Hono } from "hono"
import { createCopilotHonoHandler } from "@copilotkit/runtime/v2/hono"
import type { TodoPort } from "shared"
import { createRuntime } from "./runtime"

export const COPILOT_BASE_PATH = "/api/copilotkit"

export type AiApp = {
  app: Hono
  shutdown: () => Promise<void>
}

/**
 * Hono app for the AI edge.
 *
 * `createCopilotHonoHandler` already scopes itself to `basePath`, so the
 * handler must be mounted at the root; mounting it under the same prefix would
 * double the path and 404.
 *
 * The app is embedded into the server process for now. Because it only exposes
 * an HTTP surface, it can later be served from its own entry point without
 * touching the business code.
 */
export function createAiApp({ todoPort }: { todoPort: TodoPort }): AiApp {
  const { runtime, shutdown } = createRuntime(todoPort)
  const app = new Hono()

  app.route(
    "/",
    createCopilotHonoHandler({
      runtime,
      basePath: COPILOT_BASE_PATH,
      mode: "single-route",
    }),
  )

  return { app, shutdown }
}
