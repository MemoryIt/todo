import { afterEach, describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const tempDirs: string[] = []
const serverDir = join(import.meta.dir, "..")

type ServerProcess = ReturnType<typeof Bun.spawn>

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "todo-index-"))
  tempDirs.push(dir)

  return dir
}

function spawnServer(dbPath: string, memoryPath: string): ServerProcess {
  return Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: serverDir,
    env: {
      ...process.env,
      DATABASE_PATH: dbPath,
      MEMORY_DATABASE_PATH: memoryPath,
      NODE_ENV: "test",
      PORT: "0",
      COPILOTKIT_TELEMETRY_DISABLED: "true",
    },
    stdout: "ignore",
    stderr: "pipe",
  })
}

async function waitForFile(
  path: string,
  proc: ServerProcess,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await Bun.file(path).exists()) {
      return
    }

    if (proc.exitCode !== null) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(
        `Server exited before creating ${path} (code ${proc.exitCode}): ${stderr}`,
      )
    }

    await Bun.sleep(25)
  }

  throw new Error(`Timed out waiting for ${path}`)
}

async function stop(
  proc: ServerProcess,
  signal: NodeJS.Signals,
): Promise<number> {
  try {
    proc.kill(signal)
  } catch {
    // The process may already have exited.
  }

  return await proc.exited
}

async function terminate(proc: ServerProcess): Promise<void> {
  if (proc.exitCode !== null) {
    return
  }

  try {
    proc.kill("SIGKILL")
  } catch {
    // The process may have exited between the check and the kill.
  }

  await proc.exited
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true })
  }
})

describe("server entrypoint", () => {
  it("creates the configured database and exits with 143 on SIGTERM", async () => {
    const dir = tempDir()
    const dbPath = join(dir, "nested", "deep", "todo.db")
    const memoryPath = join(dir, "memory.db")
    const proc = spawnServer(dbPath, memoryPath)

    try {
      await waitForFile(dbPath, proc)

      expect(existsSync(dbPath)).toBe(true)
      expect(await stop(proc, "SIGTERM")).toBe(143)
    } finally {
      await terminate(proc)
    }
  })

  it("exits with 130 on SIGINT", async () => {
    const dir = tempDir()
    const dbPath = join(dir, "data", "todo.db")
    const memoryPath = join(dir, "memory.db")
    const proc = spawnServer(dbPath, memoryPath)

    try {
      await waitForFile(dbPath, proc)

      expect(await stop(proc, "SIGINT")).toBe(130)
    } finally {
      await terminate(proc)
    }
  })
})
