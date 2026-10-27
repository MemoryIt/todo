import { Mastra } from "@mastra/core"
import { AGENT_IDS } from "shared"
import type { TodoPort } from "shared"
import { createTodoAgent, TODO_AGENT_ID } from "./agents/todo"
import type { AiMemory } from "./memory"
import { createObservability } from "./observability"

export type AgentFactory = () => ReturnType<typeof createTodoAgent>

/**
 * Single source of truth for the registered agent factories.
 *
 * The AI edge is a composition root: adding another application/agent means
 * adding a factory here and registering its id in `shared/src/agents.ts`.
 */
export function createAgentFactories(
  todoPort: TodoPort,
  aiMemory: AiMemory,
): Record<string, AgentFactory> {
  return {
    [TODO_AGENT_ID]: () => createTodoAgent(todoPort, aiMemory.memory),
  }
}

const knownAgentIds = new Set<string>(Object.values(AGENT_IDS))

/**
 * Build the shared Mastra instance for the current request scope.
 *
 * Created lazily by the runtime so the server stays bootable (health checks,
 * static hosting) even when the LLM_* variables are missing; the error only
 * surfaces when an agent is actually requested.
 */
export function createMastra(todoPort: TodoPort, aiMemory: AiMemory): Mastra {
  const factories = createAgentFactories(todoPort, aiMemory)
  const ids = Object.keys(factories)

  for (const id of ids) {
    if (!knownAgentIds.has(id)) {
      throw new Error(
        `Unknown agent id "${id}". Register it in shared/src/agents.ts.`,
      )
    }
  }

  const observability = createObservability()

  return new Mastra({
    agents: Object.fromEntries(ids.map((id) => [id, factories[id]!()])),
    // Registering the store at the Mastra level keeps Mastra from falling back
    // to its in-memory default; the agent memory above uses the same instance.
    storage: aiMemory.storage,
    ...(observability ? { observability } : {}),
  })
}
