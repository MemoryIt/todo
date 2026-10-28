import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test"
import { AGENT_IDS } from "shared"
import type { TodoPort } from "shared"

const AGENT_ID = AGENT_IDS.todo
const ENDPOINT = "http://localhost/api/copilotkit"

const port: TodoPort = {
  list: async () => [],
  create: async () => undefined,
  setCompleted: async () => undefined,
  remove: async () => false,
}

type AgentsFactory = (context: {
  request: Request
}) => Promise<Record<string, unknown>>

let capturedAgents: AgentsFactory | undefined

class FakeCopilotRuntime {
  constructor(options: { agents: AgentsFactory }) {
    capturedAgents = options.agents
  }
}

type FakeMastraAgentConfig = {
  agent: unknown
  resourceId?: string
  tracingOptions?: {
    metadata?: Record<string, unknown>
  }
}

const mastraAgentConfigs: FakeMastraAgentConfig[] = []

class FakeMastraAgent {
  constructor(config: FakeMastraAgentConfig) {
    mastraAgentConfigs.push(config)
  }
}

let fakeAgent: { id: string }
let fakeMastra: {
  getAgent: ReturnType<typeof mock>
  shutdown: ReturnType<typeof mock>
}

const createMastraMock = mock(async () => fakeMastra)

mock.module("@copilotkit/runtime/v2", () => ({
  CopilotRuntime: FakeCopilotRuntime,
}))

mock.module("@ag-ui/mastra", () => ({
  MastraAgent: FakeMastraAgent,
}))

mock.module("../src/mastra", () => ({
  createMastra: createMastraMock,
}))

const { createRuntime } = await import("../src/runtime")

function startRuntime() {
  const result = createRuntime(port)

  if (!capturedAgents) {
    throw new Error("CopilotRuntime did not capture an agents factory")
  }

  return { ...result, agents: capturedAgents }
}

function getRequest(): Request {
  return new Request(ENDPOINT)
}

function postJson(
  body: unknown,
  contentType = "application/json",
): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  })
}

function postRaw(
  body: string,
  contentType = "application/json",
): Request {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  })
}

function latestAgentConfig(): FakeMastraAgentConfig {
  const config = mastraAgentConfigs.at(-1)

  if (!config) {
    throw new Error("No MastraAgent was created")
  }

  return config
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

beforeEach(() => {
  capturedAgents = undefined
  mastraAgentConfigs.length = 0
  fakeAgent = { id: "fake-agent" }
  fakeMastra = {
    getAgent: mock(() => fakeAgent),
    shutdown: mock(async () => {}),
  }
  createMastraMock.mockReset()
  createMastraMock.mockImplementation(async () => fakeMastra)
})

afterAll(() => {
  mock.restore()
})

describe("createRuntime", () => {
  it("does not create Mastra until an agent is requested", () => {
    const { agents } = startRuntime()

    expect(typeof agents).toBe("function")
    expect(createMastraMock).not.toHaveBeenCalled()
  })

  it("creates Mastra once and builds a MastraAgent per request", async () => {
    const { agents } = startRuntime()

    const result = await agents({ request: getRequest() })

    expect(createMastraMock).toHaveBeenCalledTimes(1)
    expect(createMastraMock).toHaveBeenCalledWith(port)
    expect(Object.keys(result)).toEqual([AGENT_ID])
    expect(fakeMastra.getAgent).toHaveBeenCalledWith(AGENT_ID)
    expect(latestAgentConfig()).toEqual({
      agent: fakeAgent,
      resourceId: AGENT_ID,
      tracingOptions: undefined,
    })

    await agents({ request: getRequest() })

    expect(createMastraMock).toHaveBeenCalledTimes(1)
    expect(mastraAgentConfigs).toHaveLength(2)
  })

  it("passes the AG-UI thread id to tracing metadata without consuming the body", async () => {
    const { agents } = startRuntime()
    const request = postJson({ threadId: "thread-1" })

    await agents({ request })

    expect(latestAgentConfig().tracingOptions).toEqual({
      metadata: { sessionId: "thread-1" },
    })
    expect(await request.json()).toEqual({ threadId: "thread-1" })
  })

  it("ignores requests without a valid thread id", async () => {
    const { agents } = startRuntime()
    const requests = [
      getRequest(),
      postRaw(JSON.stringify({ threadId: "thread-1" }), "text/plain"),
      postRaw("{"),
      postJson({}),
      postJson({ threadId: "" }),
      postJson({ threadId: 123 }),
      new Request(ENDPOINT, { method: "POST" }),
      postJson({ threadId: "thread-2" }, "application/json; charset=utf-8"),
    ]

    for (const request of requests) {
      await agents({ request })
    }

    expect(
      mastraAgentConfigs.map((config) => config.tracingOptions),
    ).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { metadata: { sessionId: "thread-2" } },
    ])
  })

  it("coalesces concurrent Mastra initialization", async () => {
    const pending = deferred<typeof fakeMastra>()
    createMastraMock.mockImplementation(() => pending.promise)
    const { agents } = startRuntime()

    const first = agents({ request: getRequest() })
    const second = agents({ request: getRequest() })

    // Let both factories pass readAgUiThreadId and enter getMastra().
    await Bun.sleep(0)

    expect(createMastraMock).toHaveBeenCalledTimes(1)

    pending.resolve(fakeMastra)

    await Promise.all([first, second])

    expect(createMastraMock).toHaveBeenCalledTimes(1)
    expect(mastraAgentConfigs).toHaveLength(2)
  })

  it("retries Mastra initialization after a failure", async () => {
    let attempts = 0
    createMastraMock.mockImplementation(async () => {
      attempts += 1

      if (attempts === 1) {
        throw new Error("llm unavailable")
      }

      return fakeMastra
    })
    const { agents } = startRuntime()

    await expect(agents({ request: getRequest() })).rejects.toThrow(
      "llm unavailable",
    )
    await expect(agents({ request: getRequest() })).resolves.toHaveProperty(
      AGENT_ID,
    )

    expect(createMastraMock).toHaveBeenCalledTimes(2)
  })

  it("is a no-op before Mastra is initialized", async () => {
    const { shutdown } = startRuntime()

    await shutdown()

    expect(createMastraMock).not.toHaveBeenCalled()
    expect(fakeMastra.shutdown).not.toHaveBeenCalled()
  })

  it("shuts down the initialized Mastra instance", async () => {
    const { agents, shutdown } = startRuntime()

    await agents({ request: getRequest() })
    await shutdown()

    expect(fakeMastra.shutdown).toHaveBeenCalledTimes(1)
  })

  it("does not throw when shutting down after initialization failed", async () => {
    createMastraMock.mockImplementation(async () => {
      throw new Error("llm unavailable")
    })
    const { agents, shutdown } = startRuntime()

    await expect(agents({ request: getRequest() })).rejects.toThrow(
      "llm unavailable",
    )
    await expect(shutdown()).resolves.toBeUndefined()
    expect(fakeMastra.shutdown).not.toHaveBeenCalled()
  })
})
