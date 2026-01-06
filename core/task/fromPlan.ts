import 'server-only';
import type { Task } from './types';
import { Action } from '../llm/types';
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
          message: String(params.message ?? ''),
        },
      };
    case 'emit':
      return {
        type: 'emit',
        params: {
          data: String(params.data ?? ''),
        },
      };
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}
