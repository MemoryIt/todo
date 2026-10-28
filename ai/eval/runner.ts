import { createTodoAgent } from "../src/agents/todo"
import { createMemoryTodoPort } from "./fixtures"
import { diffSnapshots, snapshot } from "./snapshot"
import type {
  EvalCase,
  EvalCaseResult,
  EvalErrorType,
  SnapshotDiff,
  ToolCallSummary,
  ToolExpectation,
} from "./types"

const DEFAULT_TIMEOUT_MS = 60_000

function readTimeoutMs(): number {
  const raw = process.env.EVAL_TIMEOUT_MS

  if (!raw) return DEFAULT_TIMEOUT_MS

  const value = Number(raw)

  return Number.isInteger(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeToolCalls(toolCalls: readonly unknown[]): ToolCallSummary[] {
  return toolCalls.flatMap((toolCall) => {
    if (!isRecord(toolCall)) return []

    const payload = isRecord(toolCall.payload)
      ? toolCall.payload
      : toolCall
    const name = payload.toolName

    if (typeof name !== "string") return []

    return [{ name, args: payload.args ?? payload.input }]
  })
}

function matchesToolExpectation(
  expected: ToolExpectation,
  actual: ToolCallSummary,
): boolean {
  if (expected.name !== actual.name) return false
  if (!expected.args) return true
  if (!isRecord(actual.args)) return false

  const args = actual.args

  return Object.entries(expected.args).every(
    ([key, value]) =>
      JSON.stringify(args[key]) === JSON.stringify(value),
  )
}

function checkTools(
  evalCase: EvalCase,
  toolCalls: readonly ToolCallSummary[],
): string[] {
  const reasons: string[] = []

  for (const expected of evalCase.requiredTools ?? []) {
    const matched = toolCalls.some((call) =>
      matchesToolExpectation(expected, call),
    )

    if (!matched) {
      reasons.push(`missing required tool ${expected.name}`)
    }
  }

  for (const forbidden of evalCase.forbiddenTools ?? []) {
    if (toolCalls.some((call) => call.name === forbidden)) {
      reasons.push(`called forbidden tool ${forbidden}`)
    }
  }

  const knownIds = new Set(evalCase.initial.map((todo) => todo.id))

  for (const call of toolCalls) {
    if (call.name !== "toggleTodo" && call.name !== "removeTodo") continue

    const id = isRecord(call.args) ? call.args.id : undefined

    if (typeof id !== "string" || !knownIds.has(id)) {
      reasons.push(`called ${call.name} with an unknown id`)
    }
  }

  if (
    evalCase.maxToolCalls !== undefined &&
    toolCalls.length > evalCase.maxToolCalls
  ) {
    reasons.push(
      `called ${toolCalls.length} tools, expected at most ${evalCase.maxToolCalls}`,
    )
  }

  return reasons
}

function summarizeDiff(diff: SnapshotDiff): string {
  const parts: string[] = []

  if (diff.missing.length > 0) {
    parts.push(`${diff.missing.length} missing`)
  }

  if (diff.extra.length > 0) {
    parts.push(`${diff.extra.length} extra`)
  }

  return parts.length > 0 ? parts.join(", ") : "content differs"
}

function classifyError(error: unknown): EvalErrorType {
  if (!(error instanceof Error)) return "unknown"

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return "timeout"
  }

  const message = error.message.toLowerCase()

  if (message.includes("tool")) return "tool"

  if (
    message.includes("llm") ||
    message.includes("model") ||
    message.includes("api")
  ) {
    return "llm"
  }

  return "unknown"
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function runEvalCase(
  evalCase: EvalCase,
): Promise<EvalCaseResult> {
  const port = createMemoryTodoPort(evalCase.initial)
  const initialSnapshot = await snapshot(port)
  const startedAt = performance.now()
  let actualSnapshot = initialSnapshot

  try {
    const agent = createTodoAgent(port, { memory: false })
    const result = await agent.generate(evalCase.input, {
      abortSignal: AbortSignal.timeout(readTimeoutMs()),
    })

    actualSnapshot = await snapshot(port)
    const targetDiff = diffSnapshots(evalCase.target, actualSnapshot)
    const initialDiff = diffSnapshots(initialSnapshot, actualSnapshot)
    const toolCalls = normalizeToolCalls(result.toolCalls ?? [])
    const toolReasons = checkTools(evalCase, toolCalls)
    const reasons: string[] = []

    if (!targetDiff.equal) {
      reasons.push(`target store mismatch (${summarizeDiff(targetDiff)})`)
    }

    if (evalCase.behavior === "noMutation" && !initialDiff.equal) {
      reasons.push(
        `store changed during a no-mutation case (${summarizeDiff(initialDiff)})`,
      )
    }

    reasons.push(...toolReasons)

    if (result.error) {
      reasons.push(`agent error: ${errorMessage(result.error)}`)
    }

    const status = result.error
      ? "error"
      : reasons.length === 0
        ? "pass"
        : "fail"

    return {
      id: evalCase.id,
      input: evalCase.input,
      status,
      initialSnapshot,
      actualSnapshot,
      targetSnapshot: evalCase.target,
      canonicalEqual: targetDiff.equal,
      missing: targetDiff.missing,
      extra: targetDiff.extra,
      toolCalls,
      toolChecksPassed: toolReasons.length === 0,
      finalText: result.text,
      durationMs: Math.round(performance.now() - startedAt),
      usage: result.totalUsage ?? result.usage,
      failReason: reasons.length > 0 ? reasons.join("; ") : undefined,
      errorType: result.error ? classifyError(result.error) : undefined,
    }
  } catch (error) {
    try {
      actualSnapshot = await snapshot(port)
    } catch {
      // Keep the last successful snapshot when the port itself cannot be read.
    }

    return {
      id: evalCase.id,
      input: evalCase.input,
      status: "error",
      initialSnapshot,
      actualSnapshot,
      targetSnapshot: evalCase.target,
      canonicalEqual: false,
      missing: [],
      extra: [],
      toolCalls: [],
      toolChecksPassed: false,
      finalText: "",
      durationMs: Math.round(performance.now() - startedAt),
      usage: undefined,
      failReason: errorMessage(error),
      errorType: classifyError(error),
    }
  }
}

export async function runEvalCases(
  cases: readonly EvalCase[],
): Promise<EvalCaseResult[]> {
  const results: EvalCaseResult[] = []

  for (const evalCase of cases) {
    const result = await runEvalCase(evalCase)
    results.push(result)

    const suffix = result.failReason ? ` - ${result.failReason}` : ""

    console.log(`${result.status.toUpperCase()} ${result.id}${suffix}`)
  }

  return results
}
