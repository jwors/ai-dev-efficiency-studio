import 'server-only';

function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// core/config/index.ts
export const config = {
  llmProvider: process.env.LLM_PROVIDER ?? 'mock',
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER ?? 'mock',
  llmTimeoutMs: parseEnvNumber(process.env.LLM_TIMEOUT_MS , 12000),
  llmMaxRetries: parseEnvNumber(process.env.LLM_MAX_RETRIES ,3),
  llmBaseDelayMs: parseEnvNumber(process.env.LLM_BASE_DELAY_MS ,400),
  llmMaxDelayMs: parseEnvNumber(process.env.LLM_MAX_DELAY_MS ,4000),
  llmJitterRatio: parseEnvNumber(process.env.LLM_JITTER_RATIO , 0.2),
  llmCircuitFailureThreshold: parseEnvNumber(process.env.LLM_CIRCUIT_FAILURE_THRESHOLD ,3),
  llmCircuitOpenMs: parseEnvNumber(process.env.LLM_CIRCUIT_OPEN_MS ,30000),
  qwenApiKey: process.env.QWEN_API_KEY ?? '',
  // Token 预算控制
  requestMaxTokens: parseEnvNumber(process.env.REQUEST_MAX_TOKENS, 4000),
  sessionMaxTokens: parseEnvNumber(process.env.SESSION_MAX_TOKENS, 50000),
};
