import z from 'zod'
import type { LLMRawResponse, Message } from '@/core/types';

export type LLMProviderName = 'qwen' | 'mock' | string;

export interface LLMCallOptions {
	requestId?: string;
	timeoutMs?: number;
}

export interface LLMProvider { 
	name: LLMProviderName;
	call(prompt:Message[], options?: LLMCallOptions):Promise<LLMRawResponse>
}


export const Action = z.enum([
  'log',
  'emit',
  'http',
  'export_flow',
  'web.search',
  'web.fetch',
  'file.write',
  'artifact.export'
]);

export type ActionType = z.infer<typeof Action>;
