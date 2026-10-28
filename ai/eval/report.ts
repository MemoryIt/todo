import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type {
  EvalCaseResult,
  EvalReport,
  EvalSummary,
} from "./types"

export const DEFAULT_EVAL_REPORT_PATH = join(
  import.meta.dir,
  "../../test-results/agent-eval.json",
)

function summarize(cases: readonly EvalCaseResult[]): EvalSummary {
  return {
    total: cases.length,
    pass: cases.filter((result) => result.status === "pass").length,
    fail: cases.filter((result) => result.status === "fail").length,
    error: cases.filter((result) => result.status === "error").length,
    skip: cases.filter((result) => result.status === "skip").length,
  }
}

export function buildReport(cases: EvalCaseResult[]): EvalReport {
  return {
    runAt: new Date().toISOString(),
    model: process.env.LLM_MODEL,
    memory: "none",
    cases,
    summary: summarize(cases),
  }
}

export async function writeReport(
  report: EvalReport,
  path: string =
    process.env.EVAL_REPORT_PATH || DEFAULT_EVAL_REPORT_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`)
}

export function printSummary(report: EvalReport): void {
  const { summary } = report

  console.log(
    `Agent eval: ${summary.pass}/${summary.total} passed ` +
      `(${summary.fail} failed, ${summary.error} errored, ` +
      `${summary.skip} skipped)`,
  )

  for (const result of report.cases) {
    if (result.status === "pass") continue

    const reason = result.failReason ? ` - ${result.failReason}` : ""

    console.log(`- ${result.status.toUpperCase()} ${result.id}${reason}`)
  }
}
