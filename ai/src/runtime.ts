import { MastraAgent } from "@ag-ui/mastra"
import { CopilotRuntime } from "@copilotkit/runtime/v2"
import type { TodoPort } from "shared"
import { createMastra } from "./mastra"
import { TODO_AGENT_ID } from "./agents/todo"

/**
 * Read the AG-UI conversation id from a CopilotKit request.
 *
 * The agents factory runs per request (and also for informational routes such
 * as `/info`), so use a cloned body and tolerate requests without one.
 */
async function readAgUiThreadId(
  request: Request,
): Promise<string | undefined> {
  if (request.method !== "POST") return undefined

  const contentType = request.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) return undefined

  try {
    const body: unknown = await request.clone().json()

    if (
      body !== null &&
      typeof body === "object" &&
      "threadId" in body &&
      typeof body.threadId === "string" &&
      body.threadId.length > 0
    ) {
      return body.threadId
    }
  } catch {
    // Routes such as `/info` do not carry an AG-UI run body.
  }

  return undefined
}

export type AiRuntime = {
  runtime: CopilotRuntime
  shutdown: () => Promise<void>
}

/**
 * CopilotKit runtime backed by the Mastra agents via the AG-UI bridge.
 *
 * Mastra is created lazily on the first run so a missing LLM configuration
 * never prevents the surrounding server from booting. The agents factory is
 * called per request, mirroring `getLocalAgents`.
 */
export function createRuntime(todoPort: TodoPort): AiRuntime {
  let mastra: ReturnType<typeof createMastra> | undefined

  const getMastra = () => (mastra ??= createMastra(todoPort))

  const runtime = new CopilotRuntime({
    agents: async ({ request }) => {
      const sessionId = await readAgUiThreadId(request)

      return {
        [TODO_AGENT_ID]: new MastraAgent({
          agent: getMastra().getAgent(TODO_AGENT_ID),
          resourceId: TODO_AGENT_ID,
          // Langfuse derives its session from this metadata. A MastraAgent is
          // created per request, so the ids never leak across conversations.
          tracingOptions: sessionId
            ? { metadata: { sessionId } }
            : undefined,
        }),
      }
    },
  })

  return {
    runtime,
    // Mastra owns the tracing registry; shutting it down flushes batched
    // Langfuse spans before the process exits.
    shutdown: async () => {
      await mastra?.shutdown()
    },
  }
}
