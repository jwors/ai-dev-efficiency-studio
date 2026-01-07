import 'server-only';
import { LLMProvider } from './types';

let provider: LLMProvider;


// 初始化大模型
export function initLLM(providerInstance?: LLMProvider) {
	if (providerInstance) {
		provider = providerInstance;
	}
}


// 调用llm
export async function callLLM(prompt: string): Promise<string> {
  if (!provider) {
    throw new Error('LLM not initialized');
  }
  return provider.call(prompt);
}