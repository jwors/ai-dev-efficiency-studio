import 'server-only';
import z from 'zod'
import type { LLMRawResponse, Message } from '@/core/types';



export interface LLMProvider { 
	call(prompt:Message[]):Promise<LLMRawResponse>
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