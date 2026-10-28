import { afterEach } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register({ url: "http://localhost" })

// Load Testing Library only after the DOM globals exist. Its `screen` export
// binds to `document.body` at import time.
const { cleanup } = await import("@testing-library/react")

afterEach(() => {
  cleanup()
})
