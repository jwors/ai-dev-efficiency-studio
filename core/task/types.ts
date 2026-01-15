import 'server-only';
import {z} from 'zod'

export const Action = z.enum([
  'log',
  'emit',
  'http',
  'export_flow'
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
    data: { data: { content: string } };
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

export type ExportFlowTask = {
  type: 'export_flow',
  params?: {
    format?: 'png' | 'svg';     // 先 png 就够
    filename?: string;          // e.g. "plan-flow.png"
  };
}

export type Task =
  | LogTask
  | EmitTask
  | HttpTask
  | ExportFlowTask;
