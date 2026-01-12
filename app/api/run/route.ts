import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';

export async function POST(req: Request) {
  initLLMOnce();

  const { input,uuid }: { input: string,uuid:string} =
  await req.json();
  console.log(uuid)
  const state  = getSession(uuid)
  const plan = await planner(input,state);
  const execution = await runPlan(plan);
  saveSession(state)
  // 存储
  return NextResponse.json({
    plan,
    results: execution.results,
    outputs: execution.outputs,
  });
}
