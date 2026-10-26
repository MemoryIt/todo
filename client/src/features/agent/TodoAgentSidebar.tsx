import { CopilotSidebar } from "@copilotkit/react-core/v2"
import "@copilotkit/react-core/v2/styles.css"
import { AGENT_IDS } from "shared"
import { useTodoRefresh } from "../todo"
import { CopilotProvider } from "./CopilotProvider"
import { ErrorBoundary } from "./ErrorBoundary"
import { useRefreshOnRunEnd } from "./useRefreshOnRunEnd"

function Sidebar() {
  const refresh = useTodoRefresh()
  useRefreshOnRunEnd(AGENT_IDS.todo, refresh)

  // Collapsed by default; the built-in toggle button on the right opens it.
  return <CopilotSidebar defaultOpen={false} position="right" />
}

/**
 * Collapsible CopilotKit chat sidebar for the Todo agent.
 *
 * The manual todo UI lives outside this provider, so a missing/misconfigured
 * LLM or a runtime failure only breaks the sidebar.
 */
export function TodoAgentSidebar() {
  return (
    <ErrorBoundary>
      <CopilotProvider agentId={AGENT_IDS.todo}>
        <Sidebar />
      </CopilotProvider>
    </ErrorBoundary>
  )
}
