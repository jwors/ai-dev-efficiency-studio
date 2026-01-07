import 'server-only';
import type { Plan } from '@/core/planner/schema';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';

export async function runPlan(plan: Plan) {
  const results = [];
  // 执行过程
  const outputs = [];
  // 交付结果
  for (const [index, step] of plan.steps.entries()) {
    console.log(step)
    // 结构在 prompt 内
    const task = taskFromPlanStep(step);
    const ctx = {
      vars: {},
      scratchpad: [],
    };
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
        error: error instanceof Error ? error.message : '未知错误',
      });
      break;
    }
  }
  return {
    results,
    outputs
  }
}
