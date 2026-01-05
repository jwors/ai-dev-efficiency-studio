import 'server-only';
import type { Task } from '@/core/task/types';

export async function executeTask(task: Task) {
  switch (task.type) {
    case 'log':
      return { ok: true };

    default:
      throw new Error('Unhandled task');
  }
}
