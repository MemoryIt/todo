import { useEffect, useRef } from "react"
import { useAgent } from "@copilotkit/react-core/v2"

/**
 * Invoke `onRunEnd` whenever an agent run transitions from running to idle.
 *
 * Server-side tools mutate data outside React state, so the caller uses this to
 * refresh the todo list once the agent finishes a turn.
 */
export function useRefreshOnRunEnd(
  agentId: string,
  onRunEnd: () => void,
): void {
  const { agent } = useAgent({ agentId })
  const wasRunning = useRef(agent.isRunning)
  const callback = useRef(onRunEnd)
  callback.current = onRunEnd

  useEffect(() => {
    if (wasRunning.current && !agent.isRunning) {
      callback.current()
    }

    wasRunning.current = agent.isRunning
  }, [agent.isRunning])
}
