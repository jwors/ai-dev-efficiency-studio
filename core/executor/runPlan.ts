import 'server-only';
import type { Plan } from '@/core/planner/schema';
import type { SessionState } from '@/core/types';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';

/**
 * 执行计划中的所有步骤。
 * 按顺序执行计划中的每个步骤，收集执行结果和输出。
 * @param plan - 待执行的计划
 * @param state - 会话状态
 * @returns 包含所有步骤结果和输出的对象
 */
export async function runPlan(plan: Plan, state: SessionState) {
  const results: unknown[] = [];
  const outputs: unknown[] = [];

  for (const [index, step] of plan.steps.entries()) {
    const task = taskFromPlanStep(step);

    try {
      const result = await executeTask(task, state);
      results.push({ stepIndex: index, ...result });

      if (result.output?.type && result.output?.payload) {
        outputs.push(result.output);
      }

      if (result.type === "emit" && result.payload?.content) {
        outputs.push({ type: "emit", payload: result.payload }); // payload={content}
      }

      // B) 任意 task 附带 output（policy 拦截等）
      if (result.output?.type === "emit" && result.output?.payload?.content) {
        outputs.push(result.output); // output 已是 {type:'emit',payload:{content}}
      }

      if (result.fatal) break;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        stepIndex: index,
        ok: false,
        type: task.type,
        error: errorMessage,
      });
      continue;
    }
  }

  return { results, outputs };
}
