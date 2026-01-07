import 'server-only';
import {z} from 'zod'

export const Action = z.enum([
  'log',
  'emit',
  'http',
]);

export type LogTask = {
  type: 'log';
  params: {
    message: string;
  };
};

export type EmitTask = {
  type: 'emit';
  params: {
    data: unknown;
  };
};

export type HttpTask = {
  type: 'http';
  params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
};

export type Task =
  | LogTask
  | EmitTask
  | HttpTask;
