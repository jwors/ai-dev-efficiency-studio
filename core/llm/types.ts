import 'server-only';
import z from 'zod'
import type { Message } from '../types/type';

export interface LLMProvider { 
	call(prompt:Message[]):Promise<string>
}


export const Action = z.enum([
  'log',
  'emit',
  'http',
]);