import { NextResponse } from 'next/server';
import { initLLMOnce } from '@/core/llm/init';
import { getSession, saveSession } from '@/core/storage/storageMap/map';
import { contextGuard, baseGuard } from '@/core/security/inputGuard';
import { runPlugins } from '@/core/plugins/runPlugins';
import { architectPlugin } from '@/core/plugins';
import { updateSession } from '@/core/session';

export async function POST(req: Request) {
  initLLMOnce();

  // 安全解析请求体
  let input: string;
  let uuid: string;

  try {
    const body = await req.json();
    input = typeof body.input === 'string' ? body.input.trim() : '';
    uuid = typeof body.uuid === 'string' ? body.uuid.trim() : '';
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!input || !uuid) {
    return NextResponse.json(
      { error: 'input and uuid are required' },
      { status: 400 },
    );
  }

  // 基础安全检查
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

  const pluginResults = await runPlugins([architectPlugin], input, state);

  await saveSession(state);

  return NextResponse.json({
    architecture: state.architecture ?? null,
    plugins: pluginResults,
    sessionId: state.sessionId,
  });
}