import 'server-only';
import {z} from 'zod'

export const Action = z.enum([
	'log',
	'shell',
  'http',
  'read_file',
  'write_file',
  'call_function',
  'wait',
])

export type LogTask = {
  type: z.infer<typeof Action>;
  params: {
    message: string;
  };
};

export type Task = LogTask;
