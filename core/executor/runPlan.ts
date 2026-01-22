import 'server-only';
import type { Plan } from '@/core/planner/schema';
import { taskFromPlanStep } from '@/core/task/fromPlan';
import { executeTask } from './index';
import { SessionState } from '../types/type';

// export async function runPlan(plan: Plan,state:SessionState) {
//   const results = [];
//   const outputs = [];

//   for (const [index, step] of plan.steps.entries()) {
//     const task = taskFromPlanStep(step);
//     // 对于不同的 step 做不同的处理
//     try {
//       const result = await executeTask(task,state);
//       console.log(result)
//       results.push({
//         stepIndex: index,
//         ...result,
//       });
//       if (result.type === 'emit') {
//         outputs.push({
//           type: result.type,
//           payload: result.data,
//         });
//       }
//       if (!result.ok) { 
//         break;
//       }
//     } catch (error: any) {
//       console.log(error)
//       results.push({
//         stepIndex: index,
//         ok: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });
//       break;
//     }
//   }

//   return {
//     results,
//     outputs,
//   };
// }
export async function runPlan(plan: Plan, state: SessionState) {
  const results: any[] = [];
  const outputs: any[] = [];

  for (const [index, step] of plan.steps.entries()) {
    const task = taskFromPlanStep(step);

    try {
      const result = await executeTask(task, state);

      results.push({ stepIndex: index, ...result });

      // ✅ 1) 先收集“输出”
      // 情况A：task 本身就是 emit
      if (result.type === "emit" && result.data) {
        outputs.push({ type: "emit", payload: result.data });
      }

      // 情况B：task 不是 emit，但携带 output（比如 policy 拦截）
      if (result.output?.type === "emit") {
        outputs.push(result.output);
      }

      // ✅ 2) 再决定是否中断
      if (result.fatal) break;

    } catch (error: any) {
      results.push({
        stepIndex: index,
        ok: false,
        type: task.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      break;
    }
  }

  return { results, outputs };
}
