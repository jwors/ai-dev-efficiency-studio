import 'server-only';
import { LLMProvider } from './types';
import { LLMRawResponse, Message } from '../types/type';

let provider: LLMProvider;


// 初始化大模型
export function initLLM(providerInstance?: LLMProvider) {
	if (providerInstance) {
		provider = providerInstance;
	}
}


// 调用llm
export async function callLLM(prompt: Message[]): Promise<LLMRawResponse> {
  if (!provider) {
    throw new Error('LLM not initialized');
  }
  return provider.call(prompt);
}


// 摘要
export async function callLLmSummary(prompt:Message[]):Promise<string>{
  const  summary = await callLLM(prompt)
  return summary.content.trim()
}