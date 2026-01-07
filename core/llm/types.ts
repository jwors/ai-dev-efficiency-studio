import 'server-only';
import z from 'zod'

export interface LLMProvider { 
	call(prompt:string):Promise<string>
}


export const Action = z.enum([
  'log',
  'emit',
  'http',
]);