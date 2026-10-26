import { SpanType } from "@mastra/core/observability"
import { Observability } from "@mastra/observability"
import { LangfuseExporter } from "@mastra/langfuse"

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()

  return value ? value : undefined
}

function readPositiveInt(name: string): number | undefined {
  const raw = readEnv(name)

  if (!raw) return undefined

  const value = Number(raw)

  return Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * Build the optional Langfuse observability configuration.
 *
 * Tracing is deliberately opt-in: when the credentials are missing the AI edge
 * keeps running with Mastra's NoOp observability, so a deployment without
 * Langfuse behaves exactly as before.
 */
export function createObservability(): Observability | undefined {
  const publicKey = readEnv("LANGFUSE_PUBLIC_KEY")
  const secretKey = readEnv("LANGFUSE_SECRET_KEY")

  if (!publicKey || !secretKey) return undefined

  const realtime = readEnv("LANGFUSE_REALTIME")

  return new Observability({
    configs: {
      langfuse: {
        serviceName: readEnv("OTEL_SERVICE_NAME") ?? "todo-ai",
        // Streaming emits one span per model chunk. Langfuse charges per
        // observation, so keep the useful hierarchy without the noise.
        excludeSpanTypes: [SpanType.MODEL_CHUNK],
        exporters: [
          new LangfuseExporter({
            publicKey,
            secretKey,
            baseUrl:
              readEnv("LANGFUSE_BASE_URL") ??
              readEnv("LANGFUSE_HOST"),
            environment:
              readEnv("LANGFUSE_TRACING_ENVIRONMENT") ??
              readEnv("NODE_ENV"),
            release:
              readEnv("LANGFUSE_RELEASE") ??
              readEnv("GIT_COMMIT"),
            // Dev runs should show up immediately; production batches and
            // relies on the graceful shutdown hook to flush the last batch.
            realtime:
              realtime !== undefined
                ? realtime === "true"
                : process.env.NODE_ENV !== "production",
            flushAt: readPositiveInt("LANGFUSE_FLUSH_AT"),
            flushInterval: readPositiveInt("LANGFUSE_FLUSH_INTERVAL"),
          }),
        ],
      },
    },
  })
}
