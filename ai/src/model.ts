import type { OpenAICompatibleConfig } from "@mastra/core/llm"

export type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

function readEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

/**
 * Read the server-only LLM configuration.
 *
 * These values are injected at deploy time and never exposed to the client
 * bundle; the browser talks to the CopilotKit runtime instead.
 */
export function getLlmConfig(): LlmConfig {
  return {
    baseUrl: readEnv("LLM_BASE_URL"),
    apiKey: readEnv("LLM_API_KEY"),
    model: readEnv("LLM_MODEL"),
  }
}

/**
 * Build a Mastra model config for the OpenAI-compatible endpoint.
 *
 * `providerId`/`modelId` are used instead of `id` so a model id that already
 * contains a provider prefix (e.g. `deepseek/deepseek-v4-flash`) is forwarded to
 * the endpoint unchanged instead of being split into provider + model.
 *
 * `LLM_BASE_URL` must be the OpenAI-compatible base that includes `/v1`.
 */
export function createLlmModel(): OpenAICompatibleConfig {
  const { baseUrl, apiKey, model } = getLlmConfig()

  return {
    providerId: "openai-compatible",
    modelId: model,
    url: baseUrl,
    apiKey,
  }
}
