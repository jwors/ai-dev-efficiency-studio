import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { contextGuard,baseGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { planExecutePlugin, wbsPlugin } from '@/core/plugins';
import type { PluginResult } from '@/core/plugins/types';
import { updateSession } from '@/core/session';

type PlanExecuteData = {
  plan: any;
  results: any[];
  outputs: any[];
};

type RunBody = {
  input: string;
  uuid: string;
  plugins?: string[];
};

/**
 * 处理任务执行请求的 POST 端点。
 * 执行安全检查、更新会话状态、运行插件并返回结果。
 * @param req - 请求对象
 * @returns 包含计划、执行结果和输出的 JSON 响应
 */
export async function POST(req: Request) {
  initLLMOnce();

  const { input, uuid, plugins } = (await req.json()) as RunBody;

  // 安全词检查（在获取 state 之前先做基本检查）
  const blocked = baseGuard(input);
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

  // 获取对话信息
  const state = await getSession(uuid);

  // 基于完整上下文的二次安全检查
  const contextBlocked = contextGuard(input, state.history);
  console.log(contextBlocked,'contextBlocked')
  if (contextBlocked) {
    return NextResponse.json(
      {
        error: contextBlocked.payload.content as string,
      },
      {
        status: 400,
      },
    );
  }

  // 更新对话信息
  await updateSession(input, state);

  const requested = Array.isArray(plugins) ? plugins : ['plan-execute'];
  const pluginList = [
    requested.includes('plan-execute') ? planExecutePlugin : null,
    requested.includes('wbs') ? wbsPlugin : null,
  ].filter(Boolean) as typeof planExecutePlugin[];

  const pluginResults = await runPlugins(pluginList, input, state);

  const planPlugin = pluginResults.find(
    (p) => p.name === 'plan-execute',
  ) as PluginResult<PlanExecuteData> | undefined;
  if (
    requested.includes('plan-execute') &&
    (!planPlugin || !planPlugin.ok || !planPlugin.data)
  ) {
    return NextResponse.json(
      { error: planPlugin?.error ?? 'Plan plugin failed' },
      { status: 500 },
    );
  }
  state.plan = planPlugin?.data?.plan ?? null;
  state.results = planPlugin?.data?.results ?? [];
  state.outputs = planPlugin?.data?.outputs ?? [];
  await saveSession(state)

  return NextResponse.json({
    plan: planPlugin?.data?.plan ?? null,
    observation: state.observation ?? null,
    results: planPlugin?.data?.results ?? [],
    outputs: planPlugin?.data?.outputs ?? [],
    plugins: pluginResults,
    sessionId: state.sessionId,
  });
}
