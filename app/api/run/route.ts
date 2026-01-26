import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { inputGuard } from '@/core/security/inputGuard';

export async function POST(req: Request) {
  initLLMOnce();

  const { input,uuid }: { input: string,uuid:string} =
  await req.json();
  const blocked = inputGuard(input)
  if (blocked) {
    return NextResponse.json(
      {
        error: blocked.payload.content as string
      },
      {
        status: 400
      }
    )
  }
  const state = getSession(uuid)

  const plan = await planner(input,state);
  console.log(plan)
  state.history.push({
    role:'user',
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
  const execution = await runPlan(plan, state);
  saveSession(state)
  // 存储
  return NextResponse.json({
    plan,
    observation:state.observation ?? null,
    results: execution.results, // 系统看的
    outputs: execution.outputs, // 用户看的
    sessionId:state.sessionId
  });
}
