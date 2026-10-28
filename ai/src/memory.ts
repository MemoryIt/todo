import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { InMemoryStore } from "@mastra/core/storage"
import { LibSQLStore } from "@mastra/libsql"
import { Memory } from "@mastra/memory"

/**
 * Default SQLite location for Mastra agent memory, relative to the process
 * working directory.
 *
 * Kept separate from the todo database so application rows and Mastra's
 * internal tables can be maintained independently.
 */
export const DEFAULT_MEMORY_DATABASE_PATH = "./data/memory.db"

/**
 * Token budget for conversation history.
 *
 * This is intentionally large: normal Todo conversations fit completely, so
 * Memory behaves like "send the whole thread" without summarization. Older
 * messages are still dropped if the budget is ever exceeded.
 */
export const MAX_MESSAGE_HISTORY_TOKENS = 800_000

function toLibsqlUrl(path: string): string {
  return path === ":memory:" ? path : `file:${path}`
}

/**
 * Build the SQLite storage owned by the Mastra instance.
 *
 * Missing parent directories are created so a fresh checkout/container can boot
 * without manual setup. `@mastra/libsql` does not create them on its own.
 */
export function createMemoryStorage(
  path: string = process.env.MEMORY_DATABASE_PATH || DEFAULT_MEMORY_DATABASE_PATH,
): LibSQLStore {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  return new LibSQLStore({
    id: "todo-ai-memory",
    url: toLibsqlUrl(path),
  })
}

/**
 * Shared Memory behavior for every agent instance.
 *
 * Keeping the options in one place ensures the default and standalone
 * factories cannot drift apart.
 */
function createMemoryOptions() {
  return {
    semanticRecall: false,
    messageHistory: { maxTokens: MAX_MESSAGE_HISTORY_TOKENS },
  }
}

/**
 * Build the Memory instance owned by one agent.
 *
 * No storage is passed here. When the agent first resolves its memory, Mastra
 * registers the instance and injects the storage configured on the Mastra
 * instance. Each agent therefore owns its own memory configuration while all
 * agents share a single SQLite connection.
 *
 * Only the current thread's message history is enabled for now. Semantic recall
 * stays disabled because the configured OpenAI-compatible endpoint does not
 * expose an embedding model.
 */
export function createAgentMemory(): Memory {
  return new Memory({
    options: createMemoryOptions(),
  })
}

/**
 * Build a standalone Memory instance with process-local storage.
 *
 * Unlike {@link createAgentMemory}, this instance does not depend on Mastra to
 * inject storage. It is intended for in-process callers that create an agent
 * outside a Mastra composition root, such as the agent evaluation harness.
 */
export function createInMemoryAgentMemory(): Memory {
  return new Memory({
    storage: new InMemoryStore({ id: "todo-ai-in-memory" }),
    options: createMemoryOptions(),
  })
}
