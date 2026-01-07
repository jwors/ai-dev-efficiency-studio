import 'server-only';
import type { Plan } from '@/core/planner/schema';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';

export async function runPlan(plan: Plan) {
  const results = [];
  const outputs = [];

  for (const [index, step] of plan.steps.entries()) {
    const task = taskFromPlanStep(step);
    try {
      const result = await executeTask(task);
      results.push({
        stepIndex: index,
        ...result,
      });

      if (result.type === 'emit') {
        outputs.push({
          type: result.type,
          payload: result.data,
        });
      }
    } catch (error: any) {
      results.push({
        stepIndex: index,
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      break;
    }
  }

  return {
    results,
    outputs,
  };
}
