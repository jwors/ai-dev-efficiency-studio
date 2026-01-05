import { MockProvider } from './providers/mock';
import { QwenProvide } from './providers/qwen';
import { LLMProvider } from './types';

let provider: LLMProvider;

export function initLLM(providerInstance?: LLMProvider) {
	if (providerInstance) {
		provider = providerInstance;
	}
}

export async function callLLM(prompt: string): Promise<string> {
  if (!provider) {
    throw new Error('LLM not initialized');
  }
  return provider.call(prompt);
}