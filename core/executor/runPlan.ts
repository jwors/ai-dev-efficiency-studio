import 'server-only';
import type { Plan } from '@/core/planner/schema';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';

export async function runPlan(plan: Plan) {
  const results = [];
  // 执行过程
  const outputs = [];
  // 交付结果
  for (const step of plan.steps) {
    const task = taskFromPlanStep(step);
    const result = await executeTask(task);
    results.push(result)

    if (result.type === 'emit') {
      outputs.push(result.data)
    }
  }
  return {
    results,
    outputs
  }
}
