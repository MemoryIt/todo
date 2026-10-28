import { describe, expect, it, spyOn } from "bun:test"
import { render, screen } from "@testing-library/react"
import { ErrorBoundary } from "../../../src/features/agent/ErrorBoundary"

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("boom")
  }

  return <p>sidebar content</p>
}

describe("ErrorBoundary", () => {
  it("renders children while there is no error", () => {
    render(
      <ErrorBoundary>
        <p>sidebar content</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText("sidebar content")).toBeDefined()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("renders the fallback instead of the failed children", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {})

    try {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </ErrorBoundary>,
      )

      expect(screen.getByText("sidebar content")).toBeDefined()

      rerender(
        <ErrorBoundary>
          <ThrowingChild shouldThrow />
        </ErrorBoundary>,
      )

      expect(screen.getByRole("alert")).toBeDefined()
      expect(
        screen.getByText("Agent failed to load: boom"),
      ).toBeDefined()
      expect(screen.queryByText("sidebar content")).toBeNull()
    } finally {
      consoleError.mockRestore()
    }
  })

  it("logs the caught error", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {})

    try {
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow />
        </ErrorBoundary>,
      )

      expect(
        consoleError.mock.calls.some((call) => call[0] === "Agent failed"),
      ).toBe(true)
    } finally {
      consoleError.mockRestore()
    }
  })
})
