import 'server-only';
import { planner } from '../../planner';
import { runPlan } from '../../executor/runPlan';
import type { SessionState } from '@/core/types';
import type { PluginResult } from '../types';
import type { Plan } from '@/core/planner/schema';
import { checkPlanSafety } from '@/core/security/planGuard';

type PlanExecuteData = {
  plan: Plan;
  results: unknown[];
  outputs: unknown[];
};

export async function runPlanExecutePlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<PlanExecuteData>> {
  const plan = await planner(input, state);

  // 如果 LLM 直接返回了内容（非 JSON 格式），直接返回给用户
  if (plan.directResponse) {
    return {
      name: 'plan-execute',
      ok: true,
      data: {
        plan,
        results: [],
        outputs: [{
          type: 'emit',
          payload: { content: plan.directResponse },
        }],
      },
    };
  }

  // Plan 级别安全检查（在 Executor 执行前）
  const safetyCheck = checkPlanSafety(plan);
  if (safetyCheck.blocked) {
    return {
      name: 'plan-execute',
      ok: false,
      error: `安全拦截：${safetyCheck.reason}`,
    };
  }


  for (let i = 0; i < plan.steps.length; i++) {
    const item = plan.steps[i];
    if (item.action === 'emit') {
      state.history.push({
        role: 'assistant',
        content: (item.params?.data as { content?: string })?.content ?? '',
      });
      break;
    }
  }

  const execution = await runPlan(plan, state);

  return {
    name: 'plan-execute',
    ok: true,
    data: {
      plan,
      results: execution.results,
      outputs: execution.outputs,
    },
  };
}
