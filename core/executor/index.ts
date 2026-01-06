import 'server-only';
import type { Task } from '@/core/task/types';

export async function executeTask(task: Task) {
  switch (task.type) {
    case 'log':
      return {
        type:'log',
        ok: true
      };
    case 'emit':
      return {
        type: 'emit',
        ok: true,
        data:task.params.data
      }
    default:
      throw new Error('Unhandled task');
  }
}
