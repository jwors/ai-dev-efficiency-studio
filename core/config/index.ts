// core/config/index.ts
export const config = {
  llmProvider: process.env.LLM_PROVIDER ?? 'mock',
  qwenApiKey: process.env.QWEN_API_KEY ?? '',
};
