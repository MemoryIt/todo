import { describe, expect, it } from "bun:test"

describe("client test environment", () => {
  it("provides a DOM document and window", () => {
    const element = document.createElement("div")
    element.textContent = "ready"

    expect(window).toBeDefined()
    expect(element.textContent).toBe("ready")
  })
})
