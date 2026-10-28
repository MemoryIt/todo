import { EVAL_CASES } from "./cases"
import { buildReport, printSummary, writeReport } from "./report"
import { runEvalCases } from "./runner"
import type { EvalCaseResult } from "./types"
import { toSnapshot } from "./snapshot"

function hasLlmConfig(): boolean {
  return Boolean(
    process.env.LLM_BASE_URL &&
      process.env.LLM_API_KEY &&
      process.env.LLM_MODEL,
  )
}

function skippedResults(
  reason: string,
): EvalCaseResult[] {
  return EVAL_CASES.map((evalCase) => ({
    id: evalCase.id,
    input: evalCase.input,
    status: "skip",
    initialSnapshot: toSnapshot(evalCase.initial),
    actualSnapshot: toSnapshot(evalCase.initial),
    targetSnapshot: evalCase.target,
    canonicalEqual: false,
    missing: [],
    extra: [],
    toolCalls: [],
    toolChecksPassed: false,
    finalText: "",
    durationMs: 0,
    usage: undefined,
    failReason: reason,
  }))
}

async function main(): Promise<void> {
  const results = hasLlmConfig()
    ? await runEvalCases(EVAL_CASES)
    : skippedResults("missing LLM_BASE_URL, LLM_API_KEY, or LLM_MODEL")

  const report = buildReport(results)
  await writeReport(report)
  printSummary(report)

  const failed = report.summary.fail + report.summary.error

  process.exit(failed > 0 ? 1 : 0)
}

if (import.meta.main) {
  await main()
}
