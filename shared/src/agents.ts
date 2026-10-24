/**
 * Stable agent ids shared by client, server and the AI edge.
 *
 * The value is the single source of truth so the client, the server-side agent
 * registry and the CopilotKit runtime can never silently diverge.
 */
export const AGENT_IDS = {
  todo: "todo-agent",
} as const

export type AgentId = (typeof AGENT_IDS)[keyof typeof AGENT_IDS]
