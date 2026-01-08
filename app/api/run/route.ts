import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';
import type { Observation } from '@/core/agent/observation';

export async function POST(req: Request) {
  initLLMOnce();

  const { input, observation }: { input: string; observation?: Observation } =
    await req.json();

  const plan = await planner(input);
  const execution = await runPlan(plan);

  return NextResponse.json({
    plan,
    results: execution.results,
    outputs: execution.outputs,
  });
}
