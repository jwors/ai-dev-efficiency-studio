import { NextResponse } from 'next/server';
import { planner } from '@/core/planner';
import { runPlan } from '@/core/executor/runPlan';
import { initLLMOnce } from '@/core/llm/init';

export async function POST(req: Request) {
  initLLMOnce();

  const { input } = await req.json();
  // 获取传送来的数据
  
  const plan = await planner(input);
  
  // 拿到符合规则的 ai 返回的内容
  
  const results = await runPlan(plan);

  return NextResponse.json({
    plan,
    results,
  });
}
