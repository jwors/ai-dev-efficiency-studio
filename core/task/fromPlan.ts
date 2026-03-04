import 'server-only';
import type { Task, Action } from './types';
import { z } from 'zod';

export function taskFromPlanStep(step: {
  action: z.infer<typeof Action>;
  params?: Record<string, unknown>;
}): Task {
  const params = step.params ?? {};
  switch (step.action) {
    case 'log':
      return {
        type: 'log',
        params: {
          message: (params.message as string) ?? '',
        },
      };
    case 'emit':
      return {
        type: 'emit',
        params: {
          data: params.data as { content: string } ?? null,
        },
      };
    case 'web.search':
      if (!params.query || typeof params.query !== 'string') {
        throw new Error('web.search requires params.query');
      }
      return {
        type: 'web.search',
        params: {
          query: params.query,
          domains: Array.isArray(params.domains) ? params.domains : undefined,
          limit: typeof params.limit === 'number' ? params.limit : 5,
        },
      };
    case 'web.fetch':
      if (!params.url || typeof params.url !== 'string') {
        throw new Error('web.fetch requires params.url');
      }
      return {
        type: 'web.fetch',
        params: { url: params.url },
      };

    case 'file.write':
      if (!params.path || typeof params.path !== 'string') {
        throw new Error('file.write requires params.path');
      }
      return {
        type: 'file.write',
        params: {
          path: params.path,
          content: String(params.content ?? ''),
        },
      };

    case 'artifact.export':
      if (!params.path || typeof params.path !== 'string') {
        throw new Error('artifact.export requires params.path');
      }
      return {
        type: 'artifact.export',
        params: {
          path: params.path,
          filename: String(params.filename ?? 'artifact.bin'),
        },
      };
    case 'http':
      if (!params.url || typeof params.url !== 'string') {
        throw new Error('http action requires params.url');
      }
      return {
        type: 'http',
        params: {
          url: params.url,
          method: typeof params.method === 'string' ? params.method : 'GET',
          headers:
            params.headers && typeof params.headers === 'object'
              ? params.headers as Record<string, string>
              : undefined,
          body: params.body,
        },
      };
    case 'export_flow':
      return { type: 'export_flow', params: step.params ?? {} };
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}
