import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test"
import { renderHook } from "@testing-library/react"

type AgentState = {
  isRunning: boolean
}

let agentState: AgentState = { isRunning: false }

const useAgentMock = mock(() => ({ agent: agentState }))

mock.module("@copilotkit/react-core/v2", () => ({
  useAgent: useAgentMock,
}))

const { useRefreshOnRunEnd } = await import(
  "../../../src/features/agent/useRefreshOnRunEnd"
)

beforeEach(() => {
  agentState = { isRunning: false }
  useAgentMock.mockClear()
})

afterAll(() => {
  mock.restore()
})

describe("useRefreshOnRunEnd", () => {
  it("passes the agent id to useAgent and does not run while idle", () => {
    const onRunEnd = mock(() => {})

    renderHook(() => useRefreshOnRunEnd("todo-agent", onRunEnd))

    expect(useAgentMock).toHaveBeenCalledWith({ agentId: "todo-agent" })
    expect(onRunEnd).not.toHaveBeenCalled()
  })

  it("does not fire when a run starts", () => {
    const onRunEnd = mock(() => {})
    const { rerender } = renderHook(() =>
      useRefreshOnRunEnd("todo-agent", onRunEnd),
    )

    agentState.isRunning = true
    rerender()

    expect(onRunEnd).not.toHaveBeenCalled()
  })

  it("fires once when a run transitions from running to idle", () => {
    const onRunEnd = mock(() => {})
    const { rerender } = renderHook(() =>
      useRefreshOnRunEnd("todo-agent", onRunEnd),
    )

    agentState.isRunning = true
    rerender()

    agentState.isRunning = false
    rerender()

    expect(onRunEnd).toHaveBeenCalledTimes(1)

    rerender()

    expect(onRunEnd).toHaveBeenCalledTimes(1)
  })

  it("uses the latest callback when the prop changes while running", () => {
    const first = mock(() => {})
    const second = mock(() => {})
    const { rerender } = renderHook(
      ({ callback }) => useRefreshOnRunEnd("todo-agent", callback),
      { initialProps: { callback: first } },
    )

    agentState.isRunning = true
    rerender({ callback: first })

    rerender({ callback: second })

    agentState.isRunning = false
    rerender({ callback: second })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
