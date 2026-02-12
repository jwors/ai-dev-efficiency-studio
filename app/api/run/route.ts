import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { inputGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { planExecutePlugin, wbsPlugin } from '@/core/plugins';
import type { PluginResult } from '@/core/plugins/types';
import { updateSession } from '@/core/basic/updateSession';

type PlanExecuteData = {
  plan: any;
  results: any[];
  outputs: any[];
};

export async function POST(req: Request) {
  initLLMOnce();

  const { input, uuid,plugins, }: { input: string; uuid: string,plugins:string[] } = await req.json();
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
  await updateSession(input,state)
  // 如果没有插件 就添加默认插件
  const requested = Array.isArray(plugins) ? plugins : ['plan-execute']
  // 使用的插件
  const pluginList = [
    requested.includes('plan-execute') ? planExecutePlugin : null,
    requested.includes('wbs') ? wbsPlugin : null,
  ].filter(Boolean) as typeof planExecutePlugin[];

  const pluginResults = await runPlugins(
    pluginList,
    input,
    state,
  );
  
  const planPlugin = pluginResults.find(
    (p) => p.name === 'plan-execute',
  ) as PluginResult<PlanExecuteData> | undefined;
  if (requested.includes('plan-execute') && (!planPlugin || !planPlugin.ok || !planPlugin.data)) {
    return NextResponse.json(
      { error: planPlugin?.error ?? 'Plan plugin failed' },
      { status: 500 },
    );
  }

  await saveSession(state);

  return NextResponse.json({
    plan: planPlugin?.data?.plan ?? null,
    observation: state.observation ?? null,
    results: planPlugin?.data?.results ?? [],
    outputs: planPlugin?.data?.outputs ?? [],
    plugins: pluginResults,
    sessionId: state.sessionId,
  });
}
