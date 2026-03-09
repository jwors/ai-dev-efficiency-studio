import 'server-only';

// core/config/index.ts
export const config = {
  llmProvider: process.env.LLM_PROVIDER ?? 'mock',
  llmFallbackProvider: process.env.LLM_FALLBACK_PROVIDER ?? 'mock',
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? '12000'),
  llmMaxRetries: Number(process.env.LLM_MAX_RETRIES ?? '3'),
  llmBaseDelayMs: Number(process.env.LLM_BASE_DELAY_MS ?? '400'),
  llmMaxDelayMs: Number(process.env.LLM_MAX_DELAY_MS ?? '4000'),
  llmJitterRatio: Number(process.env.LLM_JITTER_RATIO ?? '0.2'),
  llmCircuitFailureThreshold: Number(process.env.LLM_CIRCUIT_FAILURE_THRESHOLD ?? '3'),
  llmCircuitOpenMs: Number(process.env.LLM_CIRCUIT_OPEN_MS ?? '30000'),
  qwenApiKey: process.env.QWEN_API_KEY ?? '',
};
