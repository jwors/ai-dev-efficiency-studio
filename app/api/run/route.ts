import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { inputGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { planExecutePlugin, wbsPlugin } from '@/core/plugins';
import type { PluginResult } from '@/core/plugins/types';

type PlanExecuteData = {
  plan: any;
  results: any[];
  outputs: any[];
};

export async function POST(req: Request) {
  initLLMOnce();

  const { input, uuid }: { input: string; uuid: string } = await req.json();
  const blocked = inputGuard(input);
  if (blocked) {
    return NextResponse.json(
      {
        error: blocked.payload.content as string,
      },
      {
        status: 400,
      },
    );
  }

  const state = await getSession(uuid);

  // 运行插件
  const pluginResults = await runPlugins(
    [planExecutePlugin, wbsPlugin],
    input,
    state,
  );
  
  const planPlugin = pluginResults.find(
    (p) => p.name === 'plan-execute',
  ) as PluginResult<PlanExecuteData> | undefined;
  if (!planPlugin || !planPlugin.ok || !planPlugin.data) {
    return NextResponse.json(
      { error: planPlugin?.error ?? 'Plan plugin failed' },
      { status: 500 },
    );
  }

  await saveSession(state);

  return NextResponse.json({
    plan: planPlugin.data.plan,
    observation: state.observation ?? null,
    results: planPlugin.data.results, // 绯荤粺鐪嬬殑
    outputs: planPlugin.data.outputs, // 鐢ㄦ埛鐪嬬殑
    wbs: state.wbs ?? null,
    plugins: pluginResults,
    sessionId: state.sessionId,
  });
}
