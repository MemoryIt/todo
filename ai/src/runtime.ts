import { MastraAgent } from "@ag-ui/mastra"
import { CopilotRuntime } from "@copilotkit/runtime/v2"
import type { TodoPort } from "shared"
import { createMastra } from "./mastra"
import { createAiMemory, type AiMemory } from "./memory"
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
  let mastraPromise: Promise<ReturnType<typeof createMastra>> | undefined
  let aiMemory: AiMemory | undefined

  const createMastraInstance = async (): Promise<
    ReturnType<typeof createMastra>
  > => {
    const memory = createAiMemory()

    try {
      const mastra = createMastra(todoPort, memory)
      aiMemory = memory
      return mastra
    } catch (error) {
      await memory.close()
      throw error
    }
  }

  // Create the store only when an agent is actually requested, so a missing
  // LLM configuration still leaves the rest of the server bootable. The shared
  // promise prevents concurrent requests from opening the database twice, and
  // a failure clears it so a later request can retry initialization.
  const getMastra = () => {
    if (!mastraPromise) {
      mastraPromise = createMastraInstance().catch((error) => {
        mastraPromise = undefined
        throw error
      })
    }

    return mastraPromise
  }

  const runtime = new CopilotRuntime({
    agents: async ({ request }) => {
      const sessionId = await readAgUiThreadId(request)
      const mastra = await getMastra()

      return {
        [TODO_AGENT_ID]: new MastraAgent({
          agent: mastra.getAgent(TODO_AGENT_ID),
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
    // Mastra owns the tracing registry and the storage it was given. Shutting
    // it down flushes batched Langfuse spans and closes the memory database;
    // the explicit close is a safety net for a failed initialization.
    shutdown: async () => {
      const mastra = await mastraPromise?.catch(() => undefined)

      try {
        await mastra?.shutdown()
      } finally {
        await aiMemory?.close()
      }
    },
  }
}
