import 'server-only';
import { LLMProvider } from './types';
import { Message } from '../types/context';

let provider: LLMProvider;


// 初始化大模型
export function initLLM(providerInstance?: LLMProvider) {
	if (providerInstance) {
		provider = providerInstance;
	}
}


// 调用llm
export async function callLLM(prompt: Message[]): Promise<string> {
  if (!provider) {
    throw new Error('LLM not initialized');
  }
  return provider.call(prompt);
}