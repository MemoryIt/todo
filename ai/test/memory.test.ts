import { afterEach, describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { MastraDBMessage } from "@mastra/core/agent"
import { createAiMemory, type AiMemory } from "../src/memory"

const tempDirs: string[] = []
const openMemories: AiMemory[] = []

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

afterEach(async () => {
  while (openMemories.length > 0) {
    await openMemories.pop()!.close()
  }

  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe("createAiMemory", () => {
  it("creates missing parent directories for the SQLite file", () => {
    const path = tempDbPath()

    expect(existsSync(dirname(path))).toBe(false)

    const aiMemory = createAiMemory(path)
    openMemories.push(aiMemory)

    expect(existsSync(dirname(path))).toBe(true)
    expect(existsSync(path)).toBe(true)
  })

  it("persists each thread's history across memory instances", async () => {
    const path = tempDbPath()
    const resourceId = "user-1"

    const first = createAiMemory(path)
    openMemories.push(first)

    await first.memory.saveThread({
      thread: {
        id: "thread-1",
        resourceId,
        title: "First thread",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    await first.memory.saveMessages({
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
    await first.memory.saveThread({
      thread: {
        id: "thread-2",
        resourceId,
        title: "Second thread",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    await first.memory.saveMessages({
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

    const before = await first.memory.recall({
      threadId: "thread-1",
      perPage: false,
    })

    expect(before.total).toBe(2)
    await first.memory.settled()
    await first.close()

    // A new store instance simulates a process restart against the same file.
    const second = createAiMemory(path)
    openMemories.push(second)

    const after = await second.memory.recall({
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

    const otherThread = await second.memory.recall({
      threadId: "thread-2",
      perPage: false,
    })

    expect(otherThread.total).toBe(1)
  })
})
