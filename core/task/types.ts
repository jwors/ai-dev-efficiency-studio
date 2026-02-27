import 'server-only';
import {z} from 'zod'

export const Action = z.enum([
  'log',
  'emit',
  'http',
  'export_flow',
  'web.search',
  'web.fetch',
  'file.write',
  'artifact.export',
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
    data: { content: string };
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

export type WebSearchTask = {
  type: 'web.search';
  params: {
    query: string;
    domains?: string[];
    limit?: number;
  };
};

export type WebFetchTask = {
  type: 'web.fetch';
  params: {
    url: string;
  };
};

export type FileWriteTask = {
  type: 'file.write';
  params: {
    path: string;
    content: string;
  };
};

export type ArtifactExportTask = {
  type: 'artifact.export';
  params: {
    path: string;
    filename: string;
  };
};

export type Task =
  | LogTask
  | EmitTask
  | HttpTask
  | ExportFlowTask
  | WebFetchTask
  | WebSearchTask
  | FileWriteTask
  | ArtifactExportTask
