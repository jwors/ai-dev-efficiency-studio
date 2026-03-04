import 'server-only';
import { initLLM } from '.';
import { QwenProvider } from './providers/qwen';
import { MockProvider } from './providers/mock';
import { config } from '@/core/config'

let initialized = false;

export function initLLMOnce() {
  if (initialized) return;

	if (config.llmProvider === 'qwen') {
    initLLM(new QwenProvider(config.qwenApiKey));
  } else {
    initLLM(new MockProvider());
  }

  initialized = true;
}