import { MastraAgent } from "@ag-ui/mastra"
import { CopilotRuntime } from "@copilotkit/runtime/v2"
import type { TodoPort } from "shared"
import { createMastra } from "./mastra"
import { TODO_AGENT_ID } from "./agents/todo"

/**
 * CopilotKit runtime backed by the Mastra agents via the AG-UI bridge.
 *
 * Mastra is created lazily on the first run so a missing LLM configuration
 * never prevents the surrounding server from booting. The agents factory is
 * called per request, mirroring `getLocalAgents`.
 */
export function createRuntime(todoPort: TodoPort): CopilotRuntime {
  let mastra: ReturnType<typeof createMastra> | undefined

  const getMastra = () => (mastra ??= createMastra(todoPort))

  return new CopilotRuntime({
    agents: () => ({
      [TODO_AGENT_ID]: new MastraAgent({
        agent: getMastra().getAgent(TODO_AGENT_ID),
        resourceId: TODO_AGENT_ID,
      }),
    }),
  })
}
