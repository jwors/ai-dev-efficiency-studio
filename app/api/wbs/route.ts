import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { contextGuard,baseGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { taskFlowPlugin } from '@/core/plugins';
import { updateSession } from '@/core/basic/updateSession';

export async function POST(req: Request) {
	initLLMOnce();
	const { input, uuid }: { input: string; uuid: string } = await req.json();
  const blocked = baseGuard(input);
  if (blocked) {
    return NextResponse.json(
      { error: blocked.payload.content as string },
      { status: 400 },
    );
	}
	const state = await getSession(uuid);
  // 基于完整上下文的二次安全检查
  const contextBlocked = contextGuard(input, state.history);
  if (contextBlocked) {
    return NextResponse.json(
      { error: contextBlocked.payload.content as string },
      { status: 400 },
    );
  }
  await updateSession(input, state);
  const pluginResults = await runPlugins([taskFlowPlugin], input, state)
  await saveSession(state)
  return NextResponse.json({
    tf: state.flowchart ?? null,
    plugins: pluginResults,
    sessionId:state.sessionId
  })
}
