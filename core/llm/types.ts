import 'server-only';
import z from 'zod'
import type { LLMRawResponse, Message } from '../types/type';



export interface LLMProvider { 
	call(prompt:Message[]):Promise<LLMRawResponse>
}


export const Action = z.enum([
  'log',
  'emit',
  'http',
  'export_flow'
]);