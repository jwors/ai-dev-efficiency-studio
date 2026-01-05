import 'server-only';
import { Plan } from '@/core/planner/schema'
import { Step } from "../task/types";

async function runStep(step: Plan['steps'][number]) {
  switch (step.action) {
    case 'log':
      console.log(step.params?.message);
      break;

    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

export async function runPlan(plan: Plan) {
  for (const step of plan.steps) {
    await runStep(step);
  }
}