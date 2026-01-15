import 'server-only';
import type { Task,Action } from './types';
import { z } from 'zod';

export function taskFromPlanStep(step: {
  action: z.infer<typeof Action>;
  params?: Record<string, any>;
}): Task {
  const params = step.params ?? {};
  switch (step.action) {
    case 'log':
      return {
        type: 'log',
        params: {
          message: params.message ?? '',
        },
      };
    case 'emit':
      return {
        type: 'emit',
        params: {
          data: params.data ?? null,
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
              ? params.headers
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
