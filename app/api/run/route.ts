import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';

export async function POST(req: Request) {
  initLLMOnce();

  const { input,uuid }: { input: string,uuid:string} =
  await req.json();
  const state  = getSession(uuid)

  const plan = await planner(input,state);

  state.history.push({
    role:'assistant',
    content:input
  })

  // 存储当前用户的input 以及 llm 的 callback content
  for (let i = 0; i < plan.steps.length; i++){
    let item = plan.steps[i]
    if(item.action === 'emit') {
      state.history.push({
        role:"assistant",
        content:item.params?.data.content 
      })
      break;
    }
  }
  const execution = await runPlan(plan);
  saveSession(state)
  // 存储
  return NextResponse.json({
    plan,
    results: execution.results,
    outputs: execution.outputs,
  });
}
