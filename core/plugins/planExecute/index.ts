import 'server-only';
import { planner } from '../../planner';
import { runPlan } from '../../executor/runPlan';
import type { SessionState } from '../../types/type';
import type { PluginResult } from '../types';

type PlanExecuteData = {
  plan: any;
  results: any[];
  outputs: any[];
};

export async function runPlanExecutePlugin(
  input: string,
  state: SessionState,
): Promise<PluginResult<PlanExecuteData>> {
  const plan = await planner(input, state);

  state.history.push({
    role: 'user',
    content: input,
  });

  for (let i = 0; i < plan.steps.length; i++) {
    const item = plan.steps[i];
    if (item.action === 'emit') {
      state.history.push({
        role: 'assistant',
        content: item.params?.data.content,
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
