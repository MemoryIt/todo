import type { Todo } from "shared"

/** Serialisable projection compared by the eval runner. */
export type TodoContent = {
  title: string
  completed: boolean
}

export type TodoSnapshot = readonly TodoContent[]

export type EvalBehavior = "mutate" | "noMutation"

export type ToolExpectation = {
  name: string
  /** Only the listed keys are compared, against the tool call arguments. */
  args?: Record<string, unknown>
}

export type EvalCase = {
  id: string
  input: string
  /** Seed data with stable ids so tool arguments can be asserted. */
  initial: Todo[]
  /** Expected final content; ids and ordering are ignored. */
  target: TodoSnapshot
  behavior: EvalBehavior
  requiredTools?: ToolExpectation[]
  forbiddenTools?: string[]
  maxToolCalls?: number
}

export type ToolCallSummary = {
  name: string
  args: unknown
}

export type EvalCaseStatus = "pass" | "fail" | "error" | "skip"

export type EvalErrorType = "timeout" | "llm" | "tool" | "unknown"

export type EvalCaseResult = {
  id: string
  input: string
  status: EvalCaseStatus
  initialSnapshot: TodoSnapshot
  actualSnapshot: TodoSnapshot
  targetSnapshot: TodoSnapshot
  canonicalEqual: boolean
  missing: TodoContent[]
  extra: TodoContent[]
  toolCalls: ToolCallSummary[]
  toolChecksPassed: boolean
  finalText: string
  durationMs: number
  usage: unknown
  failReason?: string
  errorType?: EvalErrorType
}

export type SnapshotDiff = {
  equal: boolean
  missing: TodoContent[]
  extra: TodoContent[]
}

export type EvalSummary = {
  total: number
  pass: number
  fail: number
  error: number
  skip: number
}

export type EvalReport = {
  runAt: string
  model: string | undefined
  memory: "none"
  cases: EvalCaseResult[]
  summary: EvalSummary
}
