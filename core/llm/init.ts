import { initLLM } from '.';
import { QwenProvide } from './providers/qwen';
import { MockProvider } from './providers/mock';
import { config } from '@/core/config'

let initialized = false;

export function initLLMOnce() {
  if (initialized) return;

  if (config.llmProvider === 'qwen') {
    initLLM(new QwenProvide(config.qwenApiKey));
  } else {
    initLLM(new MockProvider());
  }

  initialized = true;
}