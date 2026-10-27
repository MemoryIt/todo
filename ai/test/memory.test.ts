import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { MastraDBMessage } from "@mastra/core/agent"
import type { TodoPort } from "shared"
import { TODO_AGENT_ID } from "../src/agents/todo"
import { createMastra } from "../src/mastra"
import { MAX_MESSAGE_HISTORY_TOKENS } from "../src/memory"

const originalEnv = {
  LLM_BASE_URL: process.env.LLM_BASE_URL,
  LLM_API_KEY: process.env.LLM_API_KEY,
  LLM_MODEL: process.env.LLM_MODEL,
  MEMORY_DATABASE_PATH: process.env.MEMORY_DATABASE_PATH,
}

const tempDirs: string[] = []

const todoPort: TodoPort = {
  list: async () => [],
  create: async () => undefined,
  setCompleted: async () => undefined,
  remove: async () => false,
}

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "todo-ai-memory-"))
  tempDirs.push(dir)

  return join(dir, "nested", "deep", "memory.db")
}

function textMessage({
  id,
  role,
  text,
  threadId,
  resourceId,
}: {
  id: string
  role: "user" | "assistant"
  text: string
  threadId: string
  resourceId: string
}): MastraDBMessage {
  return {
    id,
    role,
    createdAt: new Date(),
    threadId,
    resourceId,
    content: {
      format: 2,
      parts: [{ type: "text", text }],
    },
  }
}

beforeAll(() => {
  // Agent construction reads the LLM configuration, but these tests never call
  // the model.
  process.env.LLM_BASE_URL = "http://127.0.0.1:1/v1"
  process.env.LLM_API_KEY = "test-key"
  process.env.LLM_MODEL = "test-model"
})

afterAll(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name]
    } else {
      process.env[name] = value
    }
  }
})

afterEach(() => {
  if (originalEnv.MEMORY_DATABASE_PATH === undefined) {
    delete process.env.MEMORY_DATABASE_PATH
  } else {
    process.env.MEMORY_DATABASE_PATH = originalEnv.MEMORY_DATABASE_PATH
  }

  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe("Mastra-managed memory storage", () => {
  it("creates the SQLite parent directory and injects storage into agent memory", async () => {
    const path = tempDbPath()
    process.env.MEMORY_DATABASE_PATH = path

    expect(existsSync(dirname(path))).toBe(false)

    const mastra = await createMastra(todoPort)

    try {
      expect(existsSync(dirname(path))).toBe(true)

      const memory = await mastra.getAgent(TODO_AGENT_ID).getMemory()

      expect(memory).toBeDefined()
      expect(memory?.getMergedThreadConfig().messageHistory?.maxTokens).toBe(
        MAX_MESSAGE_HISTORY_TOKENS,
      )
      expect(() => memory?.storage).not.toThrow()
    } finally {
      await mastra.shutdown()
    }
  })

  it("persists each thread's history across Mastra instances", async () => {
    const path = tempDbPath()
    const resourceId = "user-1"
    process.env.MEMORY_DATABASE_PATH = path

    const first = await createMastra(todoPort)

    try {
      const memory = await first.getAgent(TODO_AGENT_ID).getMemory()
      expect(memory).toBeDefined()

      await memory!.saveThread({
        thread: {
          id: "thread-1",
          resourceId,
          title: "First thread",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      await memory!.saveMessages({
        messages: [
          textMessage({
            id: "message-1",
            role: "user",
            text: "My name is Alice",
            threadId: "thread-1",
            resourceId,
          }),
          textMessage({
            id: "message-2",
            role: "assistant",
            text: "Hello Alice",
            threadId: "thread-1",
            resourceId,
          }),
        ],
      })
      await memory!.saveThread({
        thread: {
          id: "thread-2",
          resourceId,
          title: "Second thread",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      await memory!.saveMessages({
        messages: [
          textMessage({
            id: "message-3",
            role: "user",
            text: "Unrelated conversation",
            threadId: "thread-2",
            resourceId,
          }),
        ],
      })

      const before = await memory!.recall({
        threadId: "thread-1",
        perPage: false,
      })

      expect(before.total).toBe(2)
      await memory!.settled()
    } finally {
      await first.shutdown()
    }

    // A new Mastra instance simulates a process restart against the same file.
    const second = await createMastra(todoPort)

    try {
      const memory = await second.getAgent(TODO_AGENT_ID).getMemory()
      expect(memory).toBeDefined()

      const after = await memory!.recall({
        threadId: "thread-1",
        perPage: false,
      })

      expect(after.messages.map((message) => message.role)).toEqual([
        "user",
        "assistant",
      ])
      expect(after.messages[0]?.content.parts[0]).toMatchObject({
        type: "text",
        text: "My name is Alice",
      })

      const otherThread = await memory!.recall({
        threadId: "thread-2",
        perPage: false,
      })

      expect(otherThread.total).toBe(1)
    } finally {
      await second.shutdown()
    }
  })
})
