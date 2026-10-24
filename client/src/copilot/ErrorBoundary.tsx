import { Component, type ErrorInfo, type ReactNode } from "react"

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error?: Error
}

/**
 * Surfaces render-time failures instead of leaving a blank page.
 *
 * Used to wrap the agent sidebar so a missing LLM configuration or a runtime
 * error never takes down the manual todo UI.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Agent failed", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="agent-error" role="alert">
          <p>Agent failed to load: {this.state.error.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}
