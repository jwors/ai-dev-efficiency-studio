import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';
import crypto from 'crypto'
import { getSession, saveSession } from '@/core/storage/storageMap/map';

export async function POST(req: Request) {
  initLLMOnce();

  const { input }: { input: string} =
  await req.json();
  const uuid = crypto.randomUUID()
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
