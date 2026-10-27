import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
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

export type AiMemory = {
  storage: LibSQLStore
  memory: Memory
  close: () => Promise<void>
}

function toLibsqlUrl(path: string): string {
  return path === ":memory:" ? path : `file:${path}`
}

/**
 * Build the SQLite-backed Mastra memory used by the Todo agent.
 *
 * Only the current thread's message history is persisted for now. Semantic
 * recall stays disabled because the configured OpenAI-compatible endpoint does
 * not expose an embedding model; enabling it later means adding an embedder and
 * vector store.
 *
 * Missing parent directories are created so a fresh checkout/container can boot
 * without manual setup. `@mastra/libsql` does not create them on its own.
 */
export function createAiMemory(
  path: string = process.env.MEMORY_DATABASE_PATH || DEFAULT_MEMORY_DATABASE_PATH,
): AiMemory {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true })
  }

  const storage = new LibSQLStore({
    id: "todo-ai-memory",
    url: toLibsqlUrl(path),
  })

  const memory = new Memory({
    storage,
    options: {
      semanticRecall: false,
      // Bound the history sent to the model instead of counting messages.
      messageHistory: { maxTokens: 8000 },
    },
  })

  return {
    storage,
    memory,
    close: () => storage.close(),
  }
}
