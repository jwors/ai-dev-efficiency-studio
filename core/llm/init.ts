import 'server-only';
import { initLLM } from '.';
import { QwenProvider } from './providers/qwen';
import { MockProvider } from './providers/mock';
import { config } from '@/core/config'
import type { LLMProvider } from './types';

let initialized = false;

export function initLLMOnce() {
  if (initialized) return;

  const providers: LLMProvider[] = [];

  if (config.llmProvider === 'qwen') {
    providers.push(new QwenProvider(config.qwenApiKey));
  } else {
    providers.push(new MockProvider());
  }

  if (
    config.llmFallbackProvider &&
    config.llmFallbackProvider !== config.llmProvider
  ) {
    if (config.llmFallbackProvider === 'qwen') {
      providers.push(new QwenProvider(config.qwenApiKey));
    } else if (config.llmFallbackProvider === 'mock') {
      providers.push(new MockProvider());
    }
  }

  initLLM(providers);
  initialized = true;
}
