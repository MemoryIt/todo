import { CopilotSidebar } from "@copilotkit/react-core/v2"
import "@copilotkit/react-core/v2/styles.css"
import { AGENT_IDS } from "shared"
import { CopilotProvider } from "./CopilotProvider"
import { ErrorBoundary } from "./ErrorBoundary"
import { useRefreshOnRunEnd } from "./useRefreshOnRunEnd"

type TodoSidebarProps = {
  /** Called after an agent run finishes so the todo list can be refreshed. */
  onChanged: () => void
}

function Sidebar({ onChanged }: TodoSidebarProps) {
  useRefreshOnRunEnd(AGENT_IDS.todo, onChanged)

  return <CopilotSidebar />
}

/**
 * Collapsible CopilotKit chat sidebar for the Todo agent.
 *
 * The manual todo UI lives outside this provider, so a missing/misconfigured
 * LLM or a runtime failure only breaks the sidebar.
 */
export function TodoSidebar({ onChanged }: TodoSidebarProps) {
  return (
    <ErrorBoundary>
      <CopilotProvider agentId={AGENT_IDS.todo}>
        <Sidebar onChanged={onChanged} />
      </CopilotProvider>
    </ErrorBoundary>
  )
}
