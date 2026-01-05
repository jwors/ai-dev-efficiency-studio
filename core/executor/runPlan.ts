import 'server-only';
import type { Plan } from '@/core/planner/schema';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';

export async function runPlan(plan: Plan) {
  const results = [];
  console.log('l;ength',plan.steps.length)
  for (const step of plan.steps) {
    console.log(step)
    const task = taskFromPlanStep(step);
    const result = await executeTask(task);
    results.push({
      action: step.action,
      result,
    });
  }
  console.log(results)
  return results;
}
