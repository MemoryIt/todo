import type { ReactNode } from "react"
import { CopilotKitProvider } from "@copilotkit/react-core/v2"

type CopilotProviderProps = {
  /** Agent id this subtree talks to. */
  agentId: string
  children: ReactNode
}

/**
 * Page-scoped CopilotKit v2 provider.
 *
 * The runtime is served by `@copilotkit/runtime/v2` in single-route mode, so the
 * transport is pinned to `single` instead of relying on auto-detection.
 */
export function CopilotProvider({ agentId, children }: CopilotProviderProps) {
  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      agentId={agentId}
      useSingleEndpoint
    >
      {children}
    </CopilotKitProvider>
  )
}
