import 'server-only';
import z from 'zod'

export interface LLMProvider { 
	call(prompt:string):Promise<string>
}


export const Action = z.enum([
  'log',
  'emit',
	'shell',
  'http',
  'read_file',
  'write_file',
  'call_function',
  'wait',
])