import 'server-only';
import { initLLM } from '.';
import { QwenProvider } from './providers/qwen';
import { MockProvider } from './providers/mock';
import { config } from '@/core/config'
import type { LLMProvider } from './types';

let initialized = false;

/**
 * 初始化 LLM 提供者（单例模式）。
 * 根据配置创建主提供者和可选的备用提供者。
 */
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
