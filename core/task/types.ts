import 'server-only';
import {z} from 'zod'

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

export type LogTask = {
  type: 'log';
  params: {
    message: string;
  };
};

export type EmitTask = {
  type: 'emit';
  params: {
    data: string;
  };
};

export type Task = LogTask | EmitTask;
